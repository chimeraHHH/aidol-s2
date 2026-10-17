import type { ReactNode } from 'react'
import styles from './PhoneShell.module.scss'

interface PhoneShellProps {
  children: ReactNode
  framed: boolean
}

export function PhoneShell({ children, framed }: PhoneShellProps) {
  if (!framed) {
    return (
      <div className={styles.bleed}>
        <div className={styles.content}>{children}</div>
      </div>
    )
  }

  return (
    <div className={styles.frame} aria-label="iPhone 17 Pro Max">
      <span className={`${styles.sideButton} ${styles.sideButtonMute}`} />
      <span className={`${styles.sideButton} ${styles.sideButtonVolUp}`} />
      <span className={`${styles.sideButton} ${styles.sideButtonVolDown}`} />
      <span className={`${styles.sideButton} ${styles.sideButtonPower}`} />
      <div className={styles.screen}>
        <div className={styles.island} aria-hidden>
          <span className={styles.islandLens} />
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.homeIndicator} aria-hidden />
      </div>
    </div>
  )
}
