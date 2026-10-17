import { useNavigate } from 'react-router-dom'
import styles from './PaiHealthPage.module.scss'

export function PaiHealthPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1>健康档案</h1>
        <span />
      </header>

      <div className={styles.top}>
        <article className={styles.petCard}>
          <img src="/images/paimomo/cat-ragdoll.jpg" alt="小咪" />
          <div className={styles.petMeta}>
            <strong>小咪</strong>
            <span>猫猫</span>
          </div>
          <em>今日健康分 100%</em>
        </article>

        <article className={styles.weightCard}>
          <span>今日体重</span>
          <strong>5.2 KG</strong>
          <button type="button" className={styles.update}>
            更新
          </button>
          <button type="button" className={styles.history}>
            历史记录
          </button>
        </article>
      </div>

      <div className={styles.mid}>
        <button type="button" className={styles.record}>
          <strong>用药记录</strong>
          <span>暂无数据</span>
          <small>点击添加或查看历史</small>
        </button>
        <button type="button" className={styles.record}>
          <strong>就诊记录</strong>
          <span>暂无数据</span>
          <small>点击添加或查看历史</small>
        </button>
      </div>

      <div className={styles.section}>历史行为记录</div>
      <div className={styles.behavior}>
        暂无行为记录。健康辅助对话会自动出现在这里。
      </div>

      <button type="button" className={styles.fab} aria-label="添加" onClick={() => navigate('/paimomo/ai')}>
        +
      </button>
    </div>
  )
}
