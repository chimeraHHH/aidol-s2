import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CatProfile,
  CompanionState,
  DeviceInfo,
  DeviceMode,
  Measurement,
  TrendPoint,
} from '@/domain/types'
import { useServices } from '@/app/providers/ServicesProvider'

interface AppDataValue {
  ready: boolean
  profile: CatProfile | null
  companion: CompanionState | null
  device: DeviceInfo | null
  measurements: Measurement[]
  trend: TrendPoint[]
  refresh: () => Promise<void>
  setCompanion: (patch: Partial<CompanionState>) => Promise<void>
  recordMeasurement: (m: Measurement) => Promise<void>
  /** 连接小咪；实物模式下必须由按钮点击触发（会弹出 Chrome 设备选择器） */
  connectDevice: () => Promise<void>
  disconnectDevice: () => Promise<void>
  setDeviceMode: (mode: DeviceMode) => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { cat, device } = useServices()
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<CatProfile | null>(null)
  const [companion, setCompanionState] = useState<CompanionState | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])

  const refresh = useCallback(async () => {
    const [p, c, d, list, t] = await Promise.all([
      cat.getProfile(),
      cat.getCompanion(),
      device.getDevice(),
      cat.listMeasurements(),
      cat.getTrend(14),
    ])
    setProfile(p)
    setCompanionState(c)
    setDeviceInfo(d)
    setMeasurements(list)
    setTrend(t)
    setReady(true)
  }, [cat, device])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 切换账号后重新拉取该用户独立档案 / 测量 / 陪伴状态
  useEffect(() => {
    const onAccount = () => {
      void refresh()
    }
    window.addEventListener('xm:user-account-changed', onAccount)
    window.addEventListener('xm:workspace-migrated', onAccount)
    return () => {
      window.removeEventListener('xm:user-account-changed', onAccount)
      window.removeEventListener('xm:workspace-migrated', onAccount)
    }
  }, [refresh])

  // 设备状态、实时读数由设备服务推送
  useEffect(() => device.subscribe(setDeviceInfo), [device])

  const setCompanion = useCallback(
    async (patch: Partial<CompanionState>) => {
      const next = await cat.updateCompanion(patch)
      setCompanionState(next)
    },
    [cat],
  )

  const recordMeasurement = useCallback(
    async (m: Measurement) => {
      await cat.addMeasurement(m)
      await refresh()
    },
    [cat, refresh],
  )

  const connectDevice = useCallback(async () => {
    try {
      const d = await device.connect({ interactive: true })
      setDeviceInfo(d)
    } catch {
      // 错误信息已写进 device.lastError，由订阅推送到界面
      setDeviceInfo(await device.getDevice())
    }
  }, [device])

  const disconnectDevice = useCallback(async () => {
    await device.disconnect()
    setDeviceInfo(await device.getDevice())
  }, [device])

  const setDeviceMode = useCallback(
    async (mode: DeviceMode) => {
      setDeviceInfo(await device.setMode(mode))
    },
    [device],
  )

  const value = useMemo<AppDataValue>(
    () => ({
      ready,
      profile,
      companion,
      device: deviceInfo,
      measurements,
      trend,
      refresh,
      setCompanion,
      recordMeasurement,
      connectDevice,
      disconnectDevice,
      setDeviceMode,
    }),
    [
      ready,
      profile,
      companion,
      deviceInfo,
      measurements,
      trend,
      refresh,
      setCompanion,
      recordMeasurement,
      connectDevice,
      disconnectDevice,
      setDeviceMode,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
