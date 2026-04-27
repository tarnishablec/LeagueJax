# AGENTS.md

This file provides guidance to Ai agents (Codex/claude code etc.) when working with code in this repository.

## Response Language

- **All agent responses directed at the user must be written in Chinese (中文).** This covers summaries, clarifying questions, proposed plans, status updates, and explanations of errors — anything the user reads from the agent in chat.
- Exceptions (keep the original language, do not translate):
  - Source-code identifiers, code comments, and file contents — leave as whatever language they are written in.
  - Commit messages — continue to follow the Conventional Commits format (`type(module): description`) in English as specified below.
  - `aria-label` values — still English (see Accessibility).
  - Strings inside i18n resource files — written in their native language per I18n Text Encoding.
  - Verbatim quotes from tool output, stack traces, logs, or error messages — pass through as-is.

## Git Policy

- **Do NOT run any git commands** (commit, push, branch, etc.) unless the user explicitly asks.
- **Subagents are also forbidden from running git commands** — this rule applies to all agents, not just the top-level conversation.
- **No new branches or worktrees.** Never run `git branch`, `git checkout -b`, `git switch -c`, `git worktree add`, or any equivalent. All code changes must be made directly on the `master` branch. If the user mentions a branch, confirm with them before creating one instead of assuming — the default is to stay on `master`.

## Commit Message Guideline

- When the user asks to generate a commit message, the message **must be based on the current changed files** (for example, from `git status` / diff context) and must reflect real changes in the workspace.
- Commit messages **must follow Conventional Commits** format with a module scope: `type(module): description` (for example `feat(history): ...`, `fix(lcu): ...`, `refactor(jax): ...`).
- **If changes span multiple modules, generate multiple separate commit messages** — one per module. Never combine unrelated module changes into a single commit message.
- The generated commit message **must be returned in a Markdown code block** for direct copy/paste.
- **Do NOT add `Co-Authored-By` trailers** (or any agent/AI attribution lines) to commit messages.

## Change Approval Workflow

- For every new user request, the agent must first provide an implementation plan for review.
- The agent must **not** execute changes (code edits, dependency installs, file writes, or mutating commands) until the user explicitly approves the plan.
- Read-only inspection is allowed before approval when needed to prepare an accurate plan.
- This rule also applies to subagents.

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

| File                                  | Purpose                                                     |
|---------------------------------------|-------------------------------------------------------------|
| `src/App.tsx`                         | Root React component                                        |
| `src/main.tsx`                        | React entry point                                           |
| `src-tauri/src/lib.rs`                | All Tauri commands (Rust backend logic)                     |
| `src-tauri/src/main.rs`               | Rust entry point, calls `lib::run()`                        |
| `src-tauri/tauri.conf.json`           | App config: window size, bundle targets, dev/build commands |
| `src-tauri/capabilities/default.json` | Tauri permission grants for the main window                 |
| `vite.config.ts`                      | Vite config; dev server fixed at port 1420                  |

### Adding a new Tauri command

1. Define the function with `#[tauri::command]` in `src-tauri/src/lib.rs`
2. Add it to `tauri::generate_handler![...]` in the same file
3. Call it from the frontend with `invoke("command_name", { ...args })`

### Package manager

This project uses **bun** (lockfile: `bun.lock`). Use `bun` / `bunx` instead of `npm` / `npx`.
- Always use `bun add <package> --no-cache` for dependency installation.

## Layering and Coupling Rules

- **Before making any code change, explicitly identify the layer of the code being touched** in the implementation plan: infrastructure/foundation, core runtime, shared concept/domain model, feature/business shard, UI/presentation, integration/adapter, or test/tooling.
- **Do not place business knowledge in infrastructure/foundation code.** Infrastructure code may provide generic mechanisms only. It must not contain feature names, business setting keys, business shard UUIDs, route/page ids, i18n keys, queue/game concepts, or migration tables for specific features.
- **Business rules must live in the owning feature/shard.** If a rule mentions a concrete feature such as history, ongoing game, matchmaking, mini window, logging, updater, LCU, SGP, or a specific setting id, it belongs to that feature/shard or a clearly named shared domain module owned by that concept.
- **Core runtime code must not depend on feature/business shards.** Runtime primitives such as Jax, registry, settings store, event bridges, persistence wrappers, and generic wait/sync utilities may depend only on generic contracts/types, not on concrete feature implementations.
- **Dependency direction must point inward/generic, never outward/specific.** Feature/business layers may call infrastructure APIs. Infrastructure must not import or hard-code feature/business constants. Shared domain modules must stay free of UI and feature orchestration concerns.
- **Cross-layer communication must use explicit contracts.** Prefer typed events, interfaces, commands, or generic registration APIs. Do not bypass layer boundaries by importing a concrete shard solely to reach its internals.
- **Settings infrastructure is generic only.** It may define setting DTOs, storage, validation, snapshots, subscriptions, and generic definition/value change events. It must not know specific setting ids, page ids, feature names, legacy migrations, or which feature registered a setting.
- **If a change appears to require coupling layers, stop and propose a boundary-preserving design first.** Examples include moving the rule into the owning shard, adding a generic callback/event, introducing a shared concept module, or adding an adapter at the edge.
- **MVP policy:** do not add compatibility migrations unless the user explicitly asks. During MVP, remove obsolete keys/paths instead of adding global migration tables.

## Frontend Layout

- All page-level layouts should use **CSS Grid** (`grid`, `grid-cols-*`, `grid-rows-*`).
- Do not use Flexbox (`flex`) for page-level layout. Flex is only allowed for small one-dimensional alignment (for example, icon alignment inside a button).

## Accessibility

- All `aria-label` values must be written in **English**.

## I18n Text Encoding

- For **all i18n configuration files in this repository**, do **not** use Unicode escape literals such as `\uXXXX` in user-facing text.
- Always write the original language characters directly (for example, Chinese/Japanese native text) and keep files in UTF-8.
- This rule applies to global locale files and all feature/shard i18n resources.

## Browser Compatibility

- This app runs in a **Tauri WebView** (Chromium-based). Target only the **latest stable browser engine**.
- Freely use the newest CSS and Web API features (`@starting-style`, `content-visibility`, `oklch()`, `@layer`, `@container`, etc.) without polyfills or fallbacks.
- Do not add vendor prefixes or compatibility workarounds for older browsers.

## Component Styles

- **Styling engine:** [Vanilla Extract](https://vanilla-extract.style/) — all styles live in co-located `.css.ts` files (for example `Component.css.ts` next to `Component.tsx`).
- **UI primitives/components:** Frontend interactive primitives and common controls must use **Ark UI** (`@ark-ui/react`) or project-level wrappers built on Ark UI (for example `src/components/settings-ui`). Do not introduce custom native/select/dropdown implementations when an Ark UI equivalent exists.
- **Static asset fetching:** All icons and static game assets (champion icons, profile icons, spells, runes, items, etc.) must be fetched/resolved in the frontend. Do not add Rust commands for static asset retrieval, and do not use `invoke()` for these assets.
- **Variants:** Use `recipe()` from `@vanilla-extract/recipes` for component variants. Use `styleVariants()` for simple enumerated variants.
- **Theme tokens:** Defined in `src/styles/theme.css.ts` via `createGlobalThemeContract` / `createGlobalTheme`. Access with `vars.color.*`.
- **Dynamic values:** Use `assignInlineVars()` from `@vanilla-extract/dynamic` for runtime-dependent CSS values; avoid inline `style` for anything expressible statically.
- Do not force a single color syntax. Prefer theme tokens for stable UI surfaces, and use the color format that best fits the API or interaction (`oklch()`, hex, `rgba()`, etc.).
- **No Tailwind, no utility classes.** All styling must go through Vanilla Extract `.css.ts` files.

## Type Sharing (Rust → TypeScript)

- **All domain models and shared types must be defined in Rust** and exported to TypeScript via [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not hand-write mirrored types in TS.
- **Shared/common types** (used across shards) should be defined in `src-tauri/src/concepts/` and exported to `src/bindings/`.
- **Shard-specific types** should be defined inside each shard and exported to `src/bindings/<shard_name>.ts` (for example `src/bindings/client_shard.ts`).
- Run `bun run sync_rs_types` to regenerate bindings (Rust export tests + Biome format + typecheck).
- TS should always import these types from `src/bindings/`.

## Rust Code Style

- **Never use `.unwrap()` or `.expect()`** — use `?`, `.unwrap_or()`, `.unwrap_or_default()`, `.unwrap_or_else()`, or proper error handling.
- **Never use `#[allow(dead_code)]`** — leave dead_code warnings for the user to handle. Do not add `allow` attributes or delete unused code to silence these warnings.

## Linting

- **Frontend:** [Biome](https://biomejs.dev/) — replaces ESLint + Prettier. Config in `biome.json`. Run `bunx biome check --write src/` to auto-fix. CI uses `bunx biome check src/` (no `--write`).
- **Rust:** Clippy with `-D warnings` (warnings are errors). Run `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` before committing Rust changes.

## Complexity Guardrails

- Avoid high-complexity code paths in a single file/component.
- If a function/component grows beyond reasonable cognitive complexity, split it into focused hooks/components/modules before adding more logic.
- Do not mix UI rendering, orchestration state, server-region resolution, and request workflows in one part when they can be separated.
