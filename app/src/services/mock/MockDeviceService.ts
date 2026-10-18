import type { DeviceInfo, Measurement } from '@/domain/types'
import type { IDeviceService, WeighSessionCallbacks } from '@/services/interfaces/IDeviceService'
import { PERSONA_LINES, SEED_DEVICE } from '@/services/mock/seed'

function uid(): string {
  return `s-${Date.now().toString(36)}`
}

function sleep(ms: number, signal?: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const t = window.setTimeout(() => {
      if (!signal?.cancelled) resolve()
    }, ms)
    if (signal) {
      const check = window.setInterval(() => {
        if (signal.cancelled) {
          window.clearTimeout(t)
          window.clearInterval(check)
          resolve()
        }
      }, 40)
    }
  })
}

export class MockDeviceService implements IDeviceService {
  private device: DeviceInfo = { ...SEED_DEVICE }

  async getDevice(): Promise<DeviceInfo> {
    return { ...this.device }
  }

  async connect(): Promise<DeviceInfo> {
    this.device = {
      ...this.device,
      connection: 'connecting',
    }
    await sleep(900)
    this.device = {
      ...this.device,
      connection: 'connected',
      lastSeenAt: new Date().toISOString(),
    }
    return { ...this.device }
  }

  async disconnect(): Promise<void> {
    this.device = { ...this.device, connection: 'disconnected' }
  }

  subscribe(): () => void {
    return () => {}
  }

  async setMode(): Promise<DeviceInfo> {
    return { ...this.device }
  }

  startWeighSession(callbacks: WeighSessionCallbacks): () => void {
    const signal = { cancelled: false }
    const cancel = () => {
      signal.cancelled = true
    }

    void (async () => {
      try {
        if (this.device.connection !== 'connected') {
          callbacks.onPhase('connecting')
          await this.connect()
          if (signal.cancelled) return
        }

        callbacks.onPhase('waiting')
        await sleep(1200, signal)
        if (signal.cancelled) return

        callbacks.onPhase('fluctuating')
        const base = 4.38 + Math.random() * 0.12
        for (let i = 0; i < 8; i += 1) {
          if (signal.cancelled) return
          const jitter = (Math.random() - 0.5) * 0.08
          callbacks.onLiveWeight?.(Number((base + jitter).toFixed(2)))
          await sleep(220, signal)
        }

        if (signal.cancelled) return
        const weightKg = Number(base.toFixed(2))
        const prev = 4.45
        const measurement: Measurement = {
          sessionId: uid(),
          weightKg,
          deltaKg: Number((weightKg - prev).toFixed(2)),
          lockedAt: new Date().toISOString(),
          source: 'mock',
        }

        callbacks.onPhase('locked')
        callbacks.onLocked(measurement)
        await sleep(600, signal)
        if (signal.cancelled) return

        callbacks.onPhase('ai')
        const lines = PERSONA_LINES.gentle
        callbacks.onAiLine?.(lines[Math.floor(Math.random() * lines.length)]!)
        await sleep(900, signal)
        if (signal.cancelled) return

        callbacks.onPhase('done')
      } catch {
        callbacks.onError?.('称重会话中断，请重试')
      }
    })()

    return cancel
  }
}
