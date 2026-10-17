import type {
  CatProfile,
  CompanionState,
  DeviceInfo,
  Measurement,
  TrendPoint,
} from '@/domain/types'
import { SIM_MEASUREMENTS } from '@/features/trends/data/kittenSim'

export const SEED_PROFILE: CatProfile = {
  id: 'cat-mimi',
  name: '咪酱',
  breed: '英短蓝猫',
  birthday: '2024-03-12',
  avatarTone: 'cream',
}

export const SEED_COMPANION: CompanionState = {
  mood: 'curious',
  energy: 78,
  level: 4,
  streakDays: 12,
  bond: 86,
  greeting: '窝里暖暖的，今天也来见面吧。',
  personaId: 'gentle',
}

export const SEED_DEVICE: DeviceInfo = {
  id: 'xiaomi-pod-01',
  name: '小咪',
  firmware: '0.9.2-mvp',
  connection: 'connected',
  batteryPercent: null,
  lastSeenAt: new Date().toISOString(),
}

/** From Excel sim (`public/data/kitten-weight-sim.xlsx` → JSON). Newest first. */
export const SEED_MEASUREMENTS: Measurement[] = SIM_MEASUREMENTS

export function toTrendPoints(items: Measurement[]): TrendPoint[] {
  return [...items]
    .sort((a, b) => a.lockedAt.localeCompare(b.lockedAt))
    .map((m) => ({
      date: m.lockedAt.slice(0, 10),
      weightKg: m.weightKg,
      deltaKg: m.deltaKg,
    }))
}

export const PERSONA_LINES: Record<CompanionState['personaId'], string[]> = {
  gentle: [
    '稳稳的，今天也好好见面了。',
    '轻轻落地就很棒，继续保持这份节奏。',
    '窝里等你，不催不催。',
  ],
  sassy: [
    '又来踩窝了？行，记上。',
    '晃完就走？至少别空着肚子。',
    '连续打卡不错，别飘。',
  ],
  cool: [
    '锁定完成。差值已写入。',
    '稳定窗通过，会话结束。',
    '数据已缓存，可离线查看。',
  ],
}
