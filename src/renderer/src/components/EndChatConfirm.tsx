import { useEffect } from 'react'
import type { Chat } from '../../../preload'

type Props = {
  chat: Chat
  onCancel: () => void
  onConfirm: () => void
}

export default function EndChatConfirm({ chat, onCancel, onConfirm }: Props): React.JSX.Element {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">End chat</div>
        <div className="modal-body">
          <p className="modal-text">
            End chat <strong>{chat.name}</strong>? This kills its tmux session and discards
            all conversation history. Cannot be undone.
          </p>
          <p className="modal-text-muted">{chat.workingDirectory}</p>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn-danger">
            End chat
          </button>
        </div>
      </div>
    </div>
  )
}
