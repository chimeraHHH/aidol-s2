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
  const {
    recordMeasurement,
    measurements,
    companion,
    device: deviceInfo,
    connectDevice,
    setDeviceMode,
  } = useAppData()
  const [phase, setPhase] = useState<WeighPhase>('idle')
  const [live, setLive] = useState<number | null>(null)
  const [result, setResult] = useState<Measurement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)
  // 会话开始时取一次，避免保存记录后重启会话
  const previousKgRef = useRef<number | null>(null)
  const personaRef = useRef(companion?.personaId)
  const latestKg = measurements[0]?.weightKg ?? null
  const personaId = companion?.personaId
  useEffect(() => {
    previousKgRef.current = latestKg
    personaRef.current = personaId
  }, [latestKg, personaId])

  useEffect(() => {
    const cancel = device.startWeighSession(
      {
        onPhase: setPhase,
        onLiveWeight: setLive,
        onLocked: (m) => {
          setResult(m)
          if (m.weightKg < 5) {
            setNotice('读数不足 5 kg，未写入健康页体重看板（空窝 / 过轻不记录）')
            return
          }
          setNotice(null)
          void recordMeasurement(m).then(() => {
            setNotice('已写入健康页体重看板')
          })
        },
        onError: setError,
        onNotice: setNotice,
      },
      { previousKg: previousKgRef.current, personaId: personaRef.current },
    )
    cancelRef.current = cancel
    return () => cancel()
  }, [device, recordMeasurement, sessionKey])

  const isDemo = (deviceInfo?.mode ?? 'demo') === 'demo'
  const needsConnect = phase === 'idle' && !!error

  const restartSession = () => {
    setError(null)
    setNotice(null)
    setLive(null)
    setResult(null)
    setSessionKey((k) => k + 1)
  }

  const onConnect = async () => {
    setConnecting(true)
    try {
      await connectDevice()
    } finally {
      setConnecting(false)
    }
    const info = await device.getDevice()
    if (info.connection === 'connected') restartSession()
    else if (info.lastError) setError(info.lastError)
  }

  const onUseDemo = async () => {
    await setDeviceMode('demo')
    restartSession()
  }

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

          {needsConnect ? (
            <div className={`${styles.badge} ${styles.badgeError}`}>{error}</div>
          ) : complete ? (
            <div className={styles.badge}>
              <span className={styles.badgeIcon} aria-hidden>
                <CheckIcon />
              </span>
              测量完成
            </div>
          ) : (
            <div className={`${styles.badge} ${styles.badgeBusy}`}>
              {notice ?? badgeCopy(phase)}
            </div>
          )}
          <div className={styles.sourceTag}>
            {isDemo ? '演示数据 · 非实物测量' : `小咪实物 · ${deviceInfo?.transportLabel ?? '蓝牙串口'}`}
          </div>
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
          {needsConnect ? (
            <>
              {!isDemo ? (
                <Button
                  block
                  disabled={connecting || !!deviceInfo?.supportProblem}
                  onClick={() => void onConnect()}
                >
                  {connecting ? '连接中…' : '连接小咪'}
                </Button>
              ) : (
                <Button block onClick={restartSession}>
                  重新开始
                </Button>
              )}
              {!isDemo ? (
                <Button variant="secondary" block onClick={() => void onUseDemo()}>
                  没有硬件？用演示模式
                </Button>
              ) : null}
            </>
          ) : complete ? (
            <Button
              className={styles.saveBtn}
              block
              onClick={() => {
                cancelRef.current?.()
                navigate('/trends')
              }}
            >
              {result && result.weightKg >= 5 ? '查看健康看板' : '返回'}
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
