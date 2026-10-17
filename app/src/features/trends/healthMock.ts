/** Mock lifestyle metrics for the kitten health panel (not from BLE yet). */

export interface LifestyleMetric {
  id: 'sleep' | 'activity' | 'appetite' | 'energy'
  label: string
  value: string
  unit: string
  hint: string
  /** 0–100 for mini bar */
  score: number
  tone: 'good' | 'ok' | 'watch'
}

export interface HealthSnapshot {
  score: number
  grade: string
  insight: string
  idealRange: { min: number; max: number }
  lifestyle: LifestyleMetric[]
}

export function buildHealthSnapshot(input: {
  name: string
  latestKg: number | null
  weekDelta: number | null
  energy: number
  mood: string
}): HealthSnapshot {
  const { name, latestKg, weekDelta, energy } = input

  const idealRange = { min: 4.2, max: 4.6 }
  let weightScore = 82
  if (latestKg !== null) {
    if (latestKg < idealRange.min || latestKg > idealRange.max) weightScore = 68
    else if (Math.abs(weekDelta ?? 0) > 0.08) weightScore = 74
    else weightScore = 90
  }

  const sleepHours = 14.2 + (energy % 10) * 0.05
  const activityMin = 38 + Math.round((100 - energy) * 0.12)
  const appetitePct = 88 + (weekDelta !== null && weekDelta > 0 ? 4 : -2)

  const lifestyle: LifestyleMetric[] = [
    {
      id: 'sleep',
      label: '睡眠',
      value: sleepHours.toFixed(1),
      unit: '小时',
      hint: '昨夜深睡充足',
      score: 86,
      tone: 'good',
    },
    {
      id: 'activity',
      label: '活动',
      value: String(activityMin),
      unit: '分钟',
      hint: '玩耍略偏少',
      score: Math.min(92, 55 + Math.round(activityMin * 0.6)),
      tone: activityMin < 40 ? 'ok' : 'good',
    },
    {
      id: 'appetite',
      label: '食欲',
      value: String(Math.max(70, Math.min(98, appetitePct))),
      unit: '%',
      hint: '进食节奏平稳',
      score: Math.max(70, Math.min(98, appetitePct)),
      tone: 'good',
    },
    {
      id: 'energy',
      label: '精力',
      value: String(energy),
      unit: '分',
      hint: moodHint(input.mood),
      score: energy,
      tone: energy >= 70 ? 'good' : energy >= 50 ? 'ok' : 'watch',
    },
  ]

  const lifeAvg =
    lifestyle.reduce((s, m) => s + m.score, 0) / lifestyle.length
  const score = Math.round(weightScore * 0.55 + lifeAvg * 0.45)

  let grade = '良好'
  let insight = `${name}整体状态不错，继续保持每日见面打卡。`
  if (score >= 88) {
    grade = '优秀'
    insight = `${name}体重落在理想区间，睡眠与食欲也很稳，继续温柔陪伴就好。`
  } else if (score < 72) {
    grade = '关注'
    insight = `${name}近期波动稍大，建议多观察进食与活动，必要时咨询宠物医生。`
  } else if (weekDelta !== null && Math.abs(weekDelta) >= 0.06) {
    insight =
      weekDelta > 0
        ? `近一周体重略升 ${weekDelta.toFixed(2)} kg，属于轻量变化，多陪玩一会儿更安心。`
        : `近一周体重略降 ${Math.abs(weekDelta).toFixed(2)} kg，留意食欲与精神状态即可。`
  }

  return { score, grade, insight, idealRange, lifestyle }
}

function moodHint(mood: string): string {
  switch (mood) {
    case 'sleepy':
      return '有点犯困'
    case 'playful':
      return '活力满满'
    case 'hungry':
      return '有点想吃'
    case 'calm':
      return '心情平稳'
    default:
      return '好奇探索中'
  }
}
