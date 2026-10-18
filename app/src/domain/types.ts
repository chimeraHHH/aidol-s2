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
  /** ble：预留 BLE；serial：小咪实物（JDY-31 蓝牙串口）；mock：演示 / 模拟 */
  source: 'ble' | 'serial' | 'mock'
}

/** 设备接入方式：serial = 实物小咪（蓝牙串口 / Web Serial）；demo = 演示模式（模拟秤数据流） */
export type DeviceMode = 'serial' | 'demo'

/** 秤推送上来的最新一帧读数（已换算成 kg，原始字段透传便于排查） */
export interface LiveScaleReading {
  weightKg: number | null
  rawWeight: string | null
  rawUnit: string
  /** 固件附带的距离 / 身高（米），猫窝场景仅透传 */
  heightM: number | null
  /** 固件按人体公式算的 BMI 原始值，不用于猫咪健康判断 */
  bmiRaw: string | null
  at: string
}

export interface DeviceInfo {
  id: string
  name: string
  firmware: string
  connection: DeviceConnectionState
  batteryPercent: number | null
  lastSeenAt: string | null
  /** 以下为串口接入新增的可选字段，旧的 Mock 实现可以不填 */
  mode?: DeviceMode
  /** 连接方式说明，例如「蓝牙串口 · 9600」「演示模式」 */
  transportLabel?: string
  /** 最近一次连接 / 接收错误（给用户看的中文） */
  lastError?: string | null
  /** 当前浏览器不能连接实物秤的原因；null 表示可以 */
  supportProblem?: string | null
  liveReading?: LiveScaleReading | null
  /** 本次连接累计接收字节数 */
  rxBytes?: number
}

export interface TrendPoint {
  date: string
  weightKg: number
  deltaKg: number | null
}
