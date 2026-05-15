import type { Chat } from '../../../preload'

type Props = {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onNewChat: () => void
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat
}: Props): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Chats</span>
        <button type="button" className="new-chat-btn" onClick={onNewChat} title="New chat">
          + New
        </button>
      </div>
      <ul className="chat-list">
        {chats.map((chat) => {
          const className = [
            'chat-item',
            chat.id === activeChatId ? 'active' : '',
            chat.status === 'stopped' ? 'stopped' : ''
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={chat.id} className={className} onClick={() => onSelect(chat.id)}>
              <div className="chat-name">
                <span
                  className={'status-dot status-dot-' + chat.status}
                  title={chat.status}
                />
                {chat.name}
              </div>
              <div className="chat-cwd">{chat.workingDirectory}</div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
