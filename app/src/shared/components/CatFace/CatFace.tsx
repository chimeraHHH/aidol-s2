import type { CompanionMood } from '@/domain/types'
import styles from './CatFace.module.scss'

interface CatFaceProps {
  mood?: CompanionMood
  size?: 'md' | 'lg'
}

export function CatFace({ mood = 'curious', size = 'md' }: CatFaceProps) {
  const moodClass =
    mood === 'sleepy' ? styles.sleepy : mood === 'playful' ? styles.playful : ''

  return (
    <div
      className={`${styles.face} ${moodClass}`}
      style={size === 'lg' ? { width: 200, height: 200 } : undefined}
      aria-hidden
    >
      <div className={`${styles.ear} ${styles.earLeft}`}>
        <span className={styles.earInner} />
      </div>
      <div className={`${styles.ear} ${styles.earRight}`}>
        <span className={styles.earInner} />
      </div>
      <div className={styles.screen}>
        <div className={styles.glow} />
        <div className={styles.eyes}>
          <span className={styles.eye} />
          <span className={styles.eye} />
        </div>
        <div className={styles.mouth} />
      </div>
    </div>
  )
}
