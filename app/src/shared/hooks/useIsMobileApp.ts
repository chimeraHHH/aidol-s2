import { useEffect, useState } from 'react'

function detectMobile(breakpoint: number): boolean {
  if (typeof window === 'undefined') return false
  const narrow = window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  // 触屏窄屏 / 独立 PWA：一律全屏 App，不套桌面手机框
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return narrow || (coarse && window.innerWidth <= breakpoint + 80) || standalone
}

/** True when viewport should render full-bleed app (no desktop phone chrome). */
export function useIsMobileApp(breakpoint = 720): boolean {
  const [isMobile, setIsMobile] = useState(() => detectMobile(breakpoint))

  useEffect(() => {
    const mqWidth = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const onChange = () => setIsMobile(detectMobile(breakpoint))
    onChange()
    mqWidth.addEventListener('change', onChange)
    mqCoarse.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)
    return () => {
      mqWidth.removeEventListener('change', onChange)
      mqCoarse.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [breakpoint])

  return isMobile
}
