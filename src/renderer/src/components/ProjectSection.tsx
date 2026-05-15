import { useEffect, useRef, useState } from 'react'
import type { Chat, Project } from '../../../preload'
import ChatItem from './ChatItem'

type Props = {
  project: Project | null // null = the "Ungrouped" pseudo-section
  chats: Chat[]
  activeChatId: string | null
  openMenuChatId: string | null
  isDragOver: boolean
  onSelect: (chatId: string) => void
  onChatToggleMenu: (chatId: string) => void
  onChatCloseMenu: () => void
  onChatRename: (chatId: string) => void
  onProjectRename?: (projectId: string) => void
  onProjectDelete?: (projectId: string) => void
  onProjectToggleCollapsed?: (projectId: string) => void
  onDragOverSection: (e: React.DragEvent<HTMLElement>) => void
  onDragLeaveSection: (e: React.DragEvent<HTMLElement>) => void
  onDropOnSection: (e: React.DragEvent<HTMLElement>) => void
}

export default function ProjectSection({
  project,
  chats,
  activeChatId,
  openMenuChatId,
  isDragOver,
  onSelect,
  onChatToggleMenu,
  onChatCloseMenu,
  onChatRename,
  onProjectRename,
  onProjectDelete,
  onProjectToggleCollapsed,
  onDragOverSection,
  onDragLeaveSection,
  onDropOnSection
}: Props): React.JSX.Element {
  const collapsed = project?.collapsed ?? false
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleDown = (e: MouseEvent): void => {
      if (!menuWrapperRef.current) return
      if (!menuWrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const sectionClass = [
    'project-section',
    isDragOver ? 'drag-over' : '',
    project ? '' : 'ungrouped',
    collapsed ? 'collapsed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const showHeader = project !== null

  return (
    <section
      className={sectionClass}
      onDragOver={onDragOverSection}
      onDragLeave={onDragLeaveSection}
      onDrop={onDropOnSection}
    >
      {showHeader && project && (
        <div
          className={'project-header' + (menuOpen ? ' menu-open' : '')}
          onClick={() => onProjectToggleCollapsed?.(project.id)}
        >
          <svg
            className={'project-chevron' + (collapsed ? ' collapsed' : '')}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden
          >
            <path
              d="M2 3.5l3 3 3-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="project-name">{project.name}</span>
          <span className="project-count">{chats.length}</span>
          <div className="kebab-wrapper" ref={menuWrapperRef}>
            <button
              type="button"
              className="kebab-btn"
              aria-label="Project options"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((open) => !open)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <circle cx="3" cy="8" r="1.4" fill="currentColor" />
                <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                <circle cx="13" cy="8" r="1.4" fill="currentColor" />
              </svg>
            </button>
            {menuOpen && (
              <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setMenuOpen(false)
                    onProjectRename?.(project.id)
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="menu-item menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false)
                    onProjectDelete?.(project.id)
                  }}
                >
                  Delete project
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {!showHeader && <div className="ungrouped-label">Ungrouped</div>}
      {!collapsed && (
        <ul className="chat-list-inner">
          {chats.length === 0 ? (
            <li className="empty-section">Drop a chat here</li>
          ) : (
            chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                isMenuOpen={openMenuChatId === chat.id}
                onSelect={() => onSelect(chat.id)}
                onToggleMenu={() => onChatToggleMenu(chat.id)}
                onCloseMenu={onChatCloseMenu}
                onRename={() => onChatRename(chat.id)}
              />
            ))
          )}
        </ul>
      )}
    </section>
  )
}
