import { PaiHomePage } from '@/features/paimomo/home/PaiHomePage'
import styles from './Home1Page.module.scss'

/** 小咪 App「首页1」——与缦宠房子 Tab 同一页（含智能设备等全部组块） */
export function Home1Page() {
  return (
    <div className={styles.wrap}>
      <PaiHomePage embed />
    </div>
  )
}
