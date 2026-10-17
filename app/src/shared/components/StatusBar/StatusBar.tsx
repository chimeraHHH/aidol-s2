import { useEffect, useState } from 'react'
import styles from './StatusBar.module.scss'

export function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatTime(new Date())), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.bar} aria-hidden>
      <span className={styles.time}>{time}</span>
      <span className={styles.icons}>
        <span className={styles.signal} />
        <span className={styles.wifi} />
        <span className={styles.battery} />
      </span>
    </div>
  )
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
