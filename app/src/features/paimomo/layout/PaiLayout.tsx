import { Outlet } from 'react-router-dom'
import { StatusBar } from '@/shared/components/StatusBar/StatusBar'
import { PaiTabBar } from '../components/PaiTabBar'
import '../styles/paimomo.scss'
import styles from './PaiLayout.module.scss'

export function PaiLayout() {
  return (
    <div className={styles.shell}>
      <StatusBar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <PaiTabBar />
    </div>
  )
}
