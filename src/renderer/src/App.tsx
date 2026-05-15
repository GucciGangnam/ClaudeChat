import { useCallback, useEffect, useState } from 'react'
import Terminal from './components/Terminal'
import Sidebar from './components/Sidebar'
import NewChatDialog from './components/NewChatDialog'
import EndChatConfirm from './components/EndChatConfirm'
import type { Chat } from '../../preload'

function App(): React.JSX.Element {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [endChatId, setEndChatId] = useState<string | null>(null)

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
    const offChanged = window.api.chats.onChanged(() => {
      void refresh()
    })
    const offSelect = window.api.chat.onSelect((chatId) => {
      setActiveChatId(chatId)
    })
    return () => {
      offChanged()
      offSelect()
    }
  }, [refresh])

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const endingChat = chats.find((c) => c.id === endChatId) ?? null

  const handleCreated = (chatId: string): void => {
    setNewChatOpen(false)
    setActiveChatId(chatId)
  }

  const handleConfirmEnd = async (): Promise<void> => {
    if (!endChatId) return
    const idToEnd = endChatId
    const nextActive = chats.find((c) => c.id !== idToEnd)?.id ?? null
    setEndChatId(null)
    await window.api.chats.end(idToEnd)
    setActiveChatId((prev) => (prev === idToEnd ? nextActive : prev))
  }

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={() => setNewChatOpen(true)}
      />
      <main className="main-pane">
        {activeChat ? (
          <>
            <header className="chat-header">
              <div className="chat-header-text">
                <div className="chat-header-name">{activeChat.name}</div>
                <div className="chat-header-cwd">{activeChat.workingDirectory}</div>
              </div>
              <span className={'pill pill-' + activeChat.status}>{activeChat.status}</span>
              <button
                type="button"
                className="ghost-btn ghost-btn-danger"
                onClick={() => setEndChatId(activeChat.id)}
                title="End this chat"
              >
                End
              </button>
            </header>
            <div className="terminal-card">
              <Terminal key={activeChat.id} chatId={activeChat.id} />
            </div>
          </>
        ) : (
          <div className="empty-pane">
            <div className="empty-title">No chat selected</div>
            <div className="empty-sub">Create one from the sidebar to get started.</div>
          </div>
        )}
      </main>
      {newChatOpen && (
        <NewChatDialog onClose={() => setNewChatOpen(false)} onCreated={handleCreated} />
      )}
      {endingChat && (
        <EndChatConfirm
          chat={endingChat}
          onCancel={() => setEndChatId(null)}
          onConfirm={handleConfirmEnd}
        />
      )}
    </div>
  )
}

export default App
