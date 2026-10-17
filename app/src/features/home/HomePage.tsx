import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAppData } from '@/app/providers/AppDataProvider'
import styles from './HomePage.module.scss'

type Msg = {
  id: string
  role: 'cat' | 'user'
  text: string
  tts?: boolean
}

const INTRO =
  '喵～我是小咪。今天也想趴在你身边听你说话。心里事、开心事，都可以跟我聊聊。'

const CAT_REPLIES = [
  '喵呜……我在听呢，慢慢说。',
  '听起来你今天很认真呀，我用尾巴卷住你的手指。',
  '如果累了，就先摸摸我的头，我陪你待一会儿。',
  '外面怎样都好，你回来我就开心。',
  '呼噜呼噜……你的声音让我想眯一会儿眼。',
  '那我们一起数三下呼吸？吸——呼——我在这儿。',
]

export function HomePage() {
  const { companion } = useAppData()
  const { hello, sub } = useMemo(() => greetingCopy(), [])
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [draft, setDraft] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 'm0',
      role: 'cat',
      text: 'Hi，我是小咪。想晒太阳、撒娇，还是听你讲今天的事？',
      tts: true,
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const replyIdx = useRef(0)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [msgs, started])

  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => setPlaying(false), 4200)
    return () => window.clearTimeout(id)
  }, [playing])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    setMsgs((prev) => [...prev, userMsg])
    setDraft('')
    window.setTimeout(() => {
      const reply = CAT_REPLIES[replyIdx.current % CAT_REPLIES.length]
      replyIdx.current += 1
      setMsgs((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, role: 'cat', text: reply, tts: true },
      ])
    }, 700 + Math.random() * 500)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(draft)
  }

  return (
    <div className={`${styles.page}${started ? ` ${styles.pageChat}` : ''}`}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgBreath} aria-hidden />
      <div className={styles.sun} aria-hidden />
      <div className={styles.veilTop} aria-hidden />
      <div className={styles.veilBottom} aria-hidden />

      {!started ? (
        <div className={styles.landing}>
          <header className={styles.topTools}>
            <div className={styles.toolGroup}>
              <span className={styles.toolBtn} aria-hidden>
                ···
              </span>
            </div>
            <div className={styles.namePill}>
              <img src="/images/companion-bg-ref.png" alt="" className={styles.pillAvatar} />
              <div className={styles.pillCopy}>
                <div className={styles.pillName}>
                  小咪
                  <span className={styles.badge}>官方认证</span>
                </div>
                <p>你的 AI 猫窝伙伴 · 随时陪聊</p>
              </div>
            </div>
          </header>

          <div className={styles.heroCopy}>
            <h1>{hello}</h1>
            <p>{sub}</p>
            {companion && companion.streakDays > 0 && (
              <span className={styles.streak}>已连续陪伴 {companion.streakDays} 天</span>
            )}
          </div>

          <div className={styles.landingBottom}>
            <div className={styles.titleRow}>
              <h2>小咪陪你聊聊</h2>
              <span className={styles.tag}>陪伴</span>
            </div>
            <p className={styles.online}>
              <i /> 随时在线 · 想说就说
            </p>

            <div className={styles.previewBubble}>
              <div className={styles.bubbleAvatar}>
                <img src="/images/companion-bg-ref.png" alt="" />
                <span>AI</span>
              </div>
              <p>Hi，我是小咪。晒晒太阳、撒个娇，或者听你讲今天的事～</p>
            </div>

            <button type="button" className={styles.startBtn} onClick={() => setStarted(true)}>
              <ChatIcon />
              开始聊聊
            </button>
            <p className={styles.startHint}>和自己的小猫说说话</p>
          </div>
        </div>
      ) : (
        <div className={styles.chat}>
          <header className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <img src="/images/companion-bg-ref.png" alt="" />
              <span>小咪陪你聊聊</span>
              <SpeakerIcon />
            </div>
            <button type="button" className={styles.callBtn} aria-label="语音陪伴">
              <PhoneIcon />
            </button>
          </header>

          <div className={styles.msgScroll} ref={listRef}>
            <article className={styles.featureCard}>
              <p>{INTRO}</p>
              <button
                type="button"
                className={`${styles.audioBar}${playing ? ` ${styles.audioPlaying}` : ''}`}
                onClick={() => setPlaying((v) => !v)}
              >
                <span className={styles.play}>{playing ? '❚❚' : '▶'}</span>
                <span className={styles.wave} aria-hidden>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <i key={i} style={{ animationDelay: `${i * 0.05}s` }} />
                  ))}
                </span>
                <span className={styles.dur}>0&apos;18&quot;</span>
              </button>
            </article>

            <div className={styles.time}>刚才</div>

            {msgs.map((m) =>
              m.role === 'cat' ? (
                <div key={m.id} className={styles.rowCat}>
                  <div className={styles.bubbleAvatar}>
                    <img src="/images/companion-bg-ref.png" alt="" />
                    <span>AI</span>
                  </div>
                  <div className={styles.bubbleCat}>
                    <p>{m.text}</p>
                    {m.tts && (
                      <button type="button" className={styles.tts} aria-label="播放">
                        <SpeakerIcon />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div key={m.id} className={styles.rowUser}>
                  <div className={styles.bubbleUser}>
                    <p>{m.text}</p>
                  </div>
                </div>
              ),
            )}
          </div>

          <form className={styles.composer} onSubmit={onSubmit}>
            <button type="button" className={styles.plus} aria-label="更多">
              +
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="和我聊聊..."
              enterKeyHint="send"
            />
            {draft.trim() ? (
              <button type="submit" className={styles.send} aria-label="发送">
                ↑
              </button>
            ) : (
              <button type="button" className={styles.mic} aria-label="语音输入">
                <MicIcon />
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

function greetingCopy() {
  const hour = new Date().getHours()
  const hello =
    hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  return { hello, sub: '今天见到你了' }
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={styles.startIcon}>
      <path
        d="M5.5 16.2c0-3.6 3.1-6.5 6.5-6.5s6.5 2.9 6.5 6.5c0 1.1-.3 2.1-.9 3L19 20.5l-2.7-.9c-1 .4-2.1.6-3.3.6-3.4 0-6.5-2.8-6.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="16" height="16">
      <path d="M4 10v4h3l4 3V7L7 10H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
      <path
        d="M7.5 4.5h2.2l1.2 3-1.5 1.2a10 10 0 0 0 4.9 4.9l1.2-1.5 3 1.2v2.2A2 2 0 0 1 16.5 17 11.5 11.5 0 0 1 5 5.5a2 2 0 0 1 2.5-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
