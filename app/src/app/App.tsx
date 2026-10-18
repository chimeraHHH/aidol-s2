import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from '@/app/providers/AppDataProvider'
import { ServicesProvider } from '@/app/providers/ServicesProvider'
import { AppRouter } from '@/app/router'
import { ensureWorkspaceMigrated } from '@/features/auth/accountWorkspace'
import { ensureFixedQiuqiuAccount } from '@/features/auth/fixedQiuqiuAccount'
import { ensurePresetDemoAccounts } from '@/features/settings/useUserAccount'
import { PhoneShell } from '@/shared/components/PhoneShell/PhoneShell'
import { useAppViewport } from '@/shared/hooks/useAppViewport'
import { useIsMobileApp } from '@/shared/hooks/useIsMobileApp'

// 启动时：工作区迁移 + 预存演示账号（部署后同样内置）+ 小林/秋秋素材
ensureWorkspaceMigrated()
ensurePresetDemoAccounts()
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
