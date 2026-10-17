export function formatKg(value: number, digits = 2): string {
  return `${value.toFixed(digits)} kg`
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return '首次记录'
  if (delta === 0) return '持平'
  const sign = delta > 0 ? '↑' : '↓'
  return `${sign} ${Math.abs(delta).toFixed(2)} kg`
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatRelativeDay(iso: string): string {
  const day = new Date(iso)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const diff = Math.round((startToday.getTime() - startDay.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${diff} 天前`
}
