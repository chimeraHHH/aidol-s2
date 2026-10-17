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
  connectDevice: () => Promise<void>
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
    const d = await device.connect()
    setDeviceInfo(d)
  }, [device])

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
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
