import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chat } from '../../../preload'
import BadgeIcon from './BadgeIcon'
import { findIcon, searchIcons } from './icons-data'

type Props = {
  chat: Chat
  onClose: () => void
}

export default function BadgesDialog({ chat, onClose }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<string[]>(chat.badges ?? [])
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') void close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const results = useMemo(() => searchIcons(query, 60), [query])

  const close = async (): Promise<void> => {
    const original = chat.badges ?? []
    const same =
      original.length === selected.length && original.every((s, i) => s === selected[i])
    if (!same) {
      await window.api.chats.setBadges(chat.id, selected)
    }
    onClose()
  }

  const toggle = (slug: string): void => {
    setSelected((curr) =>
      curr.includes(slug) ? curr.filter((s) => s !== slug) : [...curr, slug]
    )
  }

  return (
    <div className="modal-overlay" onClick={() => void close()}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          Badges <span className="modal-header-sub">— {chat.name}</span>
        </div>
        <div className="modal-body">
          {selected.length > 0 && (
            <div className="selected-badges">
              {selected.map((slug) => {
                const icon = findIcon(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    className="badge-chip"
                    onClick={() => toggle(slug)}
                    title="Remove"
                  >
                    <BadgeIcon slug={slug} size={14} />
                    <span>{icon?.title ?? slug}</span>
                    <span className="badge-chip-x">×</span>
                  </button>
                )
              })}
            </div>
          )}
          <label className="field">
            <span className="field-label">Search</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Stripe, Supabase, GitHub…"
            />
          </label>
          <div className="badge-grid">
            {results.length === 0 ? (
              <div className="badge-grid-empty">No matches</div>
            ) : (
              results.map((icon) => {
                const isSelected = selected.includes(icon.slug)
                return (
                  <button
                    key={icon.slug}
                    type="button"
                    className={'badge-cell' + (isSelected ? ' selected' : '')}
                    onClick={() => toggle(icon.slug)}
                    title={icon.title}
                  >
                    <BadgeIcon slug={icon.slug} size={22} showTitle={false} />
                    <span className="badge-cell-label">{icon.title}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={() => void close()}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
