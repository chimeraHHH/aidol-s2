import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from '@/app/providers/AppDataProvider'
import { ServicesProvider } from '@/app/providers/ServicesProvider'
import { AppRouter } from '@/app/router'
import { ensureWorkspaceMigrated } from '@/features/auth/accountWorkspace'
import { ensureFixedQiuqiuAccount } from '@/features/auth/fixedQiuqiuAccount'
import { PhoneShell } from '@/shared/components/PhoneShell/PhoneShell'
import { useAppViewport } from '@/shared/hooks/useAppViewport'
import { useIsMobileApp } from '@/shared/hooks/useIsMobileApp'

// 启动时：按账号拆分工作区，并确保固定账号「小林 / 秋秋」可用
ensureWorkspaceMigrated()
ensureFixedQiuqiuAccount()

export function App() {
  const isMobile = useIsMobileApp()
  useAppViewport(isMobile)

  return (
    <ServicesProvider>
      <AppDataProvider>
        <BrowserRouter>
          {isMobile ? (
            <div className="mobile-stage">
              <PhoneShell framed={false}>
                <AppRouter />
              </PhoneShell>
            </div>
          ) : (
            <div className="desktop-stage">
              <div className="desktop-caption">
                <strong>窝知</strong>
                <span>AI 猫窝陪伴 · iPhone 17 Pro Max</span>
              </div>
              <PhoneShell framed>
                <AppRouter />
              </PhoneShell>
            </div>
          )}
        </BrowserRouter>
      </AppDataProvider>
    </ServicesProvider>
  )
}
