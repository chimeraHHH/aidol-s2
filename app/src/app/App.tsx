import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from '@/app/providers/AppDataProvider'
import { ServicesProvider } from '@/app/providers/ServicesProvider'
import { AppRouter } from '@/app/router'
import { PhoneShell } from '@/shared/components/PhoneShell/PhoneShell'
import { useIsMobileApp } from '@/shared/hooks/useIsMobileApp'

export function App() {
  const isMobile = useIsMobileApp()

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
                <strong>小咪</strong>
                <span>AI 猫窝体重秤 · iPhone 17 Pro Max</span>
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
