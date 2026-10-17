import type {
  CatProfile,
  CompanionState,
  Measurement,
  TrendPoint,
} from '@/domain/types'
import type { ICatRepository } from '@/services/interfaces/ICatRepository'
import {
  getActiveUserId,
  readCatStoreForUser,
  writeCatStoreForUser,
  type CatStoreShape,
} from '@/features/auth/accountWorkspace'
import { toTrendPoints } from '@/services/mock/seed'

export class LocalCatRepository implements ICatRepository {
  private store: CatStoreShape = readCatStoreForUser(getActiveUserId())
  private boundUserId = getActiveUserId()

  /** 多实例 / 切换账号后与当前用户 localStorage 对齐 */
  private hydrate() {
    const userId = getActiveUserId()
    this.boundUserId = userId
    this.store = readCatStoreForUser(userId)
  }

  private persist() {
    writeCatStoreForUser(this.boundUserId || getActiveUserId(), this.store)
  }

  async getProfile(): Promise<CatProfile> {
    this.hydrate()
    return { ...this.store.profile }
  }

  async updateProfile(patch: Partial<CatProfile>): Promise<CatProfile> {
    this.hydrate()
    this.store.profile = { ...this.store.profile, ...patch, id: this.store.profile.id }
    this.persist()
    return { ...this.store.profile }
  }

  async getCompanion(): Promise<CompanionState> {
    this.hydrate()
    return { ...this.store.companion }
  }

  async updateCompanion(patch: Partial<CompanionState>): Promise<CompanionState> {
    this.hydrate()
    this.store.companion = { ...this.store.companion, ...patch }
    this.persist()
    return { ...this.store.companion }
  }

  async listMeasurements(): Promise<Measurement[]> {
    this.hydrate()
    return [...this.store.measurements].sort((a, b) =>
      b.lockedAt.localeCompare(a.lockedAt),
    )
  }

  async addMeasurement(m: Measurement): Promise<void> {
    this.hydrate()
    this.store.measurements = [
      m,
      ...this.store.measurements.filter((x) => x.sessionId !== m.sessionId),
    ]
    this.store.companion = {
      ...this.store.companion,
      streakDays: this.store.companion.streakDays + 1,
      bond: Math.min(100, this.store.companion.bond + 1),
      energy: Math.min(100, this.store.companion.energy + 3),
    }
    this.persist()
  }

  async getTrend(days = 14): Promise<TrendPoint[]> {
    this.hydrate()
    const points = toTrendPoints(this.store.measurements)
    return points.slice(-days)
  }
}
