# LeagueJax Architecture

## Scope

This document describes the **foundation architecture** of LeagueJax:

- Runtime composition
- Layer boundaries
- IPC contract model
- Type-sharing pipeline
- Core directory responsibilities

This document intentionally does **not** describe business shard design or feature-level behavior.

## Technology Stack

- Desktop shell: Tauri v2
- Frontend: React + TypeScript + Vite
- Backend: Rust + Tokio
- Runtime orchestration:
  - Rust side: `jax` crate (`D:/Desktop/Web/LeagueJax/jax`)
  - Web side: TS runtime (`D:/Desktop/Web/LeagueJax/src/jax`)
- Styling: Vanilla Extract
- UI primitives: Ark UI

## System Overview

```text
React WebView (src/)
  - Routes / Layout / Web Shards
  - invoke(...) + event listeners
            |
            | Tauri IPC
            v
Rust Backend (src-tauri/src/)
  - Tauri commands
  - Jax shard runtime
  - System integrations / persistence
```

The frontend and backend are isolated by IPC.  
All backend capabilities are exposed through explicit Tauri commands and event channels.

## Startup Sequence

### 1) Backend process bootstrap

Entry: `D:/Desktop/Web/LeagueJax/src-tauri/src/main.rs`

1. Install rustls crypto provider.
2. Call `league_jax_lib::run()`.

### 2) Tauri app initialization

Entry: `D:/Desktop/Web/LeagueJax/src-tauri/src/lib.rs`

1. Configure tracing.
2. Create Tauri builder and register plugins.
3. Register command handlers via `tauri::generate_handler![...]`.
4. In `setup`:
   - Resolve app paths and window handles.
   - Build Rust Jax runtime by registering shards.
   - Store shared runtime in Tauri state (`app.manage(...)`).
   - Spawn async startup (`jax.start().await`).

### 3) Frontend bootstrap

Entry: `D:/Desktop/Web/LeagueJax/src/main.tsx`

1. Create React root.
2. Initialize web shards (`initializeWebShards()`).
3. Build merged i18n resources from shard manifests.
4. Initialize i18n.
5. Render `<App />`.

## Runtime Composition

## Rust runtime (backend)

The backend uses the Rust `jax` crate to compose shard dependencies and lifecycle:

- Register shards
- Build dependency graph
- Start shards in dependency-aware order
- Skip descendants on startup failure
- Stop shards in reverse dependency order

Core implementation:

- `D:/Desktop/Web/LeagueJax/jax/src/lib.rs`
- `D:/Desktop/Web/LeagueJax/jax/src/shard/*`

## TypeScript runtime (web)

The web side has a lightweight shard runtime with a similar dependency/lifecycle model:

- Register web shards
- Build graph
- Start setup hooks
- Teardown on shutdown

Core implementation:

- `D:/Desktop/Web/LeagueJax/src/jax/index.ts`
- `D:/Desktop/Web/LeagueJax/src/features/registry.ts`
- `D:/Desktop/Web/LeagueJax/src/runtime/web-contract.ts`

## Backend Foundation Structure

Root: `D:/Desktop/Web/LeagueJax/src-tauri/src`

- `main.rs`: native entrypoint
- `lib.rs`: Tauri runtime assembly and command registration
- `commands/`: IPC command handlers (frontend-callable backend APIs)
- `concepts/`: shared domain DTOs exported to TS (`ts-rs`)
- `shards/`: backend modules wired by Rust Jax runtime
- `storage/`: storage abstractions/helpers
- `error.rs`: backend error model and serialization
- `utils/`: shared utilities

## Frontend Foundation Structure

Root: `D:/Desktop/Web/LeagueJax/src`

- `main.tsx`: web bootstrap sequence
- `App.tsx`: router creation and root route tree
- `layout/`: shell layout and page frame (`RootLayout`)
- `features/registry.ts`: web shard registration and contribution aggregation
- `runtime/web-contract.ts`: frontend shard contribution interfaces
- `jax/`: TS lifecycle runtime
- `bindings/`: generated TS types from Rust
- `styles/`: global theme tokens and global styles
- `infra/`: cross-cutting concerns (logger, error helpers)

## Routing and Composition Model

- Router is created in `App.tsx` (`createBrowserRouter`).
- Feature routes are not hardcoded in one list; they are collected from web shard contributions.
- Layout (`RootLayout`) consumes aggregated contributions for:
  - Navigation items
  - Toolbar slots
  - Titlebar slots
  - Sidebar slots

This keeps feature modules composable while preserving a single shell.

## IPC Boundary

Frontend calls backend commands through:

- `invoke("<command_name>", payload)` from `@tauri-apps/api/core`

Backend exposes commands through:

- `#[tauri::command]` functions in `src-tauri/src/commands/*`
- Registration in `src-tauri/src/lib.rs` via `tauri::generate_handler![...]`

Event-driven updates are sent from backend to frontend using Tauri events (emit/listen model).

## Rust to TypeScript Type Sharing

LeagueJax uses Rust as the source of truth for shared contract types.

1. Define structs/enums in `src-tauri/src/concepts/*` (or shard-local exports).
2. Derive `TS` via `ts-rs`.
3. Export generated declarations to `src/bindings/*.ts`.
4. Frontend imports these generated types directly.

Project script:

- `bun run sync_rs_types`

This flow avoids manually duplicated DTO definitions.

## Styling and UI Foundation

- Theme tokens are defined in Vanilla Extract global theme files.
- Component styles are co-located in `*.css.ts`.
- Interactive primitives should use Ark UI components.

## Configuration and Security Boundaries

- App-level config: `D:/Desktop/Web/LeagueJax/src-tauri/tauri.conf.json`
  - window config
  - dev/build commands
  - bundle targets
- Capability permissions: `D:/Desktop/Web/LeagueJax/src-tauri/capabilities/default.json`
  - granted APIs per window

Frontend cannot directly access privileged native capabilities; access must go through approved Tauri surfaces.

## Operational Notes

- Backend startup is resilient: shard failures are reported and can block only dependents.
- Frontend bootstrap fails fast with an on-screen error if initialization fails.
- Logging is structured on both sides (`tracing` in Rust, `pino` in web).

## Directory Map

```text
LeagueJax/
  src/                    # React + TypeScript frontend
    bindings/             # Generated TS contracts from Rust
    features/             # Feature modules + web shard manifests
    jax/                  # TS runtime lifecycle core
    layout/               # App shell layout
    runtime/              # Frontend shard contract interfaces
    styles/               # Theme tokens and global styles
    infra/                # Logger, error helpers, utilities
  src-tauri/              # Tauri + Rust backend
    src/
      commands/           # Tauri command handlers
      concepts/           # Shared DTOs for TS export
      shards/             # Backend runtime modules
      storage/            # Persistence infrastructure
      error.rs            # Backend error type
      lib.rs              # Backend assembly and Tauri integration
      main.rs             # Native executable entry
  jax/                    # Rust Jax runtime crate
```

