import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createServices, type AppServices } from '@/services/createServices'

const ServicesContext = createContext<AppServices | null>(null)

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createServices(), [])
  return (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  )
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used within ServicesProvider')
  return ctx
}
