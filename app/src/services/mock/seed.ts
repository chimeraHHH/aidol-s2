import type {
  CatProfile,
  CompanionState,
  DeviceInfo,
  Measurement,
  TrendPoint,
} from '@/domain/types'

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

const today = new Date()

function daysAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/** Synthetic but realistic cat weight series (~4.2–4.6 kg). */
export const SEED_MEASUREMENTS: Measurement[] = [
  { sessionId: 's12', weightKg: 4.42, deltaKg: -0.03, lockedAt: daysAgo(0), source: 'mock' },
  { sessionId: 's11', weightKg: 4.45, deltaKg: 0.02, lockedAt: daysAgo(1), source: 'mock' },
  { sessionId: 's10', weightKg: 4.43, deltaKg: -0.05, lockedAt: daysAgo(2), source: 'mock' },
  { sessionId: 's09', weightKg: 4.48, deltaKg: 0.04, lockedAt: daysAgo(3), source: 'mock' },
  { sessionId: 's08', weightKg: 4.44, deltaKg: -0.01, lockedAt: daysAgo(4), source: 'mock' },
  { sessionId: 's07', weightKg: 4.45, deltaKg: 0.06, lockedAt: daysAgo(5), source: 'mock' },
  { sessionId: 's06', weightKg: 4.39, deltaKg: -0.02, lockedAt: daysAgo(6), source: 'mock' },
  { sessionId: 's05', weightKg: 4.41, deltaKg: 0.01, lockedAt: daysAgo(8), source: 'mock' },
  { sessionId: 's04', weightKg: 4.4, deltaKg: -0.04, lockedAt: daysAgo(9), source: 'mock' },
  { sessionId: 's03', weightKg: 4.44, deltaKg: 0.03, lockedAt: daysAgo(11), source: 'mock' },
  { sessionId: 's02', weightKg: 4.41, deltaKg: null, lockedAt: daysAgo(13), source: 'mock' },
]

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
