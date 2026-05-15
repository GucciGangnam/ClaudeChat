import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type Chat = {
  id: string
  name: string
  workingDirectory: string
  tmuxSessionName: string
  createdAt: number
  lastActiveAt: number
  status: 'running' | 'stopped'
}

const api = {
  chats: {
    list: (): Promise<Chat[]> => ipcRenderer.invoke('chats:list'),
    openDirectory: (): Promise<string | null> => ipcRenderer.invoke('chats:openDirectory'),
    create: (input: { name: string; workingDirectory: string }): Promise<Chat> =>
      ipcRenderer.invoke('chats:create', input),
    end: (chatId: string): Promise<void> => ipcRenderer.invoke('chats:end', chatId),
    onChanged: (handler: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent): void => handler()
      ipcRenderer.on('chats:changed', listener)
      return () => ipcRenderer.removeListener('chats:changed', listener)
    }
  },
  chat: {
    attach: (chatId: string, cols: number, rows: number): void => {
      ipcRenderer.send('chat:attach', chatId, cols, rows)
    },
    sendInput: (chatId: string, data: string): void => {
      ipcRenderer.send('chat:input', chatId, data)
    },
    resize: (chatId: string, cols: number, rows: number): void => {
      ipcRenderer.send('chat:resize', chatId, cols, rows)
    },
    onOutput: (handler: (chatId: string, data: string) => void): (() => void) => {
      const listener = (
        _event: IpcRendererEvent,
        payload: { chatId: string; data: string }
      ): void => handler(payload.chatId, payload.data)
      ipcRenderer.on('chat:output', listener)
      return () => ipcRenderer.removeListener('chat:output', listener)
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
