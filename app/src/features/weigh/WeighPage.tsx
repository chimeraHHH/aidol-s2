import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { useServices } from '@/app/providers/ServicesProvider'
import type { Measurement, WeighPhase } from '@/domain/types'
import { Button } from '@/shared/components/Button/Button'
import { StatusBar } from '@/shared/components/StatusBar/StatusBar'
import styles from './WeighPage.module.scss'

export function WeighPage() {
  const navigate = useNavigate()
  const { device } = useServices()
  const { recordMeasurement } = useAppData()
  const [phase, setPhase] = useState<WeighPhase>('idle')
  const [live, setLive] = useState<number | null>(null)
  const [result, setResult] = useState<Measurement | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const cancel = device.startWeighSession({
      onPhase: setPhase,
      onLiveWeight: setLive,
      onLocked: (m) => {
        setResult(m)
        void recordMeasurement(m)
      },
    })
    cancelRef.current = cancel
    return () => cancel()
  }, [device, recordMeasurement])

  const busy =
    phase === 'connecting' || phase === 'waiting' || phase === 'fluctuating' || phase === 'ai'
  const complete = phase === 'locked' || phase === 'ai' || phase === 'done'
  const displayKg =
    phase === 'fluctuating' && live !== null
      ? live
      : result
        ? result.weightKg
        : null
  const progress =
    phase === 'fluctuating'
      ? 72
      : complete
        ? 68
        : phase === 'waiting'
          ? 28
          : 12

  return (
    <div className={styles.page}>
      <StatusBar />
      <div className={styles.body}>
        <header className={styles.nav}>
          <button
            type="button"
            className={styles.back}
            aria-label="返回"
            onClick={() => {
              cancelRef.current?.()
              navigate('/')
            }}
          >
            <BackIcon />
          </button>
          <h1 className={styles.title}>正在测量</h1>
          <span className={styles.navSpacer} aria-hidden />
        </header>

        <section className={styles.readout} aria-live="polite">
          <div
            className={`${styles.ring}${busy && !complete ? ` ${styles.ringBusy}` : ''}`}
            style={{ ['--progress' as string]: `${progress}%` }}
          >
            <div className={styles.ringTrack} aria-hidden />
            <div className={styles.ringInner}>
              {displayKg !== null ? (
                <>
                  <div
                    className={`${styles.value}${phase === 'fluctuating' ? ` ${styles.valueLive}` : ''}`}
                  >
                    {displayKg.toFixed(1)}
                  </div>
                  <div className={styles.unit}>kg</div>
                </>
              ) : (
                <>
                  <div className={`${styles.value} ${styles.valuePlaceholder}`}>—.―</div>
                  <div className={styles.unit}>kg</div>
                </>
              )}
            </div>
          </div>

          {complete ? (
            <div className={styles.badge}>
              <span className={styles.badgeIcon} aria-hidden>
                <CheckIcon />
              </span>
              测量完成
            </div>
          ) : (
            <div className={`${styles.badge} ${styles.badgeBusy}`}>
              {badgeCopy(phase)}
            </div>
          )}
        </section>

        <div className={styles.hero} aria-hidden>
          <img
            className={`${styles.heroImg}${complete ? ` ${styles.heroCelebrate}` : ''}`}
            src="/images/weigh-kitten-celebrate.jpg"
            alt=""
            draggable={false}
          />
        </div>

        <div className={styles.actions}>
          {complete ? (
            <Button className={styles.saveBtn} block onClick={() => navigate('/')}>
              保存记录
            </Button>
          ) : (
            <Button
              variant="secondary"
              block
              onClick={() => {
                cancelRef.current?.()
                navigate('/')
              }}
            >
              取消
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function badgeCopy(phase: WeighPhase): string {
  switch (phase) {
    case 'connecting':
      return '正在连接…'
    case 'waiting':
      return '请让小猫上秤'
    case 'fluctuating':
      return '读数中…'
    case 'ai':
      return '整理结果…'
    default:
      return '准备中…'
  }
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 5L8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2L4.8 8.5L9.5 3.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
