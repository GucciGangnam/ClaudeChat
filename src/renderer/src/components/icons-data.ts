import * as si from 'simple-icons'

export type SimpleIcon = {
  title: string
  slug: string
  hex: string
  path: string
}

const ICONS_BY_SLUG = new Map<string, SimpleIcon>()

for (const value of Object.values(si)) {
  if (
    value &&
    typeof value === 'object' &&
    'slug' in value &&
    'path' in value &&
    'hex' in value &&
    'title' in value
  ) {
    const icon = value as SimpleIcon
    ICONS_BY_SLUG.set(icon.slug, icon)
  }
}

const ALL_ICONS = Array.from(ICONS_BY_SLUG.values())

export function findIcon(slug: string): SimpleIcon | undefined {
  return ICONS_BY_SLUG.get(slug)
}

export function searchIcons(query: string, limit = 60): SimpleIcon[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return ALL_ICONS.slice(0, limit)
  }
  const matches: { icon: SimpleIcon; score: number }[] = []
  for (const icon of ALL_ICONS) {
    const t = icon.title.toLowerCase()
    const s = icon.slug.toLowerCase()
    let score = -1
    if (t === q || s === q) score = 0
    else if (t.startsWith(q) || s.startsWith(q)) score = 1
    else if (t.includes(q) || s.includes(q)) score = 2
    if (score >= 0) matches.push({ icon, score })
    if (matches.length > limit * 4) break
  }
  matches.sort(
    (a, b) => a.score - b.score || a.icon.title.length - b.icon.title.length
  )
  return matches.slice(0, limit).map((m) => m.icon)
}
