import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomCatAvatar } from '@/features/settings/useCustomCatAvatar'
import {
  formatUserLabel,
  useUserAccount,
} from '@/features/settings/useUserAccount'
import styles from './PaiComposePage.module.scss'

const TOPICS = ['日常', '晒猫', '求助', '健康', '好物'] as const

export function PaiComposePage() {
  const navigate = useNavigate()
  const { account } = useUserAccount()
  const { avatar: customAvatar } = useCustomCatAvatar()
  const catFace =
    customAvatar?.cutoutUrl || customAvatar?.imageUrl || '/images/paimomo/cat-avatar.jpg'
  const [text, setText] = useState('')
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('晒猫')
  const [hasCover, setHasCover] = useState(true)
  const [posted, setPosted] = useState(false)

  const canPost = text.trim().length > 0

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canPost) return
    setPosted(true)
    window.setTimeout(() => navigate('/discover'), 700)
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.cancel} onClick={() => navigate(-1)}>
          取消
        </button>
        <h1>发布帖子</h1>
        <button
          type="submit"
          form="post-form"
          className={styles.publish}
          disabled={!canPost || posted}
        >
          {posted ? '已发布' : '发布'}
        </button>
      </header>

      <form id="post-form" className={styles.form} onSubmit={onSubmit}>
        <div className={styles.author}>
          <img src={catFace} alt="" />
          <div>
            <strong>{account.displayName || formatUserLabel(account)}</strong>
            <span>分享给宠友圈</span>
          </div>
        </div>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今天想和铲屎官们说点什么…"
          maxLength={500}
          rows={6}
        />
        <div className={styles.count}>{text.length}/500</div>

        <div className={styles.section}>
          <h2>话题</h2>
          <div className={styles.topics}>
            {TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.topic}${topic === t ? ` ${styles.topicActive}` : ''}`}
                onClick={() => setTopic(t)}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2>配图</h2>
          <div className={styles.mediaRow}>
            {hasCover ? (
              <div className={styles.cover}>
                <img src="/images/discover/discover-post-1.jpg" alt="" />
                <button
                  type="button"
                  className={styles.removeCover}
                  aria-label="移除配图"
                  onClick={() => setHasCover(false)}
                >
                  ×
                </button>
              </div>
            ) : null}
            <button type="button" className={styles.addMedia} onClick={() => setHasCover(true)}>
              <span>+</span>
              <em>添加图片</em>
            </button>
          </div>
        </div>

        <label className={styles.location}>
          <span>📍 添加位置</span>
          <em>可选</em>
        </label>
      </form>
    </div>
  )
}
