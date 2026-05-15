import { app, shell, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { spawnSync } from 'child_process'
import * as pty from 'node-pty'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  loadChats,
  getChats,
  findChat,
  touchChat,
  addChat,
  removeChat,
  type StoredChat
} from './store'

type Chat = StoredChat & { status: 'running' | 'stopped'; unread: boolean }

let mainWindow: BrowserWindow | null = null
let ptyProcess: pty.IPty | null = null
let activeChatId: string | null = null

const unread = new Set<string>()
const fileWatchers = new Map<string, fs.FSWatcher>()
const fileOffsets = new Map<string, number>()
const lastNotifyAt = new Map<string, number>()
const BEL = 0x07
const NOTIFY_DEBOUNCE_MS = 5000

function pipeDir(): string {
  return join(app.getPath('userData'), 'pipes')
}

function pipePath(chatId: string): string {
  return join(pipeDir(), `${chatId}.log`)
}

function shQuote(s: string): string {
  // Single-quote for /bin/sh: wrap in '…' and escape any embedded ' as '\''.
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

function tmuxSessionExists(name: string): boolean {
  return spawnSync('tmux', ['has-session', '-t', name]).status === 0
}

function ensureTmuxSession(name: string, cwd: string, cols: number, rows: number): void {
  if (tmuxSessionExists(name)) return
  spawnSync('tmux', [
    'new-session',
    '-d',
    '-s',
    name,
    '-x',
    String(cols),
    '-y',
    String(rows),
    '-c',
    cwd,
    'claude'
  ])
  spawnSync('tmux', ['set-option', '-t', name, 'status', 'off'])
}

function readNewBytes(chatId: string): Buffer | null {
  const file = pipePath(chatId)
  let stats: fs.Stats
  try {
    stats = fs.statSync(file)
  } catch {
    return null
  }
  let offset = fileOffsets.get(chatId) ?? 0
  if (stats.size < offset) offset = 0 // file truncated/recreated
  const len = stats.size - offset
  fileOffsets.set(chatId, stats.size)
  if (len <= 0) return null
  const buf = Buffer.alloc(len)
  let fd: number
  try {
    fd = fs.openSync(file, 'r')
  } catch {
    return null
  }
  try {
    fs.readSync(fd, buf, 0, len, offset)
  } finally {
    fs.closeSync(fd)
  }
  return buf
}

function watchPipeFile(chat: StoredChat): void {
  const existing = fileWatchers.get(chat.id)
  if (existing) {
    existing.close()
    fileWatchers.delete(chat.id)
  }
  // Start tracking from end-of-file so prior bytes don't trigger a phantom unread.
  try {
    fileOffsets.set(chat.id, fs.statSync(pipePath(chat.id)).size)
  } catch {
    fileOffsets.set(chat.id, 0)
  }
  const watcher = fs.watch(pipePath(chat.id), () => {
    const buf = readNewBytes(chat.id)
    if (!buf || buf.length === 0) return
    // Only act on claude's terminal bell — its "I have something for you"
    // signal. Filters out cursor-blink redraws.
    if (!buf.includes(BEL)) return

    const isActiveChat = chat.id === activeChatId
    const windowFocused = mainWindow?.isFocused() ?? false
    // The user is "seeing" this chat only if they're focused on the app AND
    // it's the active chat. Otherwise they need to be told.
    if (isActiveChat && windowFocused) return

    if (!isActiveChat && !unread.has(chat.id)) {
      unread.add(chat.id)
      notifyChatsChanged()
    }
    notifyOS(chat)
  })
  fileWatchers.set(chat.id, watcher)
}

function notifyOS(chat: StoredChat): void {
  if (!Notification.isSupported()) return
  const now = Date.now()
  const last = lastNotifyAt.get(chat.id) ?? 0
  if (now - last < NOTIFY_DEBOUNCE_MS) return
  lastNotifyAt.set(chat.id, now)
  const n = new Notification({
    title: chat.name,
    body: 'Claude is waiting for you',
    silent: false
  })
  n.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('chat:select', chat.id)
    }
  })
  n.show()
}

function setupPipeForChat(chat: StoredChat): void {
  if (!tmuxSessionExists(chat.tmuxSessionName)) return
  fs.mkdirSync(pipeDir(), { recursive: true })
  // Touch the file so fs.watch has something to attach to.
  fs.closeSync(fs.openSync(pipePath(chat.id), 'a'))
  // Close any prior pipe-pane wrapper, then open a fresh one.
  spawnSync('tmux', ['pipe-pane', '-t', chat.tmuxSessionName])
  spawnSync('tmux', [
    'pipe-pane',
    '-t',
    chat.tmuxSessionName,
    `cat >> ${shQuote(pipePath(chat.id))}`
  ])
  watchPipeFile(chat)
}

function teardownPipeForChat(chat: StoredChat): void {
  spawnSync('tmux', ['pipe-pane', '-t', chat.tmuxSessionName])
  const watcher = fileWatchers.get(chat.id)
  if (watcher) {
    watcher.close()
    fileWatchers.delete(chat.id)
  }
  fileOffsets.delete(chat.id)
  lastNotifyAt.delete(chat.id)
  fs.rmSync(pipePath(chat.id), { force: true })
}

function setupAllPipes(): void {
  for (const chat of getChats()) setupPipeForChat(chat)
}

function clearUnread(chatId: string): void {
  if (unread.delete(chatId)) {
    notifyChatsChanged()
  }
}

function chatsWithStatus(): Chat[] {
  return getChats().map((c) => ({
    ...c,
    status: tmuxSessionExists(c.tmuxSessionName) ? 'running' : 'stopped',
    unread: unread.has(c.id)
  }))
}

function notifyChatsChanged(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('chats:changed')
  }
}

function detachPty(): void {
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
  activeChatId = null
}

function attachChat(chatId: string, cols: number, rows: number): void {
  const chat = findChat(chatId)
  if (!chat || !mainWindow) return
  if (activeChatId === chatId && ptyProcess) {
    clearUnread(chatId)
    return
  }

  detachPty()
  ensureTmuxSession(chat.tmuxSessionName, chat.workingDirectory, cols, rows)
  setupPipeForChat(chat)

  const proc = pty.spawn('tmux', ['-2', 'attach', '-t', chat.tmuxSessionName], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: chat.workingDirectory,
    env: process.env as Record<string, string>
  })

  ptyProcess = proc
  activeChatId = chat.id
  const window = mainWindow

  proc.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send('chat:output', { chatId: chat.id, data })
    }
  })

  proc.onExit(() => {
    if (ptyProcess === proc) {
      ptyProcess = null
      activeChatId = null
      notifyChatsChanged()
    }
  })

  touchChat(chat.id)
  clearUnread(chat.id)
  notifyChatsChanged()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    detachPty()
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.claudechat')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  loadChats()
  setupAllPipes()

  ipcMain.handle('chats:list', () => chatsWithStatus())

  ipcMain.handle('chats:openDirectory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      message: 'Pick a working directory for the new chat'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(
    'chats:create',
    (_event, input: { name: string; workingDirectory: string }) => {
      const chat = addChat(input)
      notifyChatsChanged()
      return { ...chat, status: 'stopped' as const, unread: false }
    }
  )

  ipcMain.handle('chats:end', (_event, chatId: string) => {
    const chat = findChat(chatId)
    if (!chat) return
    if (activeChatId === chatId) detachPty()
    teardownPipeForChat(chat)
    spawnSync('tmux', ['kill-session', '-t', chat.tmuxSessionName])
    removeChat(chatId)
    unread.delete(chatId)
    notifyChatsChanged()
  })

  ipcMain.on('chat:attach', (_event, chatId: string, cols: number, rows: number) => {
    attachChat(chatId, cols, rows)
  })

  ipcMain.on('chat:input', (_event, chatId: string, data: string) => {
    if (chatId === activeChatId) {
      ptyProcess?.write(data)
    }
  })

  ipcMain.on('chat:resize', (_event, chatId: string, cols: number, rows: number) => {
    if (chatId === activeChatId && ptyProcess && cols > 0 && rows > 0) {
      try {
        ptyProcess.resize(cols, rows)
      } catch {
        // resize can throw if pty already exited; safe to ignore
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  detachPty()
  for (const watcher of fileWatchers.values()) watcher.close()
  fileWatchers.clear()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
