import { useCallback, useEffect, useState } from 'react'
import Terminal from './components/Terminal'
import Sidebar from './components/Sidebar'
import NewChatDialog from './components/NewChatDialog'
import ConfirmDialog from './components/ConfirmDialog'
import RenameDialog from './components/RenameDialog'
import type { Chat, Project } from '../../preload'

function App(): React.JSX.Element {
  const [chats, setChats] = useState<Chat[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [endChatId, setEndChatId] = useState<string | null>(null)
  const [renameChatId, setRenameChatId] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)

  const refreshChats = useCallback(async (): Promise<Chat[]> => {
    const list = await window.api.chats.list()
    setChats(list)
    return list
  }, [])

  const refreshProjects = useCallback(async (): Promise<Project[]> => {
    const list = await window.api.projects.list()
    setProjects(list)
    return list
  }, [])

  useEffect(() => {
    void refreshChats().then((list) => {
      if (list.length > 0) {
        setActiveChatId((current) => current ?? list[0].id)
      }
    })
    void refreshProjects()
    const offChats = window.api.chats.onChanged(() => {
      void refreshChats()
    })
    const offProjects = window.api.projects.onChanged(() => {
      void refreshProjects()
    })
    const offSelect = window.api.chat.onSelect((chatId) => {
      setActiveChatId(chatId)
    })
    return () => {
      offChats()
      offProjects()
      offSelect()
    }
  }, [refreshChats, refreshProjects])

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const endingChat = chats.find((c) => c.id === endChatId) ?? null
  const renamingChat = chats.find((c) => c.id === renameChatId) ?? null
  const renamingProject = projects.find((p) => p.id === renameProjectId) ?? null
  const deletingProject = projects.find((p) => p.id === deleteProjectId) ?? null

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

  const handleConfirmDeleteProject = async (): Promise<void> => {
    if (!deleteProjectId) return
    const id = deleteProjectId
    setDeleteProjectId(null)
    await window.api.projects.remove(id)
  }

  const handleAssignChatProject = (chatId: string, projectId: string | null): void => {
    void window.api.chats.assignProject(chatId, projectId)
  }

  const handleProjectToggleCollapsed = (projectId: string): void => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    void window.api.projects.setCollapsed(projectId, !project.collapsed)
  }

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        projects={projects}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={() => setNewChatOpen(true)}
        onNewProject={() => setNewProjectOpen(true)}
        onChatRename={(chatId) => setRenameChatId(chatId)}
        onProjectRename={(projectId) => setRenameProjectId(projectId)}
        onProjectDelete={(projectId) => setDeleteProjectId(projectId)}
        onProjectToggleCollapsed={handleProjectToggleCollapsed}
        onAssignChatProject={handleAssignChatProject}
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
        <ConfirmDialog
          title="End chat"
          confirmLabel="End chat"
          body={
            <>
              <p className="modal-text">
                End chat <strong>{endingChat.name}</strong>? This kills its tmux session and
                discards all conversation history. Cannot be undone.
              </p>
              <p className="modal-text-muted">{endingChat.workingDirectory}</p>
            </>
          }
          onCancel={() => setEndChatId(null)}
          onConfirm={handleConfirmEnd}
        />
      )}
      {renamingChat && (
        <RenameDialog
          title="Rename chat"
          initialName={renamingChat.name}
          onCancel={() => setRenameChatId(null)}
          onSubmit={async (name) => {
            await window.api.chats.rename(renamingChat.id, name)
            setRenameChatId(null)
          }}
        />
      )}
      {newProjectOpen && (
        <RenameDialog
          title="New project"
          initialName=""
          submitLabel="Create"
          placeholder="e.g. Stripe migration"
          onCancel={() => setNewProjectOpen(false)}
          onSubmit={async (name) => {
            await window.api.projects.create(name)
            setNewProjectOpen(false)
          }}
        />
      )}
      {renamingProject && (
        <RenameDialog
          title="Rename project"
          initialName={renamingProject.name}
          onCancel={() => setRenameProjectId(null)}
          onSubmit={async (name) => {
            await window.api.projects.rename(renamingProject.id, name)
            setRenameProjectId(null)
          }}
        />
      )}
      {deletingProject && (
        <ConfirmDialog
          title="Delete project"
          confirmLabel="Delete project"
          body={
            <p className="modal-text">
              Delete <strong>{deletingProject.name}</strong>? Its chats stay alive and move
              back to Ungrouped.
            </p>
          }
          onCancel={() => setDeleteProjectId(null)}
          onConfirm={handleConfirmDeleteProject}
        />
      )}
    </div>
  )
}

export default App
