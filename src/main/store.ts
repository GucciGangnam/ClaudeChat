import fs from 'fs'
import path from 'path'
import os from 'os'
import { app } from 'electron'

export type StoredChat = {
  id: string
  name: string
  workingDirectory: string
  tmuxSessionName: string
  createdAt: number
  lastActiveAt: number
}

const STORE_FILE = 'chats.json'

function storePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE)
}

const SEED_CHATS: Omit<StoredChat, 'createdAt' | 'lastActiveAt'>[] = [
  {
    id: 'home',
    name: 'Home',
    workingDirectory: os.homedir(),
    tmuxSessionName: 'claudechat-home'
  },
  {
    id: 'claudechat',
    name: 'ClaudeChat',
    workingDirectory: path.join(os.homedir(), 'Documents/Programming/ClaudeChat'),
    tmuxSessionName: 'claudechat-claudechat'
  },
  {
    id: 'sandbox',
    name: 'Sandbox',
    workingDirectory: path.join(os.homedir(), 'Documents/Programming/Sandbox'),
    tmuxSessionName: 'claudechat-sandbox'
  }
]

let chats: StoredChat[] = []

export function loadChats(): StoredChat[] {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      chats = parsed
      return chats
    }
  } catch {
    // file missing or unreadable — fall through to seed
  }
  const now = Date.now()
  chats = SEED_CHATS.map((c) => ({ ...c, createdAt: now, lastActiveAt: now }))
  saveChats()
  return chats
}

export function saveChats(): void {
  const file = storePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(chats, null, 2))
}

export function getChats(): StoredChat[] {
  return chats
}

export function findChat(id: string): StoredChat | undefined {
  return chats.find((c) => c.id === id)
}

export function touchChat(id: string): void {
  const chat = findChat(id)
  if (!chat) return
  chat.lastActiveAt = Date.now()
  saveChats()
}

export function addChat(input: {
  name: string
  workingDirectory: string
}): StoredChat {
  const id = crypto.randomUUID()
  const now = Date.now()
  const chat: StoredChat = {
    id,
    name: input.name,
    workingDirectory: input.workingDirectory,
    tmuxSessionName: `claudechat-${id}`,
    createdAt: now,
    lastActiveAt: now
  }
  chats.push(chat)
  saveChats()
  return chat
}
