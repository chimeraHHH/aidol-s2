import { useEffect } from 'react'

/**
 * 真机适配：
 * - 同步 data-shell 到 <html>，驱动 safe-area token
 * - 用 visualViewport 修正 iOS 地址栏伸缩导致的 100vh 错位
 */
export function useAppViewport(isMobile: boolean) {
  useEffect(() => {
    document.documentElement.dataset.shell = isMobile ? 'mobile' : 'desktop'
    return () => {
      delete document.documentElement.dataset.shell
    }
  }, [isMobile])

  useEffect(() => {
    if (!isMobile) {
      document.documentElement.style.removeProperty('--app-vh')
      return
    }

    const root = document.documentElement

    const apply = () => {
      const vv = window.visualViewport
      const h = vv?.height ?? window.innerHeight
      root.style.setProperty('--app-vh', `${Math.round(h)}px`)
    }

    apply()
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)

    return () => {
      window.visualViewport?.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      root.style.removeProperty('--app-vh')
    }
  }, [isMobile])
}
