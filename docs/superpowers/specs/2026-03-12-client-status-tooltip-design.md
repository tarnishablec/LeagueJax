# ClientStatus Tooltip Component Design

## Goal

Extract the sidebar bottom connection status area into a standalone `ClientStatus` component. On hover, show a tooltip with the list of detected LCU client instances (or "no clients available"). Users can switch focus between instances from the list. The focused instance's summoner avatar and name replace the default icon in the sidebar.

## Current State

- Sidebar bottom (`__root.tsx` lines 88–114) inline renders connection status as a conditional block; the `bottomNavItems` loop (lines 115–128) is separate and stays untouched
- `LcuInstanceInfo` has: `pid`, `port`, `state`, `isFocused`
- `CurrentSummoner` has: `puuid`, `gameName`, `tagLine`, `profileIconId`, `summonerLevel`
- `LcuClient` only has JSON-returning methods (`get`, `post`, etc.) — no raw bytes method
- No install directory data available to frontend

## Design

### Backend Changes

#### 1. New struct: `DetectedInstance`

Introduce a wrapper struct in `connector.rs` to carry auth plus metadata without polluting `LcuAuth`:

```
pub struct DetectedInstance {
    pub auth: LcuAuth,
    pub install_dir: Option<String>,
}
```

Change `LcuConnector` trait:
```
async fn detect_all(&self) -> Vec<DetectedInstance>;
```

`WindowsLcuConnector` already parses command-line args via `crate::utils::cmd::get_process_cmdline` + `parse_cmdline_to_args`. Parse `--install-directory=` in the same loop using the existing `parse_arg()` helper and populate `install_dir`.

#### 2. `LcuInstance` — add `install_dir` field

`install_dir: Option<String>` stored on `LcuInstance`. Populated from `DetectedInstance.install_dir` when the Manager creates the instance.

#### 3. `LcuInstanceInfo` snapshot — add `install_dir`

```
LcuInstanceInfo {
    pid: u32,
    port: u16,
    state: String,       // one of: "authenticating", "ready", "closing"
    is_focused: bool,
    install_dir: Option<String>,  // NEW
}
```

Frontend receives this via the existing `lcu-instances-changed` event.

#### 4. `LcuClient` — add `get_bytes` method

New method on `LcuClient` for fetching raw binary responses:

```
pub async fn get_bytes(&self, path: &str) -> Result<Vec<u8>>
```

Sends a GET request with the auth header but does NOT set `Accept: application/json`. Calls `resp.bytes().await` instead of `resp.json().await`. Returns `Result<Vec<u8>, AppError>`.

#### 5. New Tauri command — `get_profile_icon`

```
#[tauri::command]
pub async fn get_profile_icon(icon_id: i64, jax: State<Arc<Jax>>) -> Result<Vec<u8>, AppError>
```

- Gets the focused LcuClient via `jax.get_shard::<LcuShard>().client()`
- Returns `AppError::LcuNotConnected` if no focused client
- Calls `client.get_bytes(&format!("/lol-game-data/assets/v1/profile-icons/{icon_id}.jpg"))`
- The LCU endpoint always returns JPEG data for this path
- Returns raw JPEG bytes to frontend

### Frontend Changes

#### 1. `LcuInstanceInfo` TypeScript type — add `installDir`

```typescript
export interface LcuInstanceInfo {
  pid: number;
  port: number;
  state: "authenticating" | "ready" | "closing";
  isFocused: boolean;
  installDir: string | null;  // NEW
}
```

Note: Rust side produces `state` as `String`, but only ever emits the three values above. Frontend types this as a union for safety.

#### 2. New component: `ClientStatus`

Location: `src/components/ClientStatus.tsx` + `ClientStatus.css.ts`

**Props:** `collapsed: boolean` (passed from `__root.tsx`, same as other nav items)

**Three visual states:**

| State | Icon | Text | Tooltip content |
|-------|------|------|-----------------|
| No instances | `Unplug` icon | i18n `common.disconnected` | i18n `common.noClients` |
| Instances exist, none focused+ready | `Unplug` icon | i18n `common.disconnected` | Instance list (can switch) |
| Focused + ready | Summoner avatar (`<img>`) | `gameName#tagLine` | Instance list (can switch) |

**Collapsed sidebar behavior:**
- When `collapsed=true`: only show icon/avatar (same size as other nav icons), hide text label
- Tooltip still appears on hover, anchored to the right of the icon
- Avatar shrinks to match `iconSize` (20px when collapsed, 16px when expanded)

**Avatar:** fetched via `invoke("get_profile_icon", { iconId: summoner.profileIconId })`. Response is `number[]` (Tauri serializes `Vec<u8>` as array). Convert to blob URL:
```
new Blob([new Uint8Array(bytes)], { type: "image/jpeg" })
```
Cached with React Query by `profileIconId`. Fallback to `Unplug` icon on error. Clean up blob URLs with `URL.revokeObjectURL()` when the component unmounts or `profileIconId` changes (via `useEffect` cleanup or React Query's `onSuccess` replacing the previous URL).

#### 3. i18n keys

Add to translation files:
- `common.noClients` — "无可用客户端" (zh) / "No clients available" (en)

#### 4. Tooltip (pure CSS)

- Container has `position: relative`
- Tooltip panel uses `position: absolute; left: 100%` anchored to the right of the sidebar item
- Shown via CSS `:hover` on the container (`opacity: 0 → 1`, `pointer-events: none → auto`)
- Styled with Vanilla Extract in `ClientStatus.css.ts`
- All colors use `oklch()`, tokens from `vars.color.*`
- Tooltip background: uses theme accent/background tokens
- Layout: CSS Grid for tooltip rows

**Tooltip layout per instance row:**

```
┌──────────────────────────────────┐
│ D:\Riot Ga...  PID: 12345  [●]  │  ← focused: primary accent style
│ C:\Games\L...  PID: 67890       │  ← click to switch
└──────────────────────────────────┘
```

- Path: truncated to ~25 chars with `...`, full path via HTML `title` attribute on hover
- Focused instance: highlighted with `vars.color.primary` (amber-gold) background + indicator
- Non-focused ready instances: clickable, calls `invoke("lcu_switch_focus", { pid })`
- Authenticating/closing instances: dimmed text, not clickable

#### 5. Update `__root.tsx`

Replace the inline connection status conditional block (the `connected && summoner ? ... : ...` block) with `<ClientStatus collapsed={collapsed} />`. The `bottomNavItems` loop below it stays unchanged.

Remove `Link2`, `Unplug` imports from `__root.tsx` if no longer used there (they move into `ClientStatus`).

### Path Truncation

Utility function in `ClientStatus.tsx` (no separate file):
- Input: full path string
- Output: truncated to max ~25 chars
- Strategy: if length > 25, take first 22 chars + `...`
- Full path available via HTML `title` attribute

### Data Flow

```
Connector detect_all() → Vec<DetectedInstance> (auth + install_dir)
        │
        ▼
Manager creates LcuInstance with install_dir
        │
        ▼
Manager emit_snapshot() → "lcu-instances-changed" with install_dir
        │
        ▼
useLcuEvents hook → setInstances(payload)
        │
        ▼
ClientStatus reads useLcuStore
  ├── instances list → tooltip content
  ├── summoner → avatar + name display
  └── on click → invoke("lcu_switch_focus", { pid })

Avatar: invoke("get_profile_icon") → Vec<u8> → Blob URL (React Query cached)
```

## Files Affected

### New files
- `src/components/ClientStatus.tsx`
- `src/components/ClientStatus.css.ts`

### Modified files
- `src-tauri/src/shards/lcu/connector.rs` — add `DetectedInstance` struct, change `LcuConnector` trait return type, parse `--install-directory`
- `src-tauri/src/shards/lcu/instance.rs` — add `install_dir: Option<String>` field to `LcuInstance`
- `src-tauri/src/shards/lcu/manager.rs` — adapt to `DetectedInstance`, populate `install_dir`, include in snapshot
- `src-tauri/src/shards/lcu/client.rs` — add `get_bytes()` method
- `src-tauri/src/commands/` — new `get_profile_icon` command
- `src-tauri/src/lib.rs` — register `get_profile_icon` in invoke handler
- `src/stores/lcu.ts` — add `installDir` to `LcuInstanceInfo`
- `src/routes/__root.tsx` — replace inline status block with `<ClientStatus />`
- `src/i18n/` — add `common.noClients` key

## Out of Scope

- Per-instance summoner name display (only focused instance shows name)
- Tooltip enter/exit animation (instant show/hide for v1)
- Keyboard navigation within tooltip
