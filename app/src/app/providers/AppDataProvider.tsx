import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { StabilityDetector } from '@/services/serial/scaleProtocol'

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

  // 实物秤稳定读数 → 写入测量记录（同步到健康页体重看板）
  // 空窝 / 0kg / 不足 5kg 不落库，避免污染看板
  const HEALTH_BOARD_MIN_KG = 5
  const syncDetectorRef = useRef(
    new StabilityDetector({ minKg: HEALTH_BOARD_MIN_KG, maxKg: 30, windowSize: 3, toleranceKg: 0.1 }),
  )
  const lastSyncedKgRef = useRef<number | null>(null)
  const syncingRef = useRef(false)
  useEffect(() => {
    if (deviceInfo?.mode !== 'serial' || deviceInfo.connection !== 'connected') {
      syncDetectorRef.current.reset()
      return
    }
    const kg = deviceInfo.liveReading?.weightKg ?? null
    const st = syncDetectorRef.current.push(kg)
    if (st.kind !== 'stable') return
    if (st.kg < HEALTH_BOARD_MIN_KG) return
    if (lastSyncedKgRef.current != null && Math.abs(lastSyncedKgRef.current - st.kg) < 0.05) {
      return
    }
    if (syncingRef.current) return
    syncingRef.current = true
    const prev = measurements[0]?.weightKg ?? null
    const m: Measurement = {
      sessionId: `bridge-${Date.now().toString(36)}`,
      weightKg: st.kg,
      deltaKg: prev == null ? null : Number((st.kg - prev).toFixed(2)),
      lockedAt: new Date().toISOString(),
      source: 'serial',
    }
    void cat
      .addMeasurement(m)
      .then(() => refresh())
      .finally(() => {
        lastSyncedKgRef.current = st.kg
        syncingRef.current = false
      })
  }, [
    cat,
    deviceInfo?.connection,
    deviceInfo?.liveReading?.weightKg,
    deviceInfo?.liveReading?.at,
    deviceInfo?.mode,
    measurements,
    refresh,
  ])

  const setCompanion = useCallback(
    async (patch: Partial<CompanionState>) => {
      const next = await cat.updateCompanion(patch)
      setCompanionState(next)
    },
    [cat],
  )

  const recordMeasurement = useCallback(
    async (m: Measurement) => {
      // 健康页看板：0 / 低于 5kg 一律不记录
      if (!(m.weightKg >= HEALTH_BOARD_MIN_KG)) return
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
