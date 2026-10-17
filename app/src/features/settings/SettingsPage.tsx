import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { resetAvatarJobUi } from '@/services/avatarGenerateJob'
import { useAvatarGenerateJob } from './useAvatarGenerateJob'
import { useCustomCatAvatar } from './useCustomCatAvatar'
import {
  formatUserLabel,
  maskPhone,
  useUserAccount,
} from './useUserAccount'
import styles from './SettingsPage.module.scss'

const DEFAULT_SCENE_POSTER = '/images/companion/companion-scene-poster.jpg?v=2'

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
  const { avatar: customAvatar, clear: clearAvatar } = useCustomCatAvatar()
  const { job, generating, start: startGenerateJob } = useAvatarGenerateJob()
  const { account, patch: patchAccount } = useUserAccount()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [connecting, setConnecting] = useState(false)
  const name = profile?.name ?? '咪酱'
  const breed = profile?.breed ?? '英短蓝猫'
  const birthday = profile?.birthday ?? '—'
  const ageText = calcAgeText(profile?.birthday)
  const personaLabel =
    companion?.personaId === 'sassy'
      ? '傲娇吐槽'
      : companion?.personaId === 'cool'
        ? '冷静管家'
        : '温柔陪聊'
  const latest = measurements[0] ?? null
  const connected = device?.connection === 'connected'
  const hasGeneratedAvatar = Boolean(customAvatar?.cutoutUrl || customAvatar?.imageUrl)
  const displayAvatar = hasGeneratedAvatar
    ? customAvatar!.cutoutUrl || customAvatar!.imageUrl!
    : '/images/paimomo/cat-avatar.jpg'
  const previewUrl = job.previewUrl || customAvatar?.imageUrl || null
  const genTip = job.tip
  const genError = job.error
  const userLabel = formatUserLabel(account)

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

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return
    const started = startGenerateJob(file)
    if (!started) {
      /* 已有任务在后台跑 */
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
              className={`${styles.avatar}${hasGeneratedAvatar ? ` ${styles.avatarCutout}` : ''}`}
              src={displayAvatar}
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

      <section className={styles.card} aria-label="生成我的猫形象">
        <div className={styles.cardHead}>
          <h3>我的猫形象</h3>
          {customAvatar ? (
            <span className={styles.statusOn}>
              {customAvatar.mock
                ? 'Mock'
                : customAvatar.videoUrl
                  ? '已生成·含视频'
                  : '已生成·仅静帧'}
            </span>
          ) : (
            <span className={styles.statusOn}>默认场景</span>
          )}
        </div>
        <div className={styles.avatarPreviewRow}>
          <div className={styles.avatarPreview}>
            <img
              src={customAvatar?.imageUrl || previewUrl || DEFAULT_SCENE_POSTER}
              alt="猫形象预览"
              draggable={false}
            />
          </div>
          <div className={styles.avatarActions}>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.hiddenFile}
              onChange={(e) => {
                void onPickPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFile}
              onChange={(e) => {
                void onPickPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={generating}
              onClick={() => cameraInputRef.current?.click()}
            >
              {generating ? '生成中…' : '拍照生成场景'}
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={generating}
              onClick={() => galleryInputRef.current?.click()}
            >
              从相册上传
            </button>
            {customAvatar ? (
              <button
                type="button"
                className={styles.btnGhost}
                disabled={generating}
                onClick={() => {
                  clearAvatar()
                  resetAvatarJobUi()
                }}
              >
                恢复默认场景
              </button>
            ) : null}
          </div>
        </div>
        {generating ? (
          <p className={styles.avatarStatus}>
            后台生成中：静帧 → Seedance 动态视频（常需 2–8 分钟）→ 无缝循环。可继续浏览，完成后自动替换；动态效果请到「陪伴」页查看。
          </p>
        ) : null}
        {genTip && !generating ? <p className={styles.avatarTip}>{genTip}</p> : null}
        {!generating && customAvatar?.videoUrl ? (
          <p className={styles.avatarTip}>
            已附带循环视频，打开底部「陪伴」即可看到会动的家居背景。
          </p>
        ) : null}
        {genError ? <p className={styles.avatarError}>{genError}</p> : null}
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
          onClick={() => patchAccount({ deltaFirst: !account.deltaFirst })}
          aria-pressed={account.deltaFirst}
        >
          <div>
            <span className={styles.rowLabel}>差值优先展示</span>
            <span className={styles.rowHint}>健康页优先看涨跌，而不是绝对值</span>
          </div>
          <span className={`${styles.switch}${account.deltaFirst ? ` ${styles.switchOn}` : ''}`} />
        </button>
        <button
          type="button"
          className={styles.toggleRow}
          onClick={() => patchAccount({ localPrivacy: !account.localPrivacy })}
          aria-pressed={account.localPrivacy}
        >
          <div>
            <span className={styles.rowLabel}>本地优先 · 不朗读体重</span>
            <span className={styles.rowHint}>数据留在本机，语音不报具体公斤数</span>
          </div>
          <span className={`${styles.switch}${account.localPrivacy ? ` ${styles.switchOn}` : ''}`} />
        </button>
      </section>

      <section className={styles.card} aria-label="设置">
        <h3 className={styles.cardTitle}>设置</h3>
        <button
          type="button"
          className={styles.navRow}
          onClick={() => navigate('/settings/account')}
        >
          <div>
            <span className={styles.rowLabel}>账号与登录</span>
            <span className={styles.rowHint}>
              {account.displayName || userLabel} · {maskPhone(account.phone)} · 详情 / 退出
            </span>
          </div>
          <span className={styles.rowChevron} aria-hidden>
            ›
          </span>
        </button>
      </section>

      <section className={styles.card} aria-label="关于">
        <h3 className={styles.cardTitle}>关于窝知</h3>
        <div className={styles.aboutRow}>
          <span>版本</span>
          <span>1.0.0</span>
        </div>
        <div className={styles.aboutRow}>
          <span>账号</span>
          <span>{userLabel}</span>
        </div>
        <div className={styles.aboutRow}>
          <span>昵称</span>
          <span>{account.displayName || '—'}</span>
        </div>
        <div className={styles.aboutRow}>
          <span>猫怎么叫我</span>
          <span>{account.callAs || account.displayName || '—'}</span>
        </div>
        <div className={styles.aboutRow}>
          <span>猫猫人设</span>
          <span>{personaLabel}</span>
        </div>
        <div className={styles.aboutRow}>
          <span>猫猫名</span>
          <span>{name}</span>
        </div>
      </section>
    </div>
  )
}
