import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './PaiGeneratingPage.module.scss'

export function PaiGeneratingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kind = params.get('kind') === 'anim' ? 'anim' : 'image'
  const [progress, setProgress] = useState(8)

  useEffect(() => {
    const t = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 12))
    }, 500)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress < 100) return
    const t = window.setTimeout(() => navigate(kind === 'anim' ? '/paimomo/ai' : '/paimomo', { replace: true }), 700)
    return () => window.clearTimeout(t)
  }, [progress, kind, navigate])

  const title = kind === 'anim' ? '正在生成动效视频' : '正在生成专属宠物形象...'
  const sub = kind === 'anim' ? '这可能需要一些时间，请稍候...' : '大约需要一分钟。'

  const dots = useMemo(() => Array.from({ length: 400 }, (_, i) => i), [])

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        ‹
      </button>

      <div className={styles.grid}>
        {dots.map((i) => {
          const row = Math.floor(i / 20)
          const col = i % 20
          const d = Math.hypot(col - 10, row - 10)
          const opacity = Math.max(0.15, 1 - d / 14)
          return <span key={i} style={{ opacity }} />
        })}
      </div>

      <h1>{title}</h1>
      <p>{sub}</p>

      {kind === 'anim' && (
        <div className={styles.bar}>
          <i style={{ width: `${progress}%` }} />
        </div>
      )}

      <button type="button" className={styles.cta} onClick={() => navigate('/paimomo')}>
        后台生成
      </button>
    </div>
  )
}
