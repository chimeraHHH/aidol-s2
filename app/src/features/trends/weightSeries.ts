import type { Measurement } from '@/domain/types'

export type WeightPeriod = 'day' | 'month' | 'year'

export interface SeriesPoint {
  /** Stable key for React / chart */
  key: string
  /** ISO-ish bucket id: YYYY-MM-DD | YYYY-MM | YYYY */
  date: string
  weightKg: number
  /** Axis tick label */
  label: string
  /** Longer title for board header */
  title: string
  count: number
  /** Change vs previous bucket in series */
  deltaKg: number | null
}

const PERIOD_META: Record<
  WeightPeriod,
  {
    tab: string
    avgLabel: string
    changeLabel: string
    countLabel: string
    boardHint: string
  }
> = {
  day: {
    tab: '日',
    avgLabel: '近14日均',
    changeLabel: '区间变化',
    countLabel: '打卡',
    boardHint: '左右滑动，逐日查看',
  },
  month: {
    tab: '月',
    avgLabel: '近12月均',
    changeLabel: '区间变化',
    countLabel: '有数据月',
    boardHint: '左右滑动，按月浏览',
  },
  year: {
    tab: '年',
    avgLabel: '年均重',
    changeLabel: '跨年变化',
    countLabel: '有数据年',
    boardHint: '左右滑动，按年对比',
  },
}

export function periodMeta(period: WeightPeriod) {
  return PERIOD_META[period]
}

export const PERIODS: WeightPeriod[] = ['day', 'month', 'year']

/** Compact series for the summary chart on the health page. */
export function buildWeightSeries(
  measurements: Measurement[],
  period: WeightPeriod,
): SeriesPoint[] {
  return buildSeries(measurements, period, { day: 14, month: 12, year: 0 })
}

/** Longer series for the interactive swipe board. */
export function buildBoardSeries(
  measurements: Measurement[],
  period: WeightPeriod,
): SeriesPoint[] {
  return buildSeries(measurements, period, { day: 90, month: 24, year: 0 })
}

export type { SeriesPoint as WeightSeriesPoint }

function buildSeries(
  measurements: Measurement[],
  period: WeightPeriod,
  window: { day: number; month: number; year: number },
): SeriesPoint[] {
  if (!measurements.length) return []

  const sorted = [...measurements].sort((a, b) =>
    a.lockedAt.localeCompare(b.lockedAt),
  )

  let raw: Omit<SeriesPoint, 'deltaKg'>[]
  switch (period) {
    case 'day':
      raw = aggregateDaily(sorted, window.day)
      break
    case 'month':
      raw = aggregateMonthly(sorted, window.month)
      break
    case 'year':
      raw = aggregateYearly(sorted)
      break
  }

  return withDeltas(raw)
}

function withDeltas(points: Omit<SeriesPoint, 'deltaKg'>[]): SeriesPoint[] {
  return points.map((p, i) => {
    if (i === 0) return { ...p, deltaKg: null }
    return {
      ...p,
      deltaKg: Number((p.weightKg - points[i - 1].weightKg).toFixed(2)),
    }
  })
}

function aggregateDaily(
  sorted: Measurement[],
  days: number,
): Omit<SeriesPoint, 'deltaKg'>[] {
  const byDay = new Map<string, Measurement>()
  for (const m of sorted) {
    const day = m.lockedAt.slice(0, 10)
    byDay.set(day, m)
  }

  const end = new Date()
  end.setHours(12, 0, 0, 0)
  const out: Omit<SeriesPoint, 'deltaKg'>[] = []
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const key = isoDate(d)
    const hit = byDay.get(key)
    if (!hit) continue
    out.push({
      key,
      date: key,
      weightKg: hit.weightKg,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      title: `${d.getMonth() + 1}月${d.getDate()}日 · 周${weekdays[d.getDay()]}`,
      count: 1,
    })
  }
  return out
}

function aggregateMonthly(
  sorted: Measurement[],
  months: number,
): Omit<SeriesPoint, 'deltaKg'>[] {
  const buckets = new Map<string, number[]>()
  for (const m of sorted) {
    const key = m.lockedAt.slice(0, 7)
    const list = buckets.get(key) ?? []
    list.push(m.weightKg)
    buckets.set(key, list)
  }

  const end = new Date()
  const out: Omit<SeriesPoint, 'deltaKg'>[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = buckets.get(key)
    if (!list?.length) continue
    const avg = list.reduce((s, v) => s + v, 0) / list.length
    out.push({
      key,
      date: key,
      weightKg: Number(avg.toFixed(2)),
      label: `${d.getMonth() + 1}月`,
      title: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      count: list.length,
    })
  }
  return out
}

function aggregateYearly(sorted: Measurement[]): Omit<SeriesPoint, 'deltaKg'>[] {
  const buckets = new Map<string, number[]>()
  for (const m of sorted) {
    const key = m.lockedAt.slice(0, 4)
    const list = buckets.get(key) ?? []
    list.push(m.weightKg)
    buckets.set(key, list)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const avg = list.reduce((s, v) => s + v, 0) / list.length
      return {
        key,
        date: key,
        weightKg: Number(avg.toFixed(2)),
        label: `${key}年`,
        title: `${key}年`,
        count: list.length,
      }
    })
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
