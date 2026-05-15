import type { Chat } from '../../../preload'

type Props = {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
}

export default function Sidebar({ chats, activeChatId, onSelect }: Props): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">Chats</div>
      <ul className="chat-list">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className={'chat-item' + (chat.id === activeChatId ? ' active' : '')}
            onClick={() => onSelect(chat.id)}
          >
            <div className="chat-name">{chat.name}</div>
            <div className="chat-cwd">{chat.workingDirectory}</div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
