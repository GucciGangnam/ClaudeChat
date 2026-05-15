type Props = {
  id: string
  name: string
  status: 'running' | 'stopped'
}

const PALETTE = [
  '#5b8def',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f43f5e'
]

function colorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ id, name, status }: Props): React.JSX.Element {
  return (
    <div className="avatar" style={{ background: colorFor(id) }}>
      <span className="avatar-initials">{initials(name)}</span>
      <span className={'avatar-status status-' + status} title={status} />
    </div>
  )
}
