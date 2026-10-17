import { useState } from 'react'
import styles from './CatMascot.module.scss'

export type CatPose = 'idle' | 'wave' | 'heart'

const POSE_SRC: Record<CatPose, string> = {
  idle: '/images/cat-idle.jpg',
  wave: '/images/cat-wave.jpg',
  heart: '/images/cat-heart.jpg',
}

interface CatMascotProps {
  pose?: CatPose
  alt?: string
  /** 点击可摸摸，短暂切换到招手姿态 */
  interactive?: boolean
  /** idle 素材自带地毯，默认不叠 CSS 地毯 */
  showRug?: boolean
}

export function CatMascot({
  pose = 'idle',
  alt = '小咪',
  interactive = false,
  showRug,
}: CatMascotProps) {
  const [petPose, setPetPose] = useState<CatPose | null>(null)
  const active = petPose ?? pose
  const rug = showRug ?? active !== 'idle'

  const onPet = () => {
    if (!interactive) return
    setPetPose('wave')
    window.setTimeout(() => setPetPose(null), 1400)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        {rug && <div className={styles.rug} aria-hidden />}
        <span className={styles.spark} aria-hidden />
        <span className={`${styles.spark} ${styles.sparkAlt}`} aria-hidden />
        <img
          className={`${styles.figure}${interactive ? ` ${styles.figureInteractive}` : ''}`}
          src={POSE_SRC[active]}
          alt={alt}
          draggable={false}
          onClick={onPet}
        />
      </div>
    </div>
  )
}
