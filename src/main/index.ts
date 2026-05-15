import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import os from 'os'
import { spawnSync } from 'child_process'
import * as pty from 'node-pty'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Phase 3: single hardcoded session. Per-chat sessions arrive in Phase 4.
const SESSION_NAME = 'claudechat-default'

let ptyProcess: pty.IPty | null = null

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
  // Hide tmux's own status bar so the wrap looks seamless.
  spawnSync('tmux', ['set-option', '-t', name, 'status', 'off'])
}

function spawnPty(window: BrowserWindow): void {
  const cwd = os.homedir()
  const cols = 80
  const rows = 24

  ensureTmuxSession(SESSION_NAME, cwd, cols, rows)

  ptyProcess = pty.spawn('tmux', ['-2', 'attach', '-t', SESSION_NAME], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>
  })

  ptyProcess.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send('pty:output', data)
    }
  })

  ptyProcess.onExit(() => {
    ptyProcess = null
  })
}

function detachPty(): void {
  // Killing the tmux client just detaches; the session and `claude` keep
  // running on the tmux server. That's the whole point of this phase.
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    detachPty()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  spawnPty(mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.claudechat')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('pty:input', (_event, data: string) => {
    ptyProcess?.write(data)
  })

  ipcMain.on('pty:resize', (_event, cols: number, rows: number) => {
    if (ptyProcess && cols > 0 && rows > 0) {
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
