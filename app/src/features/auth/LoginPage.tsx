import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import type { PersonaId } from '@/domain/types'
import { useAvatarGenerateJob } from '@/features/settings/useAvatarGenerateJob'
import {
  DEMO_ACCOUNTS,
  findAccountByPhone,
  switchAccountStandalone,
  type UserAccount,
} from '@/features/settings/useUserAccount'
import {
  applyOnboardingAnswers,
  ensureAccountForRegister,
  isOnboardingDone,
} from './applyOnboarding'
import { useAuthSession } from './useAuthSession'
import styles from './LoginPage.module.scss'

/** 全屏暖色猫窝主视觉（对齐 App 陪伴气质） */
const HERO = '/images/auth/login-hero.jpg?v=4'
const UPLOAD_PLACEHOLDER = '/images/paimomo/cat-avatar.jpg'

const BREEDS = ['英短蓝猫', '布偶猫', '暹罗猫', '中华田园猫', '其他'] as const

const PERSONAS: Array<{ id: PersonaId; title: string; desc: string }> = [
  { id: 'gentle', title: '温柔陪聊', desc: '软软的、会哄人，像窝里的小暖炉' },
  { id: 'sassy', title: '傲娇吐槽', desc: '嘴硬心软，称重偷懒会被记一笔' },
  { id: 'cool', title: '冷静管家', desc: '少废话、看趋势，数据讲清楚' },
]

/** 0 欢迎 → 1 登录注册 → 2 问卷 → 3 上传猫照 → 4 后台生成中 */
type Step = 0 | 1 | 2 | 3 | 4
type AuthMode = 'login' | 'register'

export function LoginPage() {
  const navigate = useNavigate()
  const { refresh } = useAppData()
  const { isLoggedIn, login, lastPhone } = useAuthSession()
  const { start: startGenerateJob, generating: avatarGenerating, job: avatarJob } =
    useAvatarGenerateJob()

  const [step, setStep] = useState<Step>(0)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const [phone, setPhone] = useState(lastPhone || '')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [catName, setCatName] = useState('咪酱')
  const [breed, setBreed] = useState<string>('英短蓝猫')
  const [birthday, setBirthday] = useState('2024-03-12')
  const [personaId, setPersonaId] = useState<PersonaId>('gentle')
  const [callUserAs, setCallUserAs] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const phoneDigits = phone.replace(/\D/g, '').slice(0, 11)

  const canAuth = useMemo(() => {
    if (phoneDigits.length !== 11 || password.trim().length < 4 || busy) return false
    if (authMode === 'register' && !regName.trim()) return false
    return true
  }, [phoneDigits, password, busy, authMode, regName])

  const canQuiz = Boolean(catName.trim() && breed && birthday && callUserAs.trim())

  // 新建账号会在 step 3/4 停留上传形象；已登录且未进上传流程才回首页
  if (isLoggedIn && step < 3) {
    return <Navigate to="/" replace />
  }

  const enterApp = async (account: UserAccount, phoneVal: string) => {
    switchAccountStandalone(account.userId)
    login(phoneVal)
    await refresh()
    navigate('/', { replace: true })
  }

  const goQuiz = (account: UserAccount) => {
    setPendingUserId(account.userId)
    // 注册昵称带入「怎么称呼你」，可再改
    setCallUserAs((prev) => prev || regName.trim() || account.displayName || '')
    setError(null)
    setStep(2)
  }

  const afterAuth = async (account: UserAccount, phoneVal: string, forceQuiz: boolean) => {
    if (forceQuiz || !isOnboardingDone(account.userId)) {
      goQuiz(account)
      return
    }
    await enterApp(account, phoneVal)
  }

  const onAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (phoneDigits.length !== 11) {
      setError('请输入 11 位手机号')
      return
    }
    if (password.trim().length < 4) {
      setError('密码至少 4 位（演示任意密码即可）')
      return
    }

    setBusy(true)
    try {
      if (authMode === 'login') {
        const existing = findAccountByPhone(phoneDigits)
        if (!existing) {
          setError('还没有这个账号，可以切换到「新建账号」')
          return
        }
        await afterAuth(existing, phoneDigits, false)
        return
      }

      const created = ensureAccountForRegister({
        displayName: regName.trim(),
        phone: phoneDigits,
      })
      await afterAuth(created, phoneDigits, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const quickLogin = async (account: UserAccount) => {
    setError(null)
    setBusy(true)
    try {
      // 演示账号直接进窝；正式新建仍走问答建档
      await enterApp(account, account.phone)
    } finally {
      setBusy(false)
    }
  }

  const finishEnterApp = async () => {
    await refresh()
    window.dispatchEvent(new CustomEvent('xm:user-account-changed'))
    navigate('/home1', { replace: true })
  }

  const onFinishQuiz = async () => {
    if (!pendingUserId) {
      setError('请先完成登录或注册')
      setStep(1)
      return
    }
    if (!canQuiz) {
      setError('请把猫猫信息和你的称呼填完整')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await applyOnboardingAnswers(pendingUserId, {
        catName,
        breed,
        birthday,
        personaId,
        callUserAs,
        ownerNickname: regName.trim() || callUserAs.trim(),
      })
      const account =
        findAccountByPhone(phoneDigits) ||
        DEMO_ACCOUNTS.find((a) => a.userId === pendingUserId)
      const phoneVal = account?.phone || phoneDigits
      switchAccountStandalone(pendingUserId)
      login(phoneVal)
      await refresh()
      window.dispatchEvent(new CustomEvent('xm:user-account-changed'))
      // 问卷后进入上传猫照，后台生成专属形象
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
    const started = startGenerateJob(file)
    if (!started) {
      setError('已有生成任务在进行，请稍候或到「我的」查看进度')
      return
    }
    setStep(4)
  }

  const onSkipPhoto = () => {
    void finishEnterApp()
  }

  const onBackgroundGenerate = () => {
    void finishEnterApp()
  }

  const uploadFlow = step >= 3

  return (
    <div className={`${styles.page}${uploadFlow ? ` ${styles.pageUpload}` : ''}`}>
      {!uploadFlow ? (
        <div className={styles.hero} aria-hidden>
          <img className={styles.heroImg} src={HERO} alt="" draggable={false} />
          <div className={step === 0 ? styles.veilWelcome : styles.veilSoft} />
        </div>
      ) : null}

      {uploadFlow ? (
        <div className={styles.uploadScreen} data-phone-screen>
          {step === 3 ? (
            <>
              <header className={styles.uploadHead}>
                <h1 className={styles.uploadTitle}>为 {catName.trim() || '猫猫'} 制作专属形象</h1>
                <p className={styles.uploadHint}>
                  拍一张或从相册选一张清晰正面照，窝知会在后台生成家居场景与陪伴形象。也可稍后在「我的 → 我的猫形象」补传。
                </p>
              </header>

              <div className={styles.uploadPreview}>
                <img
                  src={photoPreview || UPLOAD_PLACEHOLDER}
                  alt=""
                  draggable={false}
                />
                {!photoPreview ? (
                  <span className={styles.uploadPreviewTip}>预览区 · 建议光线充足、正面照</span>
                ) : null}
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenFile}
                onChange={(e) => {
                  onPickPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFile}
                onChange={(e) => {
                  onPickPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />

              {error ? <p className={styles.uploadError}>{error}</p> : null}

              <div className={styles.uploadActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  拍摄
                </button>
                <button
                  type="button"
                  className={styles.btnGhostDark}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  从相册选择
                </button>
                <button type="button" className={styles.btnTextSkip} onClick={onSkipPhoto}>
                  稍后再说，先进入窝知
                </button>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <header className={styles.uploadHead}>
                <h1 className={styles.uploadTitle}>正在生成专属形象…</h1>
                <p className={styles.uploadHint}>
                  静帧合成 → Seedance 动态视频 → 无缝循环，大约需要几分钟。可先去逛逛，完成后各页会自动更新。
                </p>
              </header>

              <div className={styles.genVisual} aria-hidden>
                <div className={styles.genDots}>
                  {Array.from({ length: 36 }).map((_, i) => (
                    <i key={i} style={{ ['--d' as string]: i }} />
                  ))}
                </div>
                {photoPreview ? (
                  <img className={styles.genThumb} src={photoPreview} alt="" draggable={false} />
                ) : null}
              </div>

              <p className={styles.genStatus}>
                {avatarJob.status === 'error'
                  ? avatarJob.error || '生成失败，可稍后在「我的」重试'
                  : avatarJob.status === 'success'
                    ? avatarJob.tip || '生成完成'
                    : avatarGenerating
                      ? '后台生成中，请稍候…'
                      : '准备开始生成…'}
              </p>

              <div className={styles.uploadActions}>
                <button type="button" className={styles.btnPrimary} onClick={onBackgroundGenerate}>
                  后台生成，进入窝知
                </button>
                {avatarJob.status === 'error' ? (
                  <button
                    type="button"
                    className={styles.btnGhostDark}
                    onClick={() => {
                      setError(null)
                      setStep(3)
                    }}
                  >
                    重新选图
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!uploadFlow ? (
      <div
        className={`${styles.content} ${step === 0 ? styles.contentEnd : styles.contentScroll}`}
      >
        <div className={styles.progress} aria-label={`引导第 ${step + 1} 步，共 3 步`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${styles.dot}${step === i ? ` ${styles.dotOn}` : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <header className={styles.brandBlock}>
              <p className={styles.brandSub}>窝里的健康知己</p>
              <h1 className={styles.brand}>窝知</h1>
              <p className={styles.tagline}>
                称重、陪伴、健康趋势——一只懂你猫猫的数字分身，在窝里等你回家。
              </p>
            </header>
            <div className={styles.welcomeActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  setAuthMode('register')
                  setStep(1)
                }}
              >
                开始使用
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  setAuthMode('login')
                  setStep(1)
                }}
              >
                我有账号，去登录
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <form className={styles.panel} onSubmit={onAuthSubmit}>
            <div className={styles.stepHead}>
              <h2 className={styles.panelTitle}>进入窝知</h2>
              <p className={styles.panelHint}>新建账号，或登录已有账号继续陪伴。</p>
            </div>

            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                className={`${styles.tab}${authMode === 'register' ? ` ${styles.tabOn}` : ''}`}
                onClick={() => {
                  setAuthMode('register')
                  setError(null)
                }}
              >
                新建账号
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={`${styles.tab}${authMode === 'login' ? ` ${styles.tabOn}` : ''}`}
                onClick={() => {
                  setAuthMode('login')
                  setError(null)
                }}
              >
                登录已有
              </button>
            </div>

            <div className={styles.fields}>
              {authMode === 'register' && (
                <label className={styles.field}>
                  <span className={styles.label}>你的昵称</span>
                  <input
                    className={styles.input}
                    value={regName}
                    maxLength={20}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="例如：铲屎官小鱼"
                  />
                </label>
              )}
              <label className={styles.field}>
                <span className={styles.label}>手机号</span>
                <input
                  className={styles.input}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11 位手机号"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>密码</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 4 位（演示任意密码）"
                />
              </label>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.rowActions}>
              <button
                type="button"
                className={`${styles.btnGhostDark}`}
                onClick={() => {
                  setError(null)
                  setStep(0)
                }}
              >
                返回
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={!canAuth}>
                {busy ? '请稍候…' : authMode === 'register' ? '下一步' : '登录'}
              </button>
            </div>

            <div className={styles.divider}>演示账号速登</div>
            <div className={styles.demoRow}>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.userId}
                  type="button"
                  className={styles.chip}
                  onClick={() => void quickLogin(a)}
                >
                  {a.displayName}
                </button>
              ))}
            </div>
            <p className={styles.legal}>演示环境数据保存在本机。登录即表示同意用户协议与隐私政策。</p>
          </form>
        )}

        {step === 2 && (
          <div className={styles.panel}>
            <div className={styles.stepHead}>
              <h2 className={styles.panelTitle}>认识你的猫猫</h2>
              <p className={styles.panelHint}>几个小问题，帮窝知记住TA，也记住怎么叫你。</p>
            </div>

            <div className={styles.qBlock}>
              <p className={styles.qTitle}>1. 猫猫叫什么？</p>
              <input
                className={styles.input}
                value={catName}
                maxLength={12}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="例如：咪酱"
              />
            </div>

            <div className={styles.qBlock}>
              <p className={styles.qTitle}>2. 品种大概是？</p>
              <div className={styles.chipRow}>
                {BREEDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`${styles.chip}${breed === b ? ` ${styles.chipOn}` : ''}`}
                    onClick={() => setBreed(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.qBlock}>
              <p className={styles.qTitle}>3. 生日（可估）</p>
              <input
                className={styles.input}
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div className={styles.qBlock}>
              <p className={styles.qTitle}>4. 希望猫猫是怎样的人设？</p>
              <div className={styles.personaGrid}>
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.personaCard}${personaId === p.id ? ` ${styles.personaOn}` : ''}`}
                    onClick={() => setPersonaId(p.id)}
                  >
                    <strong>{p.title}</strong>
                    <span>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.qBlock}>
              <p className={styles.qTitle}>5. 希望怎么称呼你？</p>
              <input
                className={styles.input}
                value={callUserAs}
                maxLength={20}
                onChange={(e) => setCallUserAs(e.target.value)}
                placeholder="例如：小鱼、爸爸、铲屎官"
              />
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.btnGhostDark}
                onClick={() => {
                  setError(null)
                  setStep(1)
                }}
              >
                返回
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={!canQuiz || busy}
                onClick={() => void onFinishQuiz()}
              >
                {busy ? '正在保存…' : '下一步'}
              </button>
            </div>
          </div>
        )}
      </div>
      ) : null}
    </div>
  )
}
