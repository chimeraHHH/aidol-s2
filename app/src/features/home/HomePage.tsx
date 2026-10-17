import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './HomePage.module.scss'

type Msg = {
  id: string
  role: 'cat' | 'user'
  text: string
  tts?: boolean
}

const CAT_REPLIES = [
  '喵呜……我在听呢，慢慢说。',
  '听起来你今天很认真呀，我用尾巴卷住你的手指。',
  '如果累了，就先摸摸我的头，我陪你待一会儿。',
  '外面怎样都好，你回来我就开心。',
  '呼噜呼噜……你的声音让我想眯一会儿眼。',
  '那我们一起数三下呼吸？吸——呼——我在这儿。',
]

export function HomePage() {
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
  }, [msgs])

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
    <div className={`${styles.page} ${styles.pageChat}`}>
      <div className={styles.scene} aria-hidden>
        <img className={styles.bgRoom} src="/images/home-room.jpg?v=8" alt="" draggable={false} />
        <div className={styles.catLayer}>
          <span className={styles.catShadow} />
          <img className={styles.catImg} src="/images/companion-cat-layer.png?v=7" alt="" draggable={false} />
        </div>
      </div>
      <div className={styles.veilBottom} aria-hidden />

      <div className={styles.chat}>
        <header className={styles.chatHeader}>
          <div className={styles.brandPill}>
            <img src="/images/paimomo/cat-avatar.jpg" alt="" />
            <span>小咪</span>
          </div>
          <button type="button" className={styles.callBtn} aria-label="语音陪伴">
            <PhoneIcon />
          </button>
        </header>

        <div className={styles.msgScroll} ref={listRef}>
          <div className={styles.stageSpacer} aria-hidden />
          <div className={styles.time}>刚才</div>

          {msgs.map((m) =>
            m.role === 'cat' ? (
              <div key={m.id} className={styles.rowCat}>
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
    </div>
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
