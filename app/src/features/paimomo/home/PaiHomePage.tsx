import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiHomePage.module.scss'

type PaiHomePageProps = {
  /** 嵌在小咪 AppLayout 内时使用，避免 flex 高度裁切导致下方组块滚不到 */
  embed?: boolean
}

type Editor =
  | { kind: 'age' }
  | { kind: 'expense' }
  | { kind: 'vaccine' }
  | { kind: 'device' }
  | null

type Vaccine = { id: string; name: string; date: string }

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

export function PaiHomePage({ embed = false }: PaiHomePageProps) {
  const navigate = useNavigate()
  const { measurements, profile } = useAppData()
  const [editor, setEditor] = useState<Editor>(null)
  const [birthday, setBirthday] = useState(profile?.birthday ?? '2025-09-17')
  const [expense, setExpense] = useState(0)
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [deviceLinked, setDeviceLinked] = useState(false)
  const [draftAmount, setDraftAmount] = useState('20')
  const [draftVaxName, setDraftVaxName] = useState('猫三联')
  const [draftVaxDate, setDraftVaxDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [draftBirthday, setDraftBirthday] = useState(birthday)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  }, [])

  const latest = measurements[0] ?? null
  const weightText = latest ? latest.weightKg.toFixed(2) : '—'
  const weightHint = latest
    ? latest.deltaKg == null
      ? '已记录'
      : latest.deltaKg === 0
        ? '持平'
        : latest.deltaKg > 0
          ? `↑ ${latest.deltaKg.toFixed(2)} kg`
          : `↓ ${Math.abs(latest.deltaKg).toFixed(2)} kg`
    : '暂无数据'

  const ageText = calcAgeText(birthday)
  const vaxPreview =
    vaccines.length === 0
      ? '还没有疫苗记录'
      : vaccines
          .slice(0, 2)
          .map((v) => `${v.name} · ${v.date.slice(5)}`)
          .join(' / ')

  const [portalHost, setPortalHost] = useState<Element | null>(null)

  useEffect(() => {
    setPortalHost(document.querySelector('[data-phone-screen]'))
  }, [])

  useEffect(() => {
    if (!editor) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editor])

  const openEditor = (kind: NonNullable<Editor>['kind']) => {
    if (kind === 'age') setDraftBirthday(birthday)
    if (kind === 'expense') setDraftAmount('20')
    if (kind === 'vaccine') {
      setDraftVaxName('猫三联')
      setDraftVaxDate(new Date().toISOString().slice(0, 10))
    }
    setEditor({ kind })
  }

  const closeEditor = () => setEditor(null)

  const editorModal =
    editor && (
      <div className={styles.modalMask} onClick={closeEditor}>
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {editor.kind === 'age' && (
            <>
              <h2>设置生日</h2>
              <p className={styles.modalHint}>填好生日，年龄会自动算好</p>
              <label className={styles.field}>
                <span>出生日期</span>
                <input
                  type="date"
                  value={draftBirthday}
                  onChange={(e) => setDraftBirthday(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setBirthday(draftBirthday)
                  closeEditor()
                }}
              >
                保存
              </button>
            </>
          )}

          {editor.kind === 'expense' && (
            <>
              <h2>记一笔开销</h2>
              <p className={styles.modalHint}>保存后会累加到本月开销</p>
              <label className={styles.field}>
                <span>金额（元）</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setExpense((n) => n + Number(draftAmount || 0))
                  closeEditor()
                }}
              >
                保存这笔
              </button>
            </>
          )}

          {editor.kind === 'vaccine' && (
            <>
              <h2>添加疫苗记录</h2>
              <p className={styles.modalHint}>下次提醒会更准时</p>
              <label className={styles.field}>
                <span>疫苗名称</span>
                <input
                  value={draftVaxName}
                  onChange={(e) => setDraftVaxName(e.target.value)}
                  placeholder="如：猫三联"
                />
              </label>
              <label className={styles.field}>
                <span>接种日期</span>
                <input
                  type="date"
                  value={draftVaxDate}
                  onChange={(e) => setDraftVaxDate(e.target.value)}
                />
              </label>
              {vaccines.length > 0 ? (
                <ul className={styles.vaxHistory}>
                  {vaccines.map((v) => (
                    <li key={v.id}>
                      <span>{v.name}</span>
                      <time>{v.date}</time>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  if (!draftVaxName.trim()) return
                  setVaccines((list) => [
                    {
                      id: `${Date.now()}`,
                      name: draftVaxName.trim(),
                      date: draftVaxDate,
                    },
                    ...list,
                  ])
                  closeEditor()
                }}
              >
                添加记录
              </button>
            </>
          )}

          {editor.kind === 'device' && (
            <>
              <h2>{deviceLinked ? '设备已连接' : '连接智能设备'}</h2>
              <p className={styles.modalHint}>
                {deviceLinked
                  ? '可在测量页直接读取猫窝体重秤数据'
                  : '模拟扫码绑定猫窝体重秤（演示）'}
              </p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setDeviceLinked(true)
                  closeEditor()
                  navigate('/weigh')
                }}
              >
                {deviceLinked ? '去测量' : '扫码连接'}
              </button>
              {deviceLinked ? (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setDeviceLinked(false)
                    closeEditor()
                  }}
                >
                  断开连接
                </button>
              ) : null}
            </>
          )}

          <button type="button" className={styles.cancel} onClick={closeEditor}>
            取消
          </button>
        </div>
      </div>
    )

  return (
    <div className={`${styles.page}${embed ? ` ${styles.embed}` : ''}`}>
      <PaiHeader onPlus={() => navigate('/compose')} />

      <section className={styles.heroBlock}>
        <div className={styles.greeting}>
          <h1>
            {greeting}，用户08645
          </h1>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.scoreLabel}>今日体重</div>
            <div className={styles.score}>
              {weightText}
              {latest ? <span className={styles.scoreUnit}>kg</span> : null}
            </div>
            <div className={styles.scoreOk}>{weightHint}</div>
            <button type="button" className={styles.chatBtn} onClick={() => navigate('/')}>
              和我聊聊
            </button>
          </div>
          <div className={styles.heroCatWrap} aria-hidden>
            <img className={styles.heroCat} src="/images/companion-cat-layer.png?v=7" alt="" />
          </div>
        </div>
      </section>

      <section className={styles.sheet} aria-label="猫猫数据记录">
        <div className={styles.handle} aria-hidden />

        <header className={styles.sheetHead}>
          <div>
            <h2 className={styles.sheetTitle}>猫猫数据</h2>
            <p className={styles.sheetSub}>点一下就能记，体重 / 开销 / 疫苗都在这</p>
          </div>
          <button type="button" className={styles.weighFab} onClick={() => navigate('/weigh')}>
            <ScaleMiniIcon />
            去称重
          </button>
        </header>

        <div className={styles.quickRow} aria-label="快捷记录">
          <button type="button" className={styles.quick} onClick={() => navigate('/weigh')}>
            <span className={styles.quickIcon} aria-hidden>
              kg
            </span>
            记体重
          </button>
          <button type="button" className={styles.quick} onClick={() => openEditor('expense')}>
            <span className={styles.quickIcon} aria-hidden>
              ¥
            </span>
            记开销
          </button>
          <button type="button" className={styles.quick} onClick={() => openEditor('vaccine')}>
            <span className={styles.quickIcon} aria-hidden>
              针
            </span>
            记疫苗
          </button>
          <button type="button" className={styles.quick} onClick={() => openEditor('age')}>
            <span className={styles.quickIcon} aria-hidden>
              龄
            </span>
            改年龄
          </button>
        </div>

        <ul className={styles.recordList}>
          <li className={styles.recordRow}>
            <div className={styles.recordMain}>
              <span className={styles.recordLabel}>今日体重</span>
              <strong className={styles.recordValue}>
                {latest ? `${weightText} kg` : '还没称过'}
              </strong>
              <span className={styles.recordHint}>{weightHint}</span>
            </div>
            <button type="button" className={styles.recordBtn} onClick={() => navigate('/weigh')}>
              {latest ? '再测一次' : '去称重'}
            </button>
          </li>

          <li className={styles.recordRow}>
            <div className={styles.recordMain}>
              <span className={styles.recordLabel}>宠物年龄</span>
              <strong className={styles.recordValue}>{ageText}</strong>
              <span className={styles.recordHint}>生日 {birthday || '未设置'}</span>
            </div>
            <button type="button" className={styles.recordBtn} onClick={() => openEditor('age')}>
              编辑
            </button>
          </li>

          <li className={styles.recordRow}>
            <div className={styles.recordMain}>
              <span className={styles.recordLabel}>本月开销</span>
              <strong className={styles.recordValue}>¥{expense.toFixed(0)}</strong>
              <span className={styles.recordHint}>粮、医疗、玩具都可记</span>
            </div>
            <button
              type="button"
              className={styles.recordBtnPrimary}
              onClick={() => openEditor('expense')}
            >
              + 记账
            </button>
          </li>

          <li className={styles.recordRow}>
            <div className={styles.recordMain}>
              <span className={styles.recordLabel}>疫苗接种</span>
              <strong className={styles.recordValue}>
                {vaccines.length ? `${vaccines.length} 条记录` : '暂无记录'}
              </strong>
              <span className={styles.recordHint}>{vaxPreview}</span>
            </div>
            <button
              type="button"
              className={styles.recordBtnPrimary}
              onClick={() => openEditor('vaccine')}
            >
              + 添加
            </button>
          </li>

          <li className={styles.recordRow}>
            <div className={styles.recordMain}>
              <span className={styles.recordLabel}>智能设备</span>
              <strong className={styles.recordValue}>{deviceLinked ? '已连接' : '未连接'}</strong>
              <span className={styles.recordHint}>
                {deviceLinked ? '猫窝体重秤在线' : '扫码绑定猫窝体重秤'}
              </span>
            </div>
            <button
              type="button"
              className={styles.recordBtn}
              onClick={() => openEditor('device')}
            >
              {deviceLinked ? '管理' : '连接'}
            </button>
          </li>
        </ul>
      </section>

      {editorModal
        ? portalHost
          ? createPortal(editorModal, portalHost)
          : editorModal
        : null}
    </div>
  )
}

function ScaleMiniIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2.8" y="10.2" width="12.4" height="3.8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 3.4v6.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M5.8 7.2c1-1.5 2.2-2.2 3.2-2.2s2.2.7 3.2 2.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
