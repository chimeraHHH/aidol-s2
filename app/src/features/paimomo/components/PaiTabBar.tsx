import { NavLink } from 'react-router-dom'
import styles from './PaiTabBar.module.scss'

const TABS = [
  { to: '/paimomo', end: true, label: '宠窝', icon: HomeIcon },
  { to: '/paimomo/ai', end: false, label: 'AI', icon: AiIcon },
  { to: '/paimomo/me', end: false, label: '宠主', icon: UserIcon },
] as const

export function PaiTabBar() {
  return (
    <nav className={styles.bar} aria-label="缦宠导航">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.active}` : ''}`}
        >
          <span className={styles.icon}>
            <tab.icon />
          </span>
        </NavLink>
      ))}
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">
        AI
      </text>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c1.3-2.5 3.6-3.8 6.5-3.8s5.2 1.3 6.5 3.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
