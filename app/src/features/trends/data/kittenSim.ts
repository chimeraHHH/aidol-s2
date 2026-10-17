import type { Measurement } from '@/domain/types'
import type { SeriesPoint, WeightPeriod } from '../weightSeries'
import raw from './kittenWeightSim.json'

export interface KittenSimAnalysis {
  catName: string
  breed: string
  birthday: string
  generatedAt: string
  idealRange: { min: number; max: number }
  latest: {
    date: string
    weightKg: number
    deltaKg: number | null
    inIdeal: boolean
  }
  stats: {
    totalRecords: number
    avgAllKg: number
    avg14dKg: number
    avg30dKg: number
    minKg: number
    maxKg: number
    weekDeltaKg: number
    monthDeltaKg: number
    volatility60d: number
    adultInIdealRatio: number | null
    monthBuckets: number
    yearBuckets: number
  }
  score: number
  grade: string
  insight: string
  highlights: string[]
}

interface SimPoint {
  date: string
  weightKg: number
  deltaKg: number | null
  label: string
  title: string
  count: number
  inIdeal?: boolean
  note?: string
  minKg?: number
  maxKg?: number
  inIdealRatio?: number
  growthKg?: number
}

interface KittenSimFile {
  meta: {
    sourceFile: string
    catName: string
    breed: string
    birthday: string
    idealRange: { min: number; max: number }
  }
  analysis: KittenSimAnalysis
  daily: SimPoint[]
  monthly: SimPoint[]
  yearly: SimPoint[]
  measurements: Measurement[]
}

const data = raw as KittenSimFile

export const kittenSim = data
export const SIM_MEASUREMENTS: Measurement[] = data.measurements
export const SIM_ANALYSIS: KittenSimAnalysis = data.analysis
export const SIM_IDEAL = data.meta.idealRange
export const SIM_XLSX_URL = `/data/${data.meta.sourceFile}`

export function simSeries(period: WeightPeriod): SeriesPoint[] {
  const src =
    period === 'day' ? data.daily : period === 'month' ? data.monthly : data.yearly
  return src.map((p) => ({
    key: p.date,
    date: p.date,
    weightKg: p.weightKg,
    label: p.label,
    title: p.title,
    count: p.count,
    deltaKg: p.deltaKg,
  }))
}

/** Longer board windows: full history for month/year; last 90 days for day. */
export function simBoardSeries(period: WeightPeriod): SeriesPoint[] {
  const all = simSeries(period)
  if (period === 'day') return all.slice(-90)
  return all
}
