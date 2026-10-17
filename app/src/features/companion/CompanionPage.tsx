import { useEffect, useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import { useCustomCatAvatar } from '@/features/settings/useCustomCatAvatar'
import { PERSONA_LINES } from '@/services/mock/seed'
import styles from './CompanionPage.module.scss'

const DEFAULT_LINE = '数字只是记录，我们看长期趋势。'
const CAT_ANIM_SRC = '/images/companion/mijiang-nest-greenscreen.webp'
const CAT_POSTER_SRC = '/images/companion/mijiang-nest-greenscreen-poster.png'
const CAT_ANIM_MS = 10_000

export function CompanionPage() {
  const navigate = useNavigate()
  const { companion } = useAppData()
  const { avatar: customAvatar } = useCustomCatAvatar()
  const persona = companion?.personaId ?? 'gentle'
  const [line, setLine] = useState(DEFAULT_LINE)
  const [lineIndex, setLineIndex] = useState(0)
  const [quiet, setQuiet] = useState(false)
  const animSession = useId()
  const [catPlaying, setCatPlaying] = useState(true)
  const customStill = customAvatar?.cutoutUrl || customAvatar?.imageUrl

  useEffect(() => {
    if (customStill) {
      setCatPlaying(false)
      return
    }
    setCatPlaying(true)
    const id = window.setTimeout(() => setCatPlaying(false), CAT_ANIM_MS)
    return () => window.clearTimeout(id)
  }, [customStill])

  const chatAWhile = () => {
    if (quiet) {
      setLine('安静模式中…轻触月亮可唤醒我。')
      return
    }
    const lines = PERSONA_LINES[persona]
    const next = (lineIndex + 1) % lines.length
    setLineIndex(next)
    setLine(lines[next])
  }

  const toggleQuiet = () => {
    const next = !quiet
    setQuiet(next)
    setLine(next ? '好的，我先安静陪着你。' : DEFAULT_LINE)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>陪伴</h1>
      </header>

      <section className={styles.hero}>
        <div className={styles.bubble} role="status">
          <p className={styles.bubbleText}>{line}</p>
          <span className={styles.bubbleTail} aria-hidden />
        </div>

        <div className={styles.mascot}>
          <img
            className={styles.mascotImg}
            src={
              customStill
                ? customStill
                : catPlaying
                  ? `${CAT_ANIM_SRC}?play=${encodeURIComponent(animSession)}`
                  : CAT_POSTER_SRC
            }
            alt=""
            draggable={false}
            aria-label="咪酱"
          />
        </div>
      </section>

      <section className={styles.actions} aria-label="陪伴操作">
        <ActionRow icon={<ChatIcon />} label="聊一会儿" onClick={chatAWhile} />
        <ActionRow icon={<MoonIcon />} label="安静模式" onClick={toggleQuiet} />
        <ActionRow
          icon={<BellIcon />}
          label="调整提醒"
          onClick={() => navigate('/settings')}
        />
      </section>
    </div>
  )
}

function ActionRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowChevron} aria-hidden>
        ›
      </span>
    </button>
  )
}

function ChatIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 16.2c0-3.7 3.4-6.7 7-6.7s7 3 7 6.7-3.4 6.7-7 6.7c-1.1 0-2.2-.2-3.2-.6L5.8 23l.4-2.6C5.4 19.2 5 17.8 5 16.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="9.2" cy="15.8" r="1" fill="currentColor" />
      <circle cx="12" cy="15.8" r="1" fill="currentColor" />
      <circle cx="14.8" cy="15.8" r="1" fill="currentColor" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.2 4.4A7.8 7.8 0 1 0 19.6 14a6.2 6.2 0 0 1-4.4-9.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.2 1.8H5.3l1.2-1.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 19.5a1.8 1.8 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
