import { Outlet } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { StatusBar } from '@/shared/components/StatusBar/StatusBar'
import { TabBar } from '@/shared/components/TabBar/TabBar'
import styles from './AppLayout.module.scss'

export function AppLayout() {
  const { ready } = useAppData()

  return (
    <div className={styles.shell}>
      <StatusBar />
      <main className={styles.main}>
        {ready ? <Outlet /> : <div className={styles.loading}>正在唤醒小咪…</div>}
      </main>
      <TabBar />
    </div>
  )
}
