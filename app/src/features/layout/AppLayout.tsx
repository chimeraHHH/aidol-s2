import { Outlet, useLocation } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { StatusBar } from '@/shared/components/StatusBar/StatusBar'
import { TabBar } from '@/shared/components/TabBar/TabBar'
import styles from './AppLayout.module.scss'

export function AppLayout() {
  const { ready } = useAppData()
  const { pathname } = useLocation()
  const companionFull = pathname === '/'

  return (
    <div className={styles.shell}>
      <div className={styles.grain} aria-hidden />
      <StatusBar />
      <main className={`${styles.main}${companionFull ? ` ${styles.mainBleed}` : ''}`}>
        {ready ? <Outlet /> : <div className={styles.loading}>正在唤醒小咪…</div>}
      </main>
      <TabBar />
    </div>
  )
}
