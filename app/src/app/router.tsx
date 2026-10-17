import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/features/layout/AppLayout'
import { HomePage } from '@/features/home/HomePage'
import { Home1Page } from '@/features/home1/Home1Page'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { TrendsPage } from '@/features/trends/TrendsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WeighPage } from '@/features/weigh/WeighPage'
import { StatusBar } from '@/shared/components/StatusBar/StatusBar'
import { PaiNotificationsPage } from '@/features/paimomo/notifications/PaiNotificationsPage'
import { PaiComposePage } from '@/features/paimomo/compose/PaiComposePage'
import { PaiSearchPage } from '@/features/paimomo/search/PaiSearchPage'

function SubFlow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <StatusBar />
      {children}
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="home1" element={<Home1Page />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="trends" element={<TrendsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="companion" element={<Navigate to="/" replace />} />
      <Route path="paimomo/*" element={<Navigate to="/home1" replace />} />

      <Route path="notifications" element={<SubFlow><PaiNotificationsPage /></SubFlow>} />
      <Route path="compose" element={<SubFlow><PaiComposePage /></SubFlow>} />
      <Route path="search" element={<SubFlow><PaiSearchPage /></SubFlow>} />

      <Route path="weigh" element={<WeighPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
