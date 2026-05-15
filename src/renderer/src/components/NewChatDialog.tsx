import { useEffect, useRef, useState } from 'react'

type Props = {
  onClose: () => void
  onCreated: (chatId: string) => void
}

function basename(dir: string): string {
  const parts = dir.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

export default function NewChatDialog({ onClose, onCreated }: Props): React.JSX.Element {
  const [name, setName] = useState('')
  const [dir, setDir] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const pickDir = async (): Promise<void> => {
    const chosen = await window.api.chats.openDirectory()
    if (chosen) {
      setDir(chosen)
      setName((current) => (current.length === 0 ? basename(chosen) : current))
    }
  }

  const submit = async (): Promise<void> => {
    if (!name.trim() || !dir || submitting) return
    setSubmitting(true)
    try {
      const chat = await window.api.chats.create({ name: name.trim(), workingDirectory: dir })
      onCreated(chat.id)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = name.trim().length > 0 && dir !== null && !submitting

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">New chat</div>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Name</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) void submit()
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Working directory</span>
            <div className="dir-row">
              <input
                value={dir ?? ''}
                placeholder="No folder chosen"
                readOnly
                className="dir-input"
              />
              <button type="button" onClick={pickDir} className="btn-secondary">
                Choose folder…
              </button>
            </div>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
