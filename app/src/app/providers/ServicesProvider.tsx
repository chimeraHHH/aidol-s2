import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createServices, type AppServices } from '@/services/createServices'

const ServicesContext = createContext<AppServices | null>(null)

// 设备服务持有串口 / 定时器，整个页面只创建一次（StrictMode 下 useMemo 会执行两次）
let sharedServices: AppServices | null = null

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => (sharedServices ??= createServices()), [])
  return (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  )
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used within ServicesProvider')
  return ctx
}
