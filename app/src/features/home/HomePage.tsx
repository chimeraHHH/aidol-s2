import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAppData } from '@/app/providers/AppDataProvider'
import { useCustomCatAvatar } from '@/features/settings/useCustomCatAvatar'
import { useCompanionChat } from './useCompanionChat'
import styles from './HomePage.module.scss'

/** 全景场景视频（房间 + 垫子上的猫），进入陪伴页循环播放 */
const SCENE_VIDEO_SRC = '/images/companion/companion-scene.mp4?v=2'
const SCENE_POSTER_SRC = '/images/companion/companion-scene-poster.jpg?v=2'

export function HomePage() {
  const { profile } = useAppData()
  const { avatar: customAvatar } = useCustomCatAvatar()
  const { msgs, sending, lastReaction, send } = useCompanionChat()
  const catLabel = profile?.name?.trim() || '小咪'
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const sceneVideoRef = useRef<HTMLVideoElement>(null)
  /** 有自定义无缝视频 → 全景视频；仅有静帧 → 全景静帧铺满；否则默认官方视频 */
  const customVideoUrl = customAvatar?.videoUrl
  const customSceneStill = customAvatar?.imageUrl
  const useCustomStillOnly = Boolean(customSceneStill && !customVideoUrl)
  const sceneVideoSrc = customVideoUrl || SCENE_VIDEO_SRC
  const scenePosterSrc = customSceneStill || SCENE_POSTER_SRC
  const faceSrc = customAvatar?.cutoutUrl || customSceneStill || '/images/paimomo/cat-avatar.jpg'

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [msgs])

  useEffect(() => {
    if (useCustomStillOnly) return

    const startPlay = () => {
      const v = sceneVideoRef.current
      if (!v) return
      try {
        v.pause()
        v.currentTime = 0
        void v.play()
      } catch {
        /* autoplay may be blocked; poster still shows */
      }
    }

    startPlay()
    window.addEventListener('xm:companion-play', startPlay)
    return () => window.removeEventListener('xm:companion-play', startPlay)
  }, [useCustomStillOnly, sceneVideoSrc])

  // 收到反应时轻震一下场景感（可选）
  useEffect(() => {
    if (!lastReaction) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(lastReaction === 'nuzzle' ? [8, 40, 8] : 10)
    }
  }, [lastReaction])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  return (
    <div className={`${styles.page} ${styles.pageChat}`} data-reaction={lastReaction || undefined}>
      <div className={styles.scene} aria-hidden>
        {useCustomStillOnly ? (
          <img
            className={styles.bgRoom}
            src={customSceneStill!}
            alt=""
            draggable={false}
          />
        ) : (
          <video
            key={sceneVideoSrc}
            ref={sceneVideoRef}
            className={styles.bgRoom}
            poster={scenePosterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={`${catLabel}在家`}
          >
            <source src={sceneVideoSrc} type="video/mp4" />
          </video>
        )}
      </div>
      <div className={styles.veilBottom} aria-hidden />

      <div className={styles.chat}>
        <header className={styles.chatHeader}>
          <div className={styles.brandPill}>
            <img src={faceSrc} alt="" />
            <span>{catLabel}</span>
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
                <div className={`${styles.bubbleCat}${m.pending ? ` ${styles.bubblePending}` : ''}`}>
                  <p>{m.text}{m.pending ? '…' : ''}</p>
                  {m.tts && !m.pending && (
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
            placeholder={sending ? `${catLabel}正在想…` : '和我聊聊...'}
            enterKeyHint="send"
            disabled={sending}
          />
          {draft.trim() && !sending ? (
            <button type="submit" className={styles.send} aria-label="发送">
              ↑
            </button>
          ) : (
            <button type="button" className={styles.mic} aria-label="语音输入" disabled={sending}>
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
