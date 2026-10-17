import { useEffect, useState } from 'react'
import styles from './StatusBar.module.scss'

export function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatTime(new Date())), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.bar} data-status-bar aria-hidden>
      <span className={styles.left}>
        <span className={styles.time}>{time}</span>
        <SilentIcon />
      </span>
      <span className={styles.icons}>
        <SignalIcon />
        <span className={styles.network}>5G</span>
        <BatteryIcon level={0.55} />
      </span>
    </div>
  )
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function SilentIcon() {
  return (
    <svg className={styles.silent} viewBox="0 0 16 16" fill="none">
      <path
        d="M5.1 6.2A3.5 3.5 0 0 1 11.8 8v2.15l.85 1.15H4.25L5.1 10.15V8c0-.65.15-1.25.4-1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M7.1 13a1.2 1.2 0 0 0 1.8 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M3.1 3.15l9.8 9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg className={styles.signal} viewBox="0 0 18 12" fill="currentColor">
      <rect x="1" y="8" width="2.4" height="3.2" rx="0.7" />
      <rect x="5.2" y="5.6" width="2.4" height="5.6" rx="0.7" />
      <rect x="9.4" y="3.2" width="2.4" height="8" rx="0.7" opacity="0.28" />
      <rect x="13.6" y="0.8" width="2.4" height="10.4" rx="0.7" opacity="0.28" />
    </svg>
  )
}

function BatteryIcon({ level }: { level: number }) {
  const clamped = Math.min(1, Math.max(0.08, level))
  const fillW = 16.2 * clamped

  return (
    <svg className={styles.battery} viewBox="0 0 27 13" fill="none">
      <rect
        x="0.75"
        y="1.1"
        width="21.5"
        height="10.8"
        rx="3.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="2.7" y="3.05" width={fillW} height="6.9" rx="1.6" fill="currentColor" />
      <path
        d="M23.4 4.6c.9.35 1.45.95 1.45 1.9s-.55 1.55-1.45 1.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
