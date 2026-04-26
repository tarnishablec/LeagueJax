# LeagueJax Architecture

## Scope

This document describes the foundation architecture of LeagueJax:

- Runtime composition
- Layer boundaries
- Startup sequence
- IPC and event contracts
- Settings and i18n foundation
- Rust-to-TypeScript type sharing
- Core directory responsibilities

It intentionally does not describe detailed business behavior inside each feature
or backend shard.

## Technology Stack

- Desktop shell: Tauri v2
- Frontend: React + TypeScript + Vite
- Routing: React Router hash routing
- Backend: Rust + Tokio
- Runtime orchestration:
  - Rust side: `jax` / `jax-probes` crates from the workspace dependencies
  - Web side: TypeScript runtime in `src/jax`
- Styling: Vanilla Extract
- UI primitives: Ark UI
- Package manager: Bun

## System Overview

```text
React WebView (src/)
  - Hash router
  - Main and mini layouts
  - Web shards and contribution registry
  - invoke(...) + Tauri event listeners
            |
            | Tauri IPC and events
            v
Rust Backend (src-tauri/src/)
  - Tauri commands
  - Jax shard runtime
  - LCU / SGP integrations
  - Settings, persistence, updater, window integration
```

The frontend and backend are isolated by the Tauri boundary. Backend capabilities
are exposed through explicit Tauri commands, event channels, and approved URI
protocol surfaces.

## Layer Boundaries

LeagueJax keeps generic runtime mechanics separate from feature knowledge:

- `src/jax` and the Rust `jax` crate provide generic shard lifecycle machinery.
- `src/features/registry.ts` composes web shards and aggregates UI
  contributions.
- `src/runtime/*` contains frontend contracts and backend-shard wait helpers.
- `src-tauri/src/shards/*` owns backend runtime modules and their business
  rules.
- `src-tauri/src/commands/*` is the IPC adapter layer. Commands delegate to
  shards rather than becoming business stores.
- `src-tauri/src/storage/*`, `src-tauri/src/utils/*`, and generic Tauri setup
  code stay infrastructure-focused.

Feature-specific settings, routes, pages, labels, queue/game concepts, and
migrations must remain in the owning feature or shard. Infrastructure should
only provide generic mechanisms and explicit contracts.

## Startup Sequence

### 1) Native process bootstrap

Entry: `D:/Desktop/Web/LeagueJax/src-tauri/src/main.rs`

1. Install the rustls ring crypto provider.
2. Call `league_jax_lib::run()`.

### 2) Tauri app initialization

Entry: `D:/Desktop/Web/LeagueJax/src-tauri/src/lib.rs`

1. Register Tauri plugins:
   - `tauri-plugin-process`
   - `tauri-plugin-single-instance`
   - `tauri-plugin-opener`
   - `tauri-plugin-store`
   - `tauri-plugin-updater`
2. Register the `lcu://` asynchronous URI scheme for LCU asset proxying.
3. Register command handlers through `tauri::generate_handler![...]`.
4. In `setup`:
   - Initialize tracing.
   - Apply release WebView hardening to the main window.
   - Resolve app data paths.
   - Build the backend Jax runtime by registering backend shards.
   - Store shared runtime state with `app.manage(...)`.
   - Spawn async startup with `jax.start().await`.
   - Emit `shards_status_changed` after startup status is available.
5. On process exit, initiate shard shutdown and stop the Jax runtime.

### 3) Frontend bootstrap

Entry: `D:/Desktop/Web/LeagueJax/src/main.tsx`

1. Create the React root.
2. Start web shards through `initializeWebShards()`.
3. Resolve the web `SettingsShard` from the runtime.
4. Render `<App />` inside `SettingsProvider`.
5. Render a bootstrap error screen if initialization fails.

The i18n setup is owned by the web `I18nShard`, not by `main.tsx` directly.

## Runtime Composition

### Rust runtime

The backend uses the Rust `jax` crate to compose shard dependencies and
lifecycle:

- Register shards
- Build a dependency graph
- Start shards in dependency-aware order
- Skip descendants when startup dependencies fail
- Stop shards in reverse startup order

Current backend shards are registered in `src-tauri/src/lib.rs` and implemented
under `src-tauri/src/shards/`. They include foundation shards such as Tauri host,
persistence, settings, settings bridge, logging, window effects, static cache,
updater, and feature/integration shards such as LCU, SGP, automation, ongoing
game, saved players, statistics, keyboard, and mini window.

### TypeScript runtime

The web side has a lightweight Jax runtime in `src/jax/index.ts` with a similar
dependency/lifecycle model:

- Register web shards
- Build a graph with `graphology`
- Start setup hooks in topological order
- Track failures, skipped shards, and startup durations
- Tear down shards in reverse order

Web shards are registered in `src/features/registry.ts`. The current web shard
set includes settings, i18n, updater, shell, tray, mini window, history, ongoing
game, automation, and tools.

## Routing and Layout Composition

Routing is created in `src/App.tsx` with `createHashRouter`.

Top-level route layouts:

- `/main`: full desktop shell, implemented by `MainWindowLayout`
- `/mini`: compact mini-window shell, implemented by `MiniWindowLayout`

The app normalizes direct path launches into hash routes when needed. Feature
routes are contributed by web shards rather than maintained as one central
hardcoded route list.

The main shell consumes aggregated contributions for:

- Navigation items
- Toolbar slots
- Titlebar slots
- Sidebar slots

The mini shell uses its own titlebar and layout while sharing cross-cutting hooks
such as theme, LCU event listening, and window-effect fallback behavior.

## Web Shard Contribution Model

The frontend contribution contract lives in `src/runtime/web-contract.ts`.

A web shard may provide:

- `routes()`
- `navItems()`
- `toolbarSlots()`
- `titlebarSlots()`
- `sidebarSlots()`
- `i18nResources()`

`src/features/registry.ts` starts the web runtime, lists registered shards, sorts
contributions by order, and filters route-scoped slots by the current path.

This keeps feature modules composable while preserving a single app shell.

## Settings Foundation

Settings are a dual-side foundation concept:

- Backend settings service: `src-tauri/src/shards/settings/*`
- Backend bridge/events: `src-tauri/src/shards/settings_bridge.rs`
- Web settings shard: `src/features/settings/manifest.tsx`
- Web settings store: `src/features/settings/store/*`

The web `SettingsShard` waits for the backend settings shard through
`waitBackendShards()` in `src/runtime/backend-shards.ts`. It then fetches
`get_settings_bootstrap`, hydrates the local store, listens for
`settings_changed` and `settings_definitions_changed`, and pushes local patches
through `set_settings_values`.

Setting definitions and page ownership should stay with the owning feature. The
settings infrastructure provides generic registration, snapshots, validation,
subscriptions, and synchronization.

## I18n Foundation

Global i18n setup lives in `src/i18n/index.ts`.

Shard-local i18n resources are collected by `src/features/i18n/resources.ts` and
initialized by `src/features/i18n/manifest.ts`.

The web `I18nShard` depends on the web `SettingsShard`, reads the system language
setting, initializes i18next, and subscribes to language setting changes.

## IPC Boundary

Frontend code calls backend commands with:

- `invoke("<command_name>", payload)` from `@tauri-apps/api/core`

Backend commands are implemented under:

- `src-tauri/src/commands/*`

Commands are registered in:

- `src-tauri/src/lib.rs`

Backend-to-frontend updates use Tauri events. Important foundation events
include:

- `shards_status_changed`
- `settings_changed`
- `settings_definitions_changed`

Asset access may also use approved protocol surfaces such as the registered
`lcu://` scheme.

## Rust-to-TypeScript Type Sharing

LeagueJax uses Rust as the source of truth for shared contract types.

Current generated bindings live in:

- `src/bindings/*.ts`

Rust DTOs are exported with `ts-rs`. Many current exports are shard-local under
`src-tauri/src/shards/*`, including LCU, SGP, settings, ongoing-game, updater,
and shard-status contracts.

Project script:

```bash
bun run sync_rs_types
```

This runs Rust export tests, formats generated bindings with Biome, and runs the
TypeScript typecheck.

## Styling and UI Foundation

- Theme tokens are defined in `src/styles/theme.css.ts`.
- Global styles live in `src/styles/global.css.ts`.
- Component styles are co-located in `*.css.ts` files.
- Runtime CSS values should use `assignInlineVars()` where practical.
- Interactive primitives should use Ark UI components or project-level wrappers
  built on Ark UI.
- Shared controls live in `src/components/*`.

## Configuration and Security Boundaries

App-level Tauri config:

- `src-tauri/tauri.conf.json`

Important current config:

- Vite dev URL: `http://localhost:31420`
- Vite dev command: `bun run dev`
- Frontend build command: `bun run build`
- Bundle target: `nsis`
- Updater artifacts enabled
- Main window is frameless and transparent

Capability permissions:

- `src-tauri/capabilities/default.json`

Current capability coverage includes the `main` and `mini` windows and grants
core window APIs, opener, and process plugin permissions.

Frontend code should not bypass these surfaces to access privileged native
capabilities.

## Operational Notes

- Backend startup is dependency-aware. Failed shards report errors and block
  dependents.
- Backend startup status is exposed through `get_shards_status` and
  `shards_status_changed`.
- Frontend bootstrap fails fast with an on-screen error if web shard startup
  fails.
- Logging is structured on both sides:
  - Rust: `tracing`
  - Web: `pino`
- File logging can be switched by backend logging/settings infrastructure.

## Commands

Development:

```bash
bun run tauri:dev
bun run dev
```

Build:

```bash
bun run build
bun run tauri:build
```

Checks:

```bash
bun run typecheck
bun run lint:biome
bun run lint:clippy
bun run sync_rs_types
```

## Directory Map

```text
LeagueJax/
  src/                         # React + TypeScript frontend
    bindings/                  # Generated TS contracts from Rust
    components/                # Shared UI components and primitives
    features/                  # Web shards, feature routes, i18n, settings
    hooks/                     # Cross-cutting React hooks
    i18n/                      # i18next initialization and global locales
    infra/                     # Logger and error helpers
    jax/                       # TS shard lifecycle runtime
    layout/                    # Main and mini app shells
    runtime/                   # Frontend contracts and backend wait helpers
    stores/                    # Cross-cutting client state stores
    styles/                    # Theme tokens and global styles
    utils/                     # Shared frontend utilities
  src-tauri/                   # Tauri + Rust backend
    capabilities/              # Tauri permission grants
    src/
      commands/                # Tauri command handlers
      shards/                  # Backend runtime modules
      storage/                 # Persistence infrastructure
      utils/                   # Backend utilities
      error.rs                 # Backend error type
      lib.rs                   # Backend assembly and Tauri integration
      main.rs                  # Native executable entry
      network_config.rs        # Generic network timeout configuration
    tauri.conf.json            # Tauri app and bundle config
  scripts/                     # Project maintenance scripts
  Cargo.toml                   # Rust workspace and dependency declarations
  package.json                 # Bun scripts and frontend dependencies
  vite.config.ts               # Vite, SWC, Vanilla Extract, and dev server
```
