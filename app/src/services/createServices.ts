import type { ICatRepository } from '@/services/interfaces/ICatRepository'
import type { IDeviceService } from '@/services/interfaces/IDeviceService'
import { LocalCatRepository } from '@/services/mock/LocalCatRepository'
import { PERSONA_LINES, SEED_DEVICE } from '@/services/mock/seed'
import { ScaleDeviceService } from '@/services/serial/ScaleDeviceService'

export interface AppServices {
  device: IDeviceService
  cat: ICatRepository
}

/**
 * Composition root — swap implementations here.
 * device：ScaleDeviceService——实物优先走本机原生桥接（PhysicalScaleReader → SSE），
 * 其次 Chrome Web Serial；没有硬件时切「演示模式」。
 * 旧的纯模拟实现仍保留在 MockDeviceService。
 */
export function createServices(): AppServices {
  return {
    device: new ScaleDeviceService({
      baseDevice: SEED_DEVICE,
      pickAiLine: (persona) => {
        const lines = PERSONA_LINES[persona] ?? PERSONA_LINES.gentle
        return lines[Math.floor(Math.random() * lines.length)]!
      },
    }),
    cat: new LocalCatRepository(),
  }
}
