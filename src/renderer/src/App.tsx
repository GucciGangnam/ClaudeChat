import { useCallback, useEffect, useState } from 'react'
import Terminal from './components/Terminal'
import Sidebar from './components/Sidebar'
import type { Chat } from '../../preload'

function App(): React.JSX.Element {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<Chat[]> => {
    const list = await window.api.chats.list()
    setChats(list)
    return list
  }, [])

  useEffect(() => {
    void refresh().then((list) => {
      if (list.length > 0) {
        setActiveChatId((current) => current ?? list[0].id)
      }
    })
    const off = window.api.chats.onChanged(() => {
      void refresh()
    })
    return off
  }, [refresh])

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
              <span className={'titlebar-status status-' + activeChat.status}>
                {activeChat.status}
              </span>
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
