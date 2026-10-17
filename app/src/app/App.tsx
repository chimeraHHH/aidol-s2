import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from '@/app/providers/AppDataProvider'
import { ServicesProvider } from '@/app/providers/ServicesProvider'
import { AppRouter } from '@/app/router'
import { ensureWorkspaceMigrated } from '@/features/auth/accountWorkspace'
import { PhoneShell } from '@/shared/components/PhoneShell/PhoneShell'
import { useAppViewport } from '@/shared/hooks/useAppViewport'
import { useIsMobileApp } from '@/shared/hooks/useIsMobileApp'

// 启动时：全局猫咪数据按账号拆分；Daisy 保留自定义，其余账号回默认
ensureWorkspaceMigrated()

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
