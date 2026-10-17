import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthSession } from './useAuthSession'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuthSession()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
