import { PaiDiscoverPage } from '@/features/paimomo/discover/PaiDiscoverPage'
import styles from './DiscoverPage.module.scss'

/** 小咪 App「发现」 */
export function DiscoverPage() {
  return (
    <div className={styles.wrap}>
      <PaiDiscoverPage embed />
    </div>
  )
}
