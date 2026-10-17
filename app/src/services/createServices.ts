import type { ICatRepository } from '@/services/interfaces/ICatRepository'
import type { IDeviceService } from '@/services/interfaces/IDeviceService'
import { LocalCatRepository } from '@/services/mock/LocalCatRepository'
import { MockDeviceService } from '@/services/mock/MockDeviceService'

export interface AppServices {
  device: IDeviceService
  cat: ICatRepository
}

/** Composition root — swap implementations here for production BLE/API. */
export function createServices(): AppServices {
  return {
    device: new MockDeviceService(),
    cat: new LocalCatRepository(),
  }
}
