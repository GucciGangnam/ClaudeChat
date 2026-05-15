import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
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

type Chat = StoredChat & { status: 'running' | 'stopped' }

let mainWindow: BrowserWindow | null = null
let ptyProcess: pty.IPty | null = null
let activeChatId: string | null = null

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

function chatsWithStatus(): Chat[] {
  return getChats().map((c) => ({
    ...c,
    status: tmuxSessionExists(c.tmuxSessionName) ? 'running' : 'stopped'
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
  if (activeChatId === chatId && ptyProcess) return

  detachPty()
  ensureTmuxSession(chat.tmuxSessionName, chat.workingDirectory, cols, rows)

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
      return { ...chat, status: 'stopped' as const }
    }
  )

  ipcMain.handle('chats:end', (_event, chatId: string) => {
    const chat = findChat(chatId)
    if (!chat) return
    if (activeChatId === chatId) detachPty()
    spawnSync('tmux', ['kill-session', '-t', chat.tmuxSessionName])
    removeChat(chatId)
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
