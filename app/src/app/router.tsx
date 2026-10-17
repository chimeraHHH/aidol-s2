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
import { PaiLayout } from '@/features/paimomo/layout/PaiLayout'
import { PaiHomePage } from '@/features/paimomo/home/PaiHomePage'
import { PaiAiPage } from '@/features/paimomo/ai/PaiAiPage'
import { PaiProfilePage } from '@/features/paimomo/profile/PaiProfilePage'
import { PaiSplashPage } from '@/features/paimomo/splash/PaiSplashPage'
import { PaiLoginPage } from '@/features/paimomo/login/PaiLoginPage'
import { PaiWelcomePage } from '@/features/paimomo/welcome/PaiWelcomePage'
import { PaiPetFormPage } from '@/features/paimomo/pet-form/PaiPetFormPage'
import { PaiPetImagePage } from '@/features/paimomo/pet-image/PaiPetImagePage'
import { PaiGeneratingPage } from '@/features/paimomo/generating/PaiGeneratingPage'
import { PaiHealthPage } from '@/features/paimomo/health/PaiHealthPage'
import { PaiAnimationPage } from '@/features/paimomo/animation/PaiAnimationPage'
import '@/features/paimomo/styles/paimomo.scss'

function PaiFlow({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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

      {/* 缦宠 / PaiMomo — 视频内容，独立 Tab，不改原四页 */}
      <Route path="paimomo" element={<PaiLayout />}>
        <Route index element={<PaiHomePage />} />
        <Route path="ai" element={<PaiAiPage />} />
        <Route path="me" element={<PaiProfilePage />} />
      </Route>

      <Route path="paimomo/discover" element={<Navigate to="/discover" replace />} />

      <Route path="paimomo/splash" element={<PaiFlow><PaiSplashPage /></PaiFlow>} />
      <Route path="paimomo/login" element={<PaiFlow><PaiLoginPage /></PaiFlow>} />
      <Route path="paimomo/welcome" element={<PaiFlow><PaiWelcomePage /></PaiFlow>} />
      <Route path="paimomo/pet-form" element={<PaiFlow><PaiPetFormPage /></PaiFlow>} />
      <Route path="paimomo/pet-image" element={<PaiFlow><PaiPetImagePage /></PaiFlow>} />
      <Route path="paimomo/generating" element={<PaiFlow><PaiGeneratingPage /></PaiFlow>} />
      <Route path="paimomo/health" element={<PaiFlow><PaiHealthPage /></PaiFlow>} />
      <Route path="paimomo/animation" element={<PaiFlow><PaiAnimationPage /></PaiFlow>} />

      <Route path="weigh" element={<WeighPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
