import { colorForChat } from './colors'

type Props = {
  id: string
  name: string
  status: 'running' | 'stopped'
  color?: string | null
}

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ id, name, status, color }: Props): React.JSX.Element {
  return (
    <div className="avatar" style={{ background: colorForChat(id, color) }}>
      <span className="avatar-initials">{initials(name)}</span>
      <span className={'avatar-status status-' + status} title={status} />
    </div>
  )
}
