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
  unread: boolean
  projectId?: string | null
  color?: string | null
}

export type Project = {
  id: string
  name: string
  createdAt: number
  collapsed: boolean
}

const api = {
  chats: {
    list: (): Promise<Chat[]> => ipcRenderer.invoke('chats:list'),
    openDirectory: (): Promise<string | null> => ipcRenderer.invoke('chats:openDirectory'),
    create: (input: {
      name: string
      workingDirectory: string
      projectId?: string | null
    }): Promise<Chat> => ipcRenderer.invoke('chats:create', input),
    rename: (chatId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('chats:rename', chatId, name),
    setColor: (chatId: string, color: string | null): Promise<void> =>
      ipcRenderer.invoke('chats:setColor', chatId, color),
    end: (chatId: string): Promise<void> => ipcRenderer.invoke('chats:end', chatId),
    assignProject: (chatId: string, projectId: string | null): Promise<void> =>
      ipcRenderer.invoke('chats:assignProject', chatId, projectId),
    onChanged: (handler: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent): void => handler()
      ipcRenderer.on('chats:changed', listener)
      return () => ipcRenderer.removeListener('chats:changed', listener)
    }
  },
  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke('projects:list'),
    create: (name: string): Promise<Project | null> =>
      ipcRenderer.invoke('projects:create', name),
    rename: (projectId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('projects:rename', projectId, name),
    setCollapsed: (projectId: string, collapsed: boolean): Promise<void> =>
      ipcRenderer.invoke('projects:setCollapsed', projectId, collapsed),
    remove: (projectId: string): Promise<void> =>
      ipcRenderer.invoke('projects:remove', projectId),
    onChanged: (handler: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent): void => handler()
      ipcRenderer.on('projects:changed', listener)
      return () => ipcRenderer.removeListener('projects:changed', listener)
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
    },
    onSelect: (handler: (chatId: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, chatId: string): void => handler(chatId)
      ipcRenderer.on('chat:select', listener)
      return () => ipcRenderer.removeListener('chat:select', listener)
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
