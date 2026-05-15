import { useRef, useState } from 'react'
import type { Chat, Project } from '../../../preload'
import ProjectSection from './ProjectSection'

type Props = {
  chats: Chat[]
  projects: Project[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onNewChat: () => void
  onNewProject: () => void
  onChatRename: (chatId: string) => void
  onProjectRename: (projectId: string) => void
  onProjectDelete: (projectId: string) => void
  onProjectToggleCollapsed: (projectId: string) => void
  onAssignChatProject: (chatId: string, projectId: string | null) => void
}

const UNGROUPED = '__ungrouped__'

export default function Sidebar({
  chats,
  projects,
  activeChatId,
  onSelect,
  onNewChat,
  onNewProject,
  onChatRename,
  onProjectRename,
  onProjectDelete,
  onProjectToggleCollapsed,
  onAssignChatProject
}: Props): React.JSX.Element {
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null)
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  // Counter so we don't flicker the highlight as the cursor crosses children.
  const dragCounters = useRef<Map<string, number>>(new Map())

  const ungroupedChats = chats.filter(
    (c) => !c.projectId || !projects.some((p) => p.id === c.projectId)
  )
  const projectIds = new Set(projects.map((p) => p.id))
  const chatsByProject = new Map<string, Chat[]>()
  for (const p of projects) chatsByProject.set(p.id, [])
  for (const chat of chats) {
    if (chat.projectId && projectIds.has(chat.projectId)) {
      chatsByProject.get(chat.projectId)!.push(chat)
    }
  }

  const makeDropHandlers = (
    target: string
  ): {
    onDragOverSection: (e: React.DragEvent<HTMLElement>) => void
    onDragLeaveSection: (e: React.DragEvent<HTMLElement>) => void
    onDropOnSection: (e: React.DragEvent<HTMLElement>) => void
  } => ({
    onDragOverSection: (e) => {
      const types = e.dataTransfer.types
      if (!types || !types.includes('text/chat-id')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const counters = dragCounters.current
      counters.set(target, (counters.get(target) ?? 0) + 1)
      if (dragTarget !== target) setDragTarget(target)
    },
    onDragLeaveSection: () => {
      const counters = dragCounters.current
      const next = (counters.get(target) ?? 0) - 1
      if (next <= 0) {
        counters.delete(target)
        setDragTarget((current) => (current === target ? null : current))
      } else {
        counters.set(target, next)
      }
    },
    onDropOnSection: (e) => {
      e.preventDefault()
      const chatId = e.dataTransfer.getData('text/chat-id')
      dragCounters.current.delete(target)
      setDragTarget(null)
      if (!chatId) return
      const projectId = target === UNGROUPED ? null : target
      onAssignChatProject(chatId, projectId)
    }
  })

  const handleChatToggleMenu = (chatId: string): void => {
    setOpenMenuChatId((current) => (current === chatId ? null : chatId))
  }
  const handleChatCloseMenu = (): void => setOpenMenuChatId(null)

  const showUngroupedSection = projects.length > 0

  return (
    <aside className="sidebar">
      <div className="sidebar-drag-handle" />
      <div className="sidebar-header">
        <span className="sidebar-title">Chats</span>
        <div className="sidebar-header-actions">
          <button
            type="button"
            className="header-icon-btn"
            onClick={onNewProject}
            title="New project"
            aria-label="New project"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M2 4.2c0-.66.54-1.2 1.2-1.2h2.8l1.3 1.5h5.5c.66 0 1.2.54 1.2 1.2v6.1c0 .66-.54 1.2-1.2 1.2H3.2c-.66 0-1.2-.54-1.2-1.2V4.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M8 7.5v3M6.5 9h3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="header-icon-btn"
            onClick={onNewChat}
            title="New chat"
            aria-label="New chat"
          >
            +
          </button>
        </div>
      </div>
      <div className="sidebar-scroll">
        {projects.length === 0 ? (
          <ProjectSection
            project={null}
            chats={chats}
            activeChatId={activeChatId}
            openMenuChatId={openMenuChatId}
            isDragOver={false}
            onSelect={onSelect}
            onChatToggleMenu={handleChatToggleMenu}
            onChatCloseMenu={handleChatCloseMenu}
            onChatRename={onChatRename}
            // No drop handlers: nothing to drop into when there are no projects.
            onDragOverSection={() => {}}
            onDragLeaveSection={() => {}}
            onDropOnSection={() => {}}
          />
        ) : (
          <>
            {showUngroupedSection && (
              <ProjectSection
                project={null}
                chats={ungroupedChats}
                activeChatId={activeChatId}
                openMenuChatId={openMenuChatId}
                isDragOver={dragTarget === UNGROUPED}
                onSelect={onSelect}
                onChatToggleMenu={handleChatToggleMenu}
                onChatCloseMenu={handleChatCloseMenu}
                onChatRename={onChatRename}
                {...makeDropHandlers(UNGROUPED)}
              />
            )}
            {projects.map((project) => (
              <ProjectSection
                key={project.id}
                project={project}
                chats={chatsByProject.get(project.id) ?? []}
                activeChatId={activeChatId}
                openMenuChatId={openMenuChatId}
                isDragOver={dragTarget === project.id}
                onSelect={onSelect}
                onChatToggleMenu={handleChatToggleMenu}
                onChatCloseMenu={handleChatCloseMenu}
                onChatRename={onChatRename}
                onProjectRename={onProjectRename}
                onProjectDelete={onProjectDelete}
                onProjectToggleCollapsed={onProjectToggleCollapsed}
                {...makeDropHandlers(project.id)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
