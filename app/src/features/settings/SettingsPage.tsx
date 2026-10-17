import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import styles from './SettingsPage.module.scss'

function calcAgeText(birthday: string | undefined): string {
  if (!birthday) return '未设置'
  const born = new Date(birthday)
  if (Number.isNaN(born.getTime())) return '未设置'
  const now = new Date()
  let months =
    (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (now.getDate() < born.getDate()) months -= 1
  if (months < 0) months = 0
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years <= 0) return `${rem} 个月`
  if (rem === 0) return `${years} 岁`
  return `${years} 岁 ${rem} 个月`
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { profile, device, companion, measurements, connectDevice } = useAppData()
  const [deltaFirst, setDeltaFirst] = useState(true)
  const [localPrivacy, setLocalPrivacy] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const name = profile?.name ?? '咪酱'
  const breed = profile?.breed ?? '英短蓝猫'
  const birthday = profile?.birthday ?? '—'
  const ageText = calcAgeText(profile?.birthday)
  const latest = measurements[0] ?? null
  const connected = device?.connection === 'connected'

  const bondHint = useMemo(() => {
    const bond = companion?.bond ?? 80
    if (bond >= 85) return '和你很亲'
    if (bond >= 60) return '越来越熟悉'
    return '还在熟悉中'
  }, [companion?.bond])

  const onConnect = async () => {
    setConnecting(true)
    try {
      await connectDevice()
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />

      <section className={styles.hero} aria-label="猫咪资料">
        <div className={styles.bannerWrap}>
          <img
            className={styles.banner}
            src="/images/settings/profile-banner.jpg"
            alt=""
            draggable={false}
          />
          <div className={styles.bannerFade} aria-hidden />
        </div>

        <div className={styles.profileBlock}>
          <div className={styles.identity}>
            <img
              className={styles.avatar}
              src="/images/paimomo/cat-avatar.jpg"
              alt=""
              draggable={false}
            />
            <div className={styles.heroCopy}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{name}</h2>
                <span className={styles.chip}>{ageText}</span>
              </div>
              <p className={styles.meta}>{breed}</p>
              <p className={styles.birthday}>生日 {birthday}</p>
            </div>
          </div>

          <div className={styles.bondCard}>
            <div className={styles.bondTop}>
              <span>亲密度 {companion?.bond ?? 86}</span>
              <span>{bondHint}</span>
            </div>
            <div className={styles.bondTrack} aria-hidden>
              <i style={{ width: `${Math.min(100, companion?.bond ?? 86)}%` }} />
            </div>
          </div>

          <div className={styles.statStrip}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>今日体重</span>
              <strong>{latest ? latest.weightKg.toFixed(2) : '—'}</strong>
              <em>{latest ? 'kg' : ''}</em>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>连续陪伴</span>
              <strong>{companion?.streakDays ?? 0}</strong>
              <em>天</em>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>等级</span>
              <strong>{companion?.level ?? 1}</strong>
              <em>Lv</em>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-label="设备">
        <div className={styles.cardHead}>
          <h3>猫窝体重秤</h3>
          <span className={connected ? styles.statusOn : styles.statusOff}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
        <div className={styles.deviceRow}>
          <img
            className={styles.deviceThumb}
            src="/images/xiaomi-product.jpg?v=2"
            alt=""
            draggable={false}
          />
          <div className={styles.deviceCopy}>
            <strong>{device?.name ?? '小咪'}</strong>
            <span>固件 {device?.firmware ?? '—'}</span>
            {device?.batteryPercent != null ? (
              <span>电量 {device.batteryPercent}%</span>
            ) : (
              <span>电量读取中…</span>
            )}
          </div>
        </div>
        <div className={styles.cardActions}>
          {connected ? (
            <button type="button" className={styles.btnGhost} onClick={() => navigate('/weigh')}>
              开始测量
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={connecting}
              onClick={() => void onConnect()}
            >
              {connecting ? '连接中…' : '重新连接'}
            </button>
          )}
        </div>
      </section>

      <section className={styles.card} aria-label="偏好设置">
        <h3 className={styles.cardTitle}>偏好</h3>
        <button
          type="button"
          className={styles.toggleRow}
          onClick={() => setDeltaFirst((v) => !v)}
          aria-pressed={deltaFirst}
        >
          <div>
            <span className={styles.rowLabel}>差值优先展示</span>
            <span className={styles.rowHint}>健康页优先看涨跌，而不是绝对值</span>
          </div>
          <span className={`${styles.switch}${deltaFirst ? ` ${styles.switchOn}` : ''}`} />
        </button>
        <button
          type="button"
          className={styles.toggleRow}
          onClick={() => setLocalPrivacy((v) => !v)}
          aria-pressed={localPrivacy}
        >
          <div>
            <span className={styles.rowLabel}>本地优先 · 不朗读体重</span>
            <span className={styles.rowHint}>数据留在本机，语音不报具体公斤数</span>
          </div>
          <span className={`${styles.switch}${localPrivacy ? ` ${styles.switchOn}` : ''}`} />
        </button>
      </section>

      <section className={styles.card} aria-label="关于">
        <h3 className={styles.cardTitle}>关于小咪</h3>
        <div className={styles.aboutRow}>
          <span>版本</span>
          <span>1.0.0</span>
        </div>
        <div className={styles.aboutRow}>
          <span>账号</span>
          <span>用户08645</span>
        </div>
      </section>
    </div>
  )
}
