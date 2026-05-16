export const CHAT_PALETTE = [
  '#5b8def',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f43f5e'
]

function hashedColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return CHAT_PALETTE[Math.abs(hash) % CHAT_PALETTE.length]
}

export function colorForChat(id: string, override?: string | null): string {
  return override && override.length > 0 ? override : hashedColor(id)
}
