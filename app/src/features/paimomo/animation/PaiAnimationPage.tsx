import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiAnimationPage.module.scss'

const ACTIONS = ['点头', '眨眼', '舔手', '摇头', '招手', '吐舌头']

export function PaiAnimationPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>(['舔手', '吐舌头'])

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name)
      if (prev.length >= 2) return [...prev.slice(1), name]
      return [...prev, name]
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)}>
          ‹
        </button>
        <div>
          <h1>制作动效</h1>
          <p>为「小咪」添加可爱动作</p>
        </div>
        <span />
      </header>

      <div className={styles.preview}>
        <img src="/images/paimomo/cat-ragdoll.jpg" alt="小咪" />
      </div>

      <h2>组合动作</h2>
      <p className={styles.hint}>最多选择 2 个动作，数字为播放顺序</p>

      <div className={styles.grid}>
        {ACTIONS.map((name) => {
          const order = selected.indexOf(name)
          const on = order >= 0
          return (
            <button
              key={name}
              type="button"
              className={`${styles.action}${on ? ` ${styles.on}` : ''}`}
              onClick={() => toggle(name)}
            >
              <span className={styles.dot}>{on ? order + 1 : ''}</span>
              {name}
            </button>
          )
        })}
      </div>

      <p className={styles.note}>非会员账号仅可生成 1 次动效</p>
      <button
        type="button"
        className={styles.cta}
        disabled={selected.length === 0}
        onClick={() => navigate('/paimomo/generating?kind=anim')}
      >
        立即制作
      </button>
    </div>
  )
}
