import type { CatProfile, CompanionState, Measurement, TrendPoint } from '@/domain/types'

export interface ICatRepository {
  getProfile(): Promise<CatProfile>
  getCompanion(): Promise<CompanionState>
  updateCompanion(patch: Partial<CompanionState>): Promise<CompanionState>
  listMeasurements(): Promise<Measurement[]>
  addMeasurement(m: Measurement): Promise<void>
  getTrend(days?: number): Promise<TrendPoint[]>
}
