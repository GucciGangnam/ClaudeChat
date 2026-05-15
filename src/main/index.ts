import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import os from 'os'
import * as pty from 'node-pty'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let ptyProcess: pty.IPty | null = null

function spawnPty(window: BrowserWindow): void {
  const shellPath = process.env.SHELL || '/bin/bash'
  ptyProcess = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
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
    if (ptyProcess) {
      ptyProcess.kill()
      ptyProcess = null
    }
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
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
