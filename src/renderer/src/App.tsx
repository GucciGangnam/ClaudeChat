import { useEffect, useState } from 'react'
import Terminal from './components/Terminal'
import Sidebar from './components/Sidebar'
import type { Chat } from '../../preload'

function App(): React.JSX.Element {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  useEffect(() => {
    void window.api.chats.list().then((list) => {
      setChats(list)
      if (list.length > 0) setActiveChatId(list[0].id)
    })
  }, [])

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null

  return (
    <div className="app">
      <Sidebar chats={chats} activeChatId={activeChatId} onSelect={setActiveChatId} />
      <main className="main-pane">
        {activeChat ? (
          <>
            <header className="titlebar">
              <span className="titlebar-name">{activeChat.name}</span>
              <span className="titlebar-cwd">{activeChat.workingDirectory}</span>
            </header>
            <div className="terminal-pane">
              <Terminal key={activeChat.id} chatId={activeChat.id} />
            </div>
          </>
        ) : (
          <div className="empty-pane">No chat selected</div>
        )}
      </main>
    </div>
  )
}

export default App
