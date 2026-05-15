# ClaudeChat — Build Plan

## What we're building

A macOS desktop app that wraps multiple Claude Code sessions in a single Messenger-style UI. Instead of half a dozen terminal windows scattered across the desktop — one for the frontend Claude, one for the Stripe Claude, one for the GitHub Claude, etc. — you get a single app with a sidebar of named chats and a terminal pane for whichever one you're talking to right now.

Each chat is a real Claude Code process, running in its own working directory, with its own permission scopes. The UI is a container; Claude Code itself is unchanged.

## Why this architecture (locked-in decisions — don't relitigate)

We considered two paths:

1. **Wrap the Claude Code CLI** in pseudo-terminals and render with xterm.js — keeps every Claude Code feature (slash commands, hooks, MCP servers, permission prompts) working for free.
2. **Drive Claude via the Agent SDK** and render messages as chat bubbles — visually closer to Messenger but reinvents most of Claude Code.

**We chose path 1.** The "Messenger look" comes from the sidebar + chat-shaped framing, not from replacing Claude's terminal UI with bubbles.

Other locked decisions:

- **One Claude per chat.** No multi-agent rooms.
- **Sessions persist across app quit.** Backed by tmux. Explicit "End Chat" button is the only way to kill a session.
- **New chats start from a directory picker + name input.** Working directory is the unit of isolation.

## Tech stack

- **Electron** — main + renderer processes
- **React + TypeScript** — renderer UI
- **xterm.js** — terminal rendering in the right pane
- **node-pty** — PTY spawning from the main process
- **tmux** — session persistence backend (each chat = one tmux session, processes survive app quit)
- **Local JSON store** (electron-store or similar) — chat metadata: name, working directory, tmux session ID, timestamps

## Core UX flows

### Creating a new chat
1. Click "+ New Chat" in the sidebar
2. Native macOS directory picker opens
3. User picks a directory and enters a friendly name
4. App creates a new tmux session in that directory running `claude`
5. New chat appears in sidebar and becomes active

### Switching chats
- Click a chat in the sidebar → xterm.js detaches from the current PTY and attaches to the selected chat's PTY
- All other chats keep running in the background, tmux holds their state

### Ending a chat
- "End Chat" button in the active chat header → confirm dialog → kill tmux session → remove from sidebar and store

### Persistence across app quit
- tmux sessions outlive the app
- On launch, app reads the JSON store and reattaches to existing tmux sessions
- If a tmux session no longer exists (machine restart, tmux server killed), mark that chat as "stopped" — user can restart it in the same directory or delete it

## Data model

```ts
type Chat = {
  id: string;              // uuid
  name: string;            // user-supplied
  workingDirectory: string;
  tmuxSessionName: string; // unique, e.g. `claudechat-${id}`
  status: "running" | "stopped";
  createdAt: number;
  lastActiveAt: number;
  unread: boolean;
};
```

Stored as JSON in the app's userData directory.

## Major components

### Main process
- `SessionManager` — owns all tmux operations: create, attach, send input, kill, list
- `Store` — reads/writes chat metadata JSON
- IPC handlers — bridge between renderer and SessionManager

### Renderer
- `App` — top-level layout, manages active chat ID
- `Sidebar` — list of chats, "+ New Chat" button, unread indicators
- `ChatView` — active chat header (name, working dir, end-chat button) + xterm.js terminal
- `NewChatDialog` — directory picker + name input
- `EndChatConfirm` — destructive action confirmation

### IPC channels
- `chats:list`, `chats:create`, `chats:end`
- `chat:attach`, `chat:input`, `chat:output` (streaming)
- `chat:resize` (forwards terminal resize to PTY)

## Build phases (in order — don't skip ahead)

1. **Hello world.** Electron + React shell with a single hardcoded xterm.js terminal running `bash`. Prove the rendering loop works.
2. **Spawn Claude via node-pty.** Replace bash with `claude` in a chosen directory. No sidebar yet.
3. **Wrap in tmux.** Spawn `tmux new-session -d -s ${name} claude` and have xterm.js attach via `tmux attach`. Verify the session survives killing and restarting the app.
4. **Sidebar + multi-session.** Add the sidebar, support multiple concurrent chats, switching between them.
5. **Persistence.** JSON store, reload chats on launch, reattach to tmux sessions.
6. **New chat flow.** Directory picker, name input, "+ New Chat" button.
7. **End chat flow.** Confirmation dialog, tmux kill, store cleanup.
8. **Unread indicators.** Watch each PTY stream for output; mark a chat unread when it isn't the active one.
9. **Notifications.** macOS native notifications when a session is idle / awaiting input (bell char or `Stop` hook).
10. **Design polish.** Typography, spacing, transitions. This is what separates "VS Code with a sidebar" from something that feels like Messenger.

## Known technical gotchas

- **node-pty native modules in Electron** — needs `electron-rebuild` setup. Expect this to be finicky on first install.
- **tmux output rendering** — when attaching to an existing tmux session, `tmux attach` from xterm.js handles scrollback correctly. If you ever need to observe a session without rendering it (e.g. for unread detection), use `pipe-pane` rather than `capture-pane`.
- **Detecting "idle"** — Claude Code emits a bell character when it wants attention. Cleaner long-term option is a per-chat `Stop` hook in `.claude/settings.json` that writes to a file the app watches. Start with the bell, upgrade later.
- **Terminal resize** — when the window resizes, xterm.js's new dimensions must be propagated to the PTY (and through tmux) so wrapping works correctly.
- **Broken working directories** — handle the case where a chat's working directory has been deleted or moved.

## Out of scope for v1

- Cross-chat search
- Multiple Claudes per chat
- Sharing chats between machines
- A unified "inbox" view across all chats
- Custom theming
- Anything that isn't 1:1 named-chat → terminal pane

## Open questions to revisit later

- How are notifications surfaced when the app is backgrounded vs foregrounded?
- Should there be a per-chat "favorite" / pinning feature once you have 20+ chats?
- App icon / branding / final name (working title: ClaudeChat)
