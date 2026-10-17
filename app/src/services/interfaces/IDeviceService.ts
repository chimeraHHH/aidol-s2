import type { DeviceInfo, Measurement, WeighPhase } from '@/domain/types'

export interface WeighSessionCallbacks {
  onPhase: (phase: WeighPhase) => void
  onLiveWeight?: (kg: number) => void
  onLocked: (measurement: Measurement) => void
  onAiLine?: (line: string) => void
  onError?: (message: string) => void
}

/**
 * Hardware boundary. Swap MockDeviceService → BleDeviceService later
 * without touching UI features.
 */
export interface IDeviceService {
  getDevice(): Promise<DeviceInfo>
  connect(): Promise<DeviceInfo>
  disconnect(): Promise<void>
  startWeighSession(callbacks: WeighSessionCallbacks): () => void
}
