import { findIcon } from './icons-data'

type Props = {
  slug: string
  size?: number
  showTitle?: boolean
}

export default function BadgeIcon({
  slug,
  size = 14,
  showTitle = true
}: Props): React.JSX.Element | null {
  const icon = findIcon(slug)
  if (!icon) return null
  return (
    <svg
      className="badge-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={'#' + icon.hex}
      aria-label={icon.title}
    >
      {showTitle && <title>{icon.title}</title>}
      <path d={icon.path} />
    </svg>
  )
}
