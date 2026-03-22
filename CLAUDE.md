# Claude Code Instructions

**AGENTS.md is the authoritative ruleset. Read it. Follow every rule. No exceptions.**

The rules below are extracted from AGENTS.md because they are frequently violated. Breaking ANY of these is a hard failure.

---

## 1. NEVER Run Git Commands

- **FORBIDDEN:** `git commit`, `git push`, `git branch`, `git checkout`, `git add`, `git stash`, `git reset`, `git rebase`, `git merge`, or ANY other git command.
- This applies to the top-level agent AND all subagents.
- The ONLY exception: the user explicitly says "commit", "push", etc.
- Read-only git commands (`git status`, `git diff`, `git log`) are allowed ONLY when needed to prepare a plan or generate a commit message.

## 2. ALWAYS Present a Plan Before Making Changes

- Before editing ANY file, writing ANY code, installing ANY dependency, or running ANY mutating command: **stop and present an implementation plan**.
- Wait for explicit user approval (e.g., "ok", "proceed", "go ahead") before executing.
- Read-only inspection (reading files, searching code) is allowed before approval — mutations are NOT.
- This applies to subagents too.

## 3. Commit Message Rules (When User Asks to Commit)

- Format: **Conventional Commits** with module scope — `type(module): description`
- Examples: `feat(history): add match timeline view`, `fix(lcu): handle missing summoner data`
- If changes span multiple modules: generate **separate commit messages**, one per module.
- Return commit messages in a **Markdown code block**.
- **NEVER add `Co-Authored-By` lines or any AI/agent attribution.**

## 4. All Other Rules in AGENTS.md

Every rule in AGENTS.md is mandatory. This includes but is not limited to:

- **Package manager:** `bun` only, never `npm`/`npx`. Use `bun add <package> --no-cache`.
- **Styling:** Vanilla Extract `.css.ts` files only. No Tailwind, no utility classes, no inline styles for static values.
- **Layout:** CSS Grid for page-level layout. Flexbox only for micro-alignment.
- **Rust:** No `.unwrap()` / `.expect()`. No `#[allow(dead_code)]`.
- **Types:** Define in Rust, export via ts-rs. Never hand-write mirrored TS types.
- **Static assets:** Fetch in frontend only. No Rust commands for static asset retrieval.
- **UI components:** Use Ark UI (`@ark-ui/react`) for interactive primitives.
- **Linting:** Biome for frontend, Clippy `-D warnings` for Rust.
- **Colors:** `oklch()` only. No hex, no `rgba()`.
- **aria-label:** English only.

---

**If you are unsure whether a rule applies: re-read AGENTS.md. When in doubt, ask the user.**
