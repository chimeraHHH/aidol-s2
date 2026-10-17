import { PaiHomePage } from '@/features/paimomo/home/PaiHomePage'
import styles from './Home1Page.module.scss'

/** 小咪 App「首页」 */
export function Home1Page() {
  return (
    <div className={styles.wrap}>
      <PaiHomePage embed />
    </div>
  )
}
