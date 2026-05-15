import type { Chat } from '../../../preload'
import Avatar from './Avatar'

type Props = {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onNewChat: () => void
}

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

export default function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat
}: Props): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-drag-handle" />
      <div className="sidebar-header">
        <span className="sidebar-title">Chats</span>
        <button
          type="button"
          className="new-chat-btn"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
        >
          +
        </button>
      </div>
      <ul className="chat-list">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId
          const className = [
            'chat-item',
            isActive ? 'active' : '',
            chat.status === 'stopped' ? 'stopped' : '',
            chat.unread && !isActive ? 'unread' : ''
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={chat.id} className={className} onClick={() => onSelect(chat.id)}>
              <Avatar id={chat.id} name={chat.name} status={chat.status} />
              <div className="chat-text">
                <div className="chat-row">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">{relativeTime(chat.lastActiveAt)}</span>
                </div>
                <div className="chat-cwd" title={chat.workingDirectory}>
                  {chat.workingDirectory}
                </div>
              </div>
              {chat.unread && !isActive && <span className="unread-dot" />}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
