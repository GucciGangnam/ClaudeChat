import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  pty: {
    sendInput: (data: string): void => {
      ipcRenderer.send('pty:input', data)
    },
    resize: (cols: number, rows: number): void => {
      ipcRenderer.send('pty:resize', cols, rows)
    },
    onOutput: (handler: (data: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, data: string): void => handler(data)
      ipcRenderer.on('pty:output', listener)
      return () => ipcRenderer.removeListener('pty:output', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
