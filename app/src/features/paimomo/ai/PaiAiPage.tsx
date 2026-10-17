import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiAiPage.module.scss'

const STARTERS = [
  '今天吃得怎么样？',
  '要不要称个体重？',
  '最近有没有精神不好？',
]

export function PaiAiPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
  const [hideHealth, setHideHealth] = useState(false)

  const send = (value?: string) => {
    const content = (value ?? text).trim()
    if (!content) return
    setMessages((m) => [
      ...m,
      { role: 'user', text: content },
      { role: 'bot', text: '收到啦～我会记住这件事，慢慢陪你看长期趋势。' },
    ])
    setText('')
  }

  return (
    <div className={styles.page}>
      <PaiHeader toast="档案已保存" />

      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1>快来问我问题吧～</h1>
          <button type="button" className={styles.makeBtn} onClick={() => navigate('/paimomo/pet-image')}>
            制作宠物形象
          </button>
        </div>
        <img src="/images/paimomo/cat-hero.jpg" alt="小咪" className={styles.cat} />
      </section>

      <section className={styles.panel}>
        {!hideHealth && (
          <div className={styles.healthRow}>
            <img src="/images/paimomo/ai-doctor.jpg" alt="" className={styles.doc} />
            <div className={styles.healthText}>
              <strong>AI健康辅助</strong>
              <span>有关毛孩子的健康问题都可以问我哟</span>
            </div>
            <button type="button" className={styles.hide} onClick={() => setHideHealth(true)}>
              不显示
            </button>
          </div>
        )}

        <div className={styles.chat}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.starters}>
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <p>没有更多啦</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userBubble : styles.botBubble}>
                {m.text}
              </div>
            ))
          )}
        </div>
      </section>

      <div className={styles.composer}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="和我聊聊吧～"
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button type="button" className={styles.mic} aria-label="语音">
          ⌖
        </button>
        <button type="button" className={styles.send} aria-label="发送" onClick={() => send()}>
          ✈
        </button>
      </div>
    </div>
  )
}
