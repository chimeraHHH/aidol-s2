import { NavLink } from 'react-router-dom'
import styles from './TabBar.module.scss'

const TABS = [
  { to: '/', label: '首页', end: true, icon: HomeIcon },
  { to: '/home1', label: '首页1', end: false, icon: Home1Icon },
  { to: '/trends', label: '趋势', end: false, icon: TrendsIcon },
  { to: '/companion', label: '陪伴', end: false, icon: CompanionIcon },
  { to: '/settings', label: '我的', end: false, icon: SettingsIcon },
  // 视频 APP 入口（点进后用缦宠自己的悬浮 Tab）
  { to: '/paimomo', label: '缦宠', end: false, icon: PaiIcon },
] as const

export function TabBar() {
  return (
    <nav className={styles.bar} aria-label="主导航">
      <div className={styles.scroller}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}${
                tab.to === '/paimomo' ? ` ${styles.paiEntry}` : ''
              }${tab.to === '/home1' ? ` ${styles.home1Entry}` : ''}`
            }
          >
            <span className={styles.icon}>
              <tab.icon />
            </span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Home1Icon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 14.5c1.2 1.2 2.8 1.8 4 1.8s2.8-.6 4-1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="11" r="1" fill="currentColor" />
      <circle cx="14.5" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}

function TrendsIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V11M10 18V7M15 18v-5M20 18V9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function CompanionIcon() {
  return (
    <svg className={`${styles.svg} ${styles.companionSvg}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className={styles.companionDisc} cx="12" cy="12" r="9.5" />
      <path
        className={styles.companionOutline}
        d="M5.5 14.2c0-3.5 2.9-6.4 6.5-6.4s6.5 2.9 6.5 6.4c0 1.2-.4 2.3-1 3.2L19 20.5l-2.9-1c-1 .5-2.2.7-3.4.7-3.6 0-6.5-2.8-6.5-6Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <circle className={styles.companionEye} cx="9.7" cy="13.2" r="0.95" fill="currentColor" />
      <circle className={styles.companionEye} cx="14.3" cy="13.2" r="0.95" fill="currentColor" />
      <path
        className={styles.companionSmile}
        d="M9.3 15.2c.5.7 1.4 1.15 2.7 1.15s2.2-.45 2.7-1.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.5c1.4-2.6 3.8-4 7-4s5.6 1.4 7 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PaiIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8 13.2c.8 1.4 2.2 2.2 4 2.2s3.2-.8 4-2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="10.8" r="1" fill="currentColor" />
      <circle cx="14.5" cy="10.8" r="1" fill="currentColor" />
    </svg>
  )
}
