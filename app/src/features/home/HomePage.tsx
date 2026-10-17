import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import styles from './HomePage.module.scss'

export function HomePage() {
  const navigate = useNavigate()
  const { companion, device, connectDevice } = useAppData()
  const connected = device?.connection === 'connected'
  const { hello, sub } = useMemo(() => greetingCopy(), [])
  const [petting, setPetting] = useState(false)

  const onPet = () => {
    setPetting(true)
    window.setTimeout(() => setPetting(false), 1400)
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.room}${petting ? ` ${styles.roomPet}` : ''}`} aria-hidden />
      <div className={styles.sun} aria-hidden />
      <div className={styles.veilTop} aria-hidden />
      <div className={styles.veilBottom} aria-hidden />

      <button type="button" className={styles.roomHit} onClick={onPet} aria-label="摸摸小猫" />

      <div className={styles.ui}>
        <button
          type="button"
          className={styles.deviceChip}
          onClick={() => {
            if (!connected) void connectDevice()
          }}
        >
          <img className={styles.deviceThumb} src="/images/xiaomi-product.jpg" alt="" />
          <span className={`${styles.dot}${connected ? ` ${styles.dotOn}` : ''}`} />
          <span className={styles.chipText}>{connected ? '设备已连接' : '点击连接设备'}</span>
          <span className={styles.chevron} aria-hidden>
            ›
          </span>
        </button>

        <header className={styles.greetingBlock}>
          <h1 className={styles.hello}>{hello}</h1>
          <p className={styles.helloSub}>{sub}</p>
          {companion && companion.streakDays > 0 && (
            <p className={styles.streak}>已连续陪伴 {companion.streakDays} 天</p>
          )}
        </header>

        <div className={styles.mascotSpacer} />

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate('/weigh')}>
            <ScaleIcon />
            <span className={styles.btnLabel}>开始测量</span>
            <span className={styles.btnChevron} aria-hidden>
              ›
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function greetingCopy(): { hello: string; sub: string } {
  const hour = new Date().getHours()
  const hello =
    hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  return { hello, sub: '今天见到你了' }
}

function ScaleIcon() {
  return (
    <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="8" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 12.5h6M12 12.5V16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 8V6.5a4 4 0 0 1 8 0V8" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  )
}
