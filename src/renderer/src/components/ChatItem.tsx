import { useEffect, useRef } from 'react'
import type { Chat } from '../../../preload'
import Avatar from './Avatar'
import { CHAT_PALETTE } from './colors'

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 4) return `${w}w`
  return `${Math.floor(d / 30)}mo`
}

type Props = {
  chat: Chat
  isActive: boolean
  isMenuOpen: boolean
  onSelect: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onRename: () => void
  onSetColor: (color: string | null) => void
}

export default function ChatItem({
  chat,
  isActive,
  isMenuOpen,
  onSelect,
  onToggleMenu,
  onCloseMenu,
  onRename,
  onSetColor
}: Props): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const handleDown = (e: MouseEvent): void => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        onCloseMenu()
      }
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [isMenuOpen, onCloseMenu])

  const className = [
    'chat-item',
    isActive ? 'active' : '',
    chat.status === 'stopped' ? 'stopped' : '',
    chat.unread && !isActive ? 'unread' : '',
    isMenuOpen ? 'menu-open' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>): void => {
    e.dataTransfer.setData('text/chat-id', chat.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <li
      className={className}
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <Avatar id={chat.id} name={chat.name} status={chat.status} color={chat.color} />
      <div className="chat-text">
        <div className="chat-row">
          <span className="chat-name">{chat.name}</span>
          <span className="chat-time">{relativeTime(chat.lastActiveAt)}</span>
        </div>
        <div className="chat-cwd" title={chat.workingDirectory}>
          {chat.workingDirectory}
        </div>
      </div>
      {chat.unread && !isActive && !isMenuOpen && <span className="unread-dot" />}
      <div className="kebab-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className="kebab-btn"
          aria-label="Chat options"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMenu()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <circle cx="3" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="13" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </button>
        {isMenuOpen && (
          <div className="context-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onCloseMenu()
                onRename()
              }}
            >
              Rename
            </button>
            <div className="menu-divider" />
            <div className="menu-section-label">Color</div>
            <div className="color-row">
              <button
                type="button"
                className={'color-swatch color-swatch-auto' + (!chat.color ? ' selected' : '')}
                title="Auto"
                onClick={() => onSetColor(null)}
              >
                A
              </button>
              {CHAT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={'color-swatch' + (chat.color === c ? ' selected' : '')}
                  title={c}
                  style={{ background: c }}
                  onClick={() => onSetColor(c)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
