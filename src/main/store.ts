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
  projectId?: string | null
  color?: string | null
}

export type StoredProject = {
  id: string
  name: string
  createdAt: number
  collapsed: boolean
}

const CHATS_FILE = 'chats.json'
const PROJECTS_FILE = 'projects.json'

function chatsPath(): string {
  return path.join(app.getPath('userData'), CHATS_FILE)
}

function projectsPath(): string {
  return path.join(app.getPath('userData'), PROJECTS_FILE)
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
let projects: StoredProject[] = []

// ── Chats ──────────────────────────────────────────────────────────────

export function loadChats(): StoredChat[] {
  try {
    const raw = fs.readFileSync(chatsPath(), 'utf8')
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
  const file = chatsPath()
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

export function removeChat(id: string): void {
  const idx = chats.findIndex((c) => c.id === id)
  if (idx === -1) return
  chats.splice(idx, 1)
  saveChats()
}

export function renameChat(id: string, name: string): void {
  const chat = findChat(id)
  if (!chat) return
  chat.name = name
  saveChats()
}

export function setChatColor(id: string, color: string | null): void {
  const chat = findChat(id)
  if (!chat) return
  chat.color = color
  saveChats()
}

export function assignChatToProject(chatId: string, projectId: string | null): void {
  const chat = findChat(chatId)
  if (!chat) return
  chat.projectId = projectId
  saveChats()
}

export function addChat(input: {
  name: string
  workingDirectory: string
  projectId?: string | null
}): StoredChat {
  const id = crypto.randomUUID()
  const now = Date.now()
  const chat: StoredChat = {
    id,
    name: input.name,
    workingDirectory: input.workingDirectory,
    tmuxSessionName: `claudechat-${id}`,
    createdAt: now,
    lastActiveAt: now,
    projectId: input.projectId ?? null
  }
  chats.push(chat)
  saveChats()
  return chat
}

// ── Projects ───────────────────────────────────────────────────────────

export function loadProjects(): StoredProject[] {
  try {
    const raw = fs.readFileSync(projectsPath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      projects = parsed
      return projects
    }
  } catch {
    // file missing — start with no projects
  }
  projects = []
  return projects
}

export function saveProjects(): void {
  const file = projectsPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(projects, null, 2))
}

export function getProjects(): StoredProject[] {
  return projects
}

export function findProject(id: string): StoredProject | undefined {
  return projects.find((p) => p.id === id)
}

export function addProject(name: string): StoredProject {
  const project: StoredProject = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    collapsed: false
  }
  projects.push(project)
  saveProjects()
  return project
}

export function renameProject(id: string, name: string): void {
  const project = findProject(id)
  if (!project) return
  project.name = name
  saveProjects()
}

export function setProjectCollapsed(id: string, collapsed: boolean): void {
  const project = findProject(id)
  if (!project) return
  project.collapsed = collapsed
  saveProjects()
}

export function removeProject(id: string): void {
  const idx = projects.findIndex((p) => p.id === id)
  if (idx === -1) return
  projects.splice(idx, 1)
  saveProjects()
  // Orphan any chats that pointed at this project.
  let touchedChats = false
  for (const chat of chats) {
    if (chat.projectId === id) {
      chat.projectId = null
      touchedChats = true
    }
  }
  if (touchedChats) saveChats()
}
