# ClaudeChat

A macOS Electron app that wraps multiple Claude Code sessions in a Messenger-style UI: sidebar of named chats, terminal pane for the active one. Each chat is a real `claude` process in its own working directory, persisted via tmux so sessions survive app restarts.

**`PLAN.md` is the source of truth for architecture, data model, IPC channels, and build phases. Read it before starting any work and before relitigating any decision.**

## Locked decisions — do not relitigate

- **Wrap the Claude Code CLI via PTY + xterm.js.** Not the Agent SDK. The "Messenger feel" comes from the sidebar and framing, not from replacing Claude's terminal output with chat bubbles.
- **One Claude per chat.** No multi-agent rooms.
- **tmux is the persistence layer.** Each chat = one tmux session named `claudechat-${id}`. Sessions outlive the app; only "End Chat" kills them.
- **Working directory is the unit of isolation.** New chats start from a directory picker.
- **Build phases run in order** (see PLAN.md §"Build phases"). Don't skip ahead — phase 3 (tmux wrap) must work before phase 4 (sidebar) is meaningful.

## Tech stack

- Electron (main + renderer) scaffolded with **electron-vite**
- React + TypeScript (renderer)
- xterm.js (terminal rendering)
- node-pty (PTY spawning from main process — needs `electron-rebuild`)
- tmux (session persistence)
- electron-store or similar for chat metadata JSON

Package manager: **npm**. Don't switch to pnpm/yarn — pnpm in particular has known friction with Electron native rebuilds.

## Working norms

- **Autonomy:** Just do it. Run npm install, create files, commit, etc. without asking. Stop only for destructive/irreversible actions or genuine ambiguity about intent.
- **Tests:** Skip for v1. The plan is manual-UX-driven; tests would slow the build. Revisit after phase 10.
- **Commits:** One commit at the end of each numbered build phase. Message format: `Phase N: <what shipped>`. Push to `origin/main` after each phase.
- **UI verification:** You can't drive an Electron window. After changes that affect UX, say so explicitly and ask the user to verify — don't claim a phase is "done" based only on type-checks.

## Known gotchas (full list in PLAN.md §"Known technical gotchas")

- `node-pty` requires `electron-rebuild` after install. Expect first-install friction.
- For observing a tmux session without rendering it (unread detection), use `pipe-pane`, not `capture-pane`.
- Terminal resize must propagate from xterm.js → PTY → tmux, or wrapping breaks.
- Idle detection: start with the bell character, upgrade to a `Stop` hook later.

## Out of scope for v1

Cross-chat search, multi-Claude rooms, cross-machine sync, unified inbox, theming. See PLAN.md §"Out of scope".
