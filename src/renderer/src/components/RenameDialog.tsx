import { useEffect, useRef, useState } from 'react'

type Props = {
  title: string
  initialName: string
  submitLabel?: string
  placeholder?: string
  onCancel: () => void
  onSubmit: (name: string) => void | Promise<void>
}

export default function RenameDialog({
  title,
  initialName,
  submitLabel = 'Save',
  placeholder,
  onCancel,
  onSubmit
}: Props): React.JSX.Element {
  const [name, setName] = useState(initialName)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed !== initialName.trim() && !submitting

  const submit = async (): Promise<void> => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">{title}</div>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Name</span>
            <input
              ref={inputRef}
              value={name}
              placeholder={placeholder}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) void submit()
              }}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
