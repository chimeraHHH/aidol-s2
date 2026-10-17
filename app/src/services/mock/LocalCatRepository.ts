import type {
  CatProfile,
  CompanionState,
  Measurement,
  TrendPoint,
} from '@/domain/types'
import type { ICatRepository } from '@/services/interfaces/ICatRepository'
import {
  SEED_COMPANION,
  SEED_MEASUREMENTS,
  SEED_PROFILE,
  toTrendPoints,
} from '@/services/mock/seed'

/** Bump when seed shape changes so local demos pick up Excel sim history. */
const KEY = 'xiaomi.cat.store.v3'

interface StoreShape {
  profile: CatProfile
  companion: CompanionState
  measurements: Measurement[]
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as StoreShape
  } catch {
    /* ignore corrupt store */
  }
  return {
    profile: SEED_PROFILE,
    companion: SEED_COMPANION,
    measurements: SEED_MEASUREMENTS,
  }
}

function save(store: StoreShape) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export class LocalCatRepository implements ICatRepository {
  private store: StoreShape = load()

  async getProfile(): Promise<CatProfile> {
    return { ...this.store.profile }
  }

  async getCompanion(): Promise<CompanionState> {
    return { ...this.store.companion }
  }

  async updateCompanion(patch: Partial<CompanionState>): Promise<CompanionState> {
    this.store.companion = { ...this.store.companion, ...patch }
    save(this.store)
    return { ...this.store.companion }
  }

  async listMeasurements(): Promise<Measurement[]> {
    return [...this.store.measurements].sort((a, b) =>
      b.lockedAt.localeCompare(a.lockedAt),
    )
  }

  async addMeasurement(m: Measurement): Promise<void> {
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
    save(this.store)
  }

  async getTrend(days = 14): Promise<TrendPoint[]> {
    const points = toTrendPoints(this.store.measurements)
    return points.slice(-days)
  }
}
