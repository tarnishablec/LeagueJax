# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Policy

- **Do NOT run any git commands** (commit, push, branch, etc.) unless the user explicitly asks.

## Design Reference

This project takes [League Akari](https://github.com/Hanxven/LeagueAkari) as its design reference. When building UI:

- Follow Akari's visual language: flat, clean, icon-driven sidebar navigation with a compact desktop-app feel.
- Color palette: dark navy backgrounds, warm amber-gold accents (Jax's signature color).
- Prefer subtle hover/active states over bold visual noise.
- Keep the UI dense and information-rich — this is a power-user desktop tool, not a marketing page.

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

### Lint

```bash
# Frontend — Biome (lint + format check)
bunx biome check src/

# Frontend — auto-fix
bunx biome check --write src/

# Rust — Clippy
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
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

## Frontend Layout

- 所有布局统一使用 **CSS Grid**（`grid`, `grid-cols-*`, `grid-rows-*`）
- 禁止使用 Flexbox（`flex`）做页面级布局，Flex 仅用于单行/单列的小型对齐场景（如按钮内图标对齐）

## Accessibility

- All `aria-label` values must be written in **English**.

## Component Styles

- **Styling engine:** [Vanilla Extract](https://vanilla-extract.style/) — all styles live in co-located `.css.ts` files (e.g. `Component.css.ts` next to `Component.tsx`).
- **Variants:** Use `recipe()` from `@vanilla-extract/recipes` for component variants. Use `styleVariants()` for simple enumerated variants.
- **Theme tokens:** Defined in `src/styles/theme.css.ts` via `createGlobalThemeContract` / `createGlobalTheme`. Access with `vars.color.*`.
- **Dynamic values:** Use `assignInlineVars()` from `@vanilla-extract/dynamic` for runtime-dependent CSS values; avoid inline `style` for anything expressible statically.
- Define all colors with **`oklch()`** syntax — no hex codes, no `rgba()`.
- **No Tailwind, no utility classes.** All styling must go through Vanilla Extract `.css.ts` files.

## Linting

- **Frontend:** [Biome](https://biomejs.dev/) — replaces ESLint + Prettier. Config in `biome.json`. Run `bunx biome check --write src/` to auto-fix. CI uses `bunx biome check src/` (no `--write`).
- **Rust:** Clippy with `-D warnings` (warnings are errors). Run `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` before committing Rust changes.
