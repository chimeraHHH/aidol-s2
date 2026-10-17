/** Shared domain types — keep hardware/BLE-facing shapes here. */

export type DeviceConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error'

export type WeighPhase =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'fluctuating'
  | 'locked'
  | 'ai'
  | 'done'

export type CompanionMood = 'calm' | 'curious' | 'sleepy' | 'playful' | 'hungry'

export type PersonaId = 'gentle' | 'sassy' | 'cool'

export interface CatProfile {
  id: string
  name: string
  breed: string
  birthday: string
  avatarTone: 'cream' | 'orange' | 'gray'
}

export interface CompanionState {
  mood: CompanionMood
  energy: number
  level: number
  streakDays: number
  bond: number
  greeting: string
  personaId: PersonaId
}

export interface Measurement {
  sessionId: string
  weightKg: number
  deltaKg: number | null
  lockedAt: string
  source: 'ble' | 'mock'
}

export interface DeviceInfo {
  id: string
  name: string
  firmware: string
  connection: DeviceConnectionState
  batteryPercent: number | null
  lastSeenAt: string | null
}

export interface TrendPoint {
  date: string
  weightKg: number
  deltaKg: number | null
}
