# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start Tauri dev mode (launches both Vite dev server and Rust backend)
bunx tauri dev

# Frontend only (Vite dev server on port 1420)
bun run dev

# Type-check and build frontend
bun run build

# Build full Tauri app
bunx tauri build
```

### Rust (src-tauri)
```bash
# Check Rust code
cargo check --manifest-path src-tauri/Cargo.toml

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml
```

## Architecture

This is a **Tauri v2** desktop app with a **React + TypeScript** frontend and a **Rust** backend.

### How the two halves connect

- The frontend (`src/`) runs in a WebView and communicates with Rust via `invoke()` from `@tauri-apps/api/core`.
- Rust commands are defined with `#[tauri::command]` in `src-tauri/src/lib.rs` and registered in `tauri::Builder` via `.invoke_handler(tauri::generate_handler![...])`.
- Permissions for what the frontend can access are declared in `src-tauri/capabilities/default.json`.

### Key files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root React component |
| `src/main.tsx` | React entry point |
| `src-tauri/src/lib.rs` | All Tauri commands (Rust backend logic) |
| `src-tauri/src/main.rs` | Rust entry point, calls `lib::run()` |
| `src-tauri/tauri.conf.json` | App config: window size, bundle targets, dev/build commands |
| `src-tauri/capabilities/default.json` | Tauri permission grants for the main window |
| `vite.config.ts` | Vite config; dev server fixed at port 1420 |

### Adding a new Tauri command

1. Define the function with `#[tauri::command]` in `src-tauri/src/lib.rs`
2. Add it to `tauri::generate_handler![...]` in the same file
3. Call it from the frontend with `invoke("command_name", { ...args })`

### Package manager

This project uses **bun** (lockfile: `bun.lock`). Use `bun` / `bunx` instead of `npm` / `npx`.
