import type { DeviceInfo, DeviceMode, Measurement, PersonaId, WeighPhase } from '@/domain/types'

export interface WeighSessionCallbacks {
  onPhase: (phase: WeighPhase) => void
  onLiveWeight?: (kg: number) => void
  onLocked: (measurement: Measurement) => void
  onAiLine?: (line: string) => void
  onError?: (message: string) => void
  /** 非致命提示（例如读数超出范围），null 表示清除提示 */
  onNotice?: (message: string | null) => void
}

export interface WeighSessionOptions {
  /** 上一次体重，用来算差值 */
  previousKg?: number | null
  personaId?: PersonaId
}

export interface ConnectOptions {
  /**
   * true：允许弹出浏览器设备选择器（必须由用户点击触发）。
   * false：只尝试静默重连已授权过的设备。默认 true。
   */
  interactive?: boolean
}

/**
 * Hardware boundary. UI features only talk to this interface.
 * 实现：ScaleDeviceService（实物 Web Serial + 演示数据流）、MockDeviceService（旧版纯模拟）。
 */
export interface IDeviceService {
  getDevice(): Promise<DeviceInfo>
  connect(options?: ConnectOptions): Promise<DeviceInfo>
  disconnect(): Promise<void>
  startWeighSession(callbacks: WeighSessionCallbacks, options?: WeighSessionOptions): () => void
  /** 设备状态 / 实时读数变化时回调，返回取消订阅函数 */
  subscribe(listener: (device: DeviceInfo) => void): () => void
  /** 切换实物 / 演示模式（会先断开当前连接） */
  setMode(mode: DeviceMode): Promise<DeviceInfo>
}
