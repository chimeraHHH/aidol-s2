/** Mock nest-presence metrics from the smart litter / nest scale (not BLE yet). */

export interface NestPresenceSnapshot {
  /** Hours in nest today */
  todayHours: number
  /** Delta vs yesterday (hours); null if no baseline */
  deltaHours: number | null
  /** Rolling 7-day average hours */
  weekAvgHours: number
  /** Soft target band for a typical indoor cat day nest lounging */
  idealHours: { min: number; max: number }
  hint: string
  /** 0–100 for progress bars */
  score: number
}

export function getNestPresence(energy = 78): NestPresenceSnapshot {
  const todayHours = Number((6.4 + (energy % 10) * 0.08).toFixed(1))
  const deltaHours = Number((0.2 + ((energy % 7) - 3) * 0.08).toFixed(1))
  const weekAvgHours = Number((todayHours - deltaHours * 0.35).toFixed(1))
  const idealHours = { min: 5.5, max: 8.5 }

  let score = 84
  let hint = '窝里待得刚刚好'
  if (todayHours < idealHours.min) {
    score = 68
    hint = '今天在窝偏少，多陪一会儿'
  } else if (todayHours > idealHours.max) {
    score = 78
    hint = '窝里赖太久啦，起来溜达溜达'
  } else if (deltaHours > 0.15) {
    score = 90
    hint = '比昨天多窝一会儿'
  } else if (deltaHours < -0.15) {
    score = 76
    hint = '比昨天少了一点'
  }

  return { todayHours, deltaHours, weekAvgHours, idealHours, hint, score }
}

export function formatNestHours(hours: number): string {
  return hours.toFixed(1)
}

export function formatNestDelta(deltaHours: number | null): string {
  if (deltaHours == null) return '暂无对比'
  if (deltaHours === 0) return '与昨天持平'
  const abs = Math.abs(deltaHours).toFixed(1)
  return deltaHours > 0 ? `↑ ${abs} 小时` : `↓ ${abs} 小时`
}
