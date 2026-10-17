import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiHomePage.module.scss'

type PaiHomePageProps = {
  /** 嵌在小咪 AppLayout 内时使用，避免 flex 高度裁切导致下方组块滚不到 */
  embed?: boolean
}

export function PaiHomePage({ embed = false }: PaiHomePageProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expense, setExpense] = useState(0)
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  }, [])

  return (
    <div className={`${styles.page}${embed ? ` ${styles.embed}` : ''}`}>
      <PaiHeader onPlus={() => setMenuOpen((v) => !v)} />

      {menuOpen && (
        <div className={styles.menu} role="menu">
          {[
            { label: '扫码', action: () => setMenuOpen(false) },
            { label: '管理宠物档案', action: () => navigate('/paimomo/me') },
            { label: '添加好友', action: () => setMenuOpen(false) },
            { label: '发布宠友圈', action: () => navigate('/paimomo/discover') },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className={styles.menuItem}
              onClick={() => {
                item.action()
                setMenuOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <section className={styles.heroBlock}>
        <div className={styles.greeting}>
          <h1>
            {greeting}，
            <br />
            用户08645
          </h1>
          <div className={styles.miniActions}>
            <button type="button" className={styles.miniBtn} aria-label="搜索">
              ⌕
            </button>
            <button type="button" className={styles.miniBtn} onClick={() => navigate('/paimomo/pet-form')}>
              +
            </button>
          </div>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.scoreLabel}>今日健康分</div>
            <div className={styles.score}>100%</div>
            <div className={styles.scoreOk}>正常</div>
            <button type="button" className={styles.chatBtn} onClick={() => navigate('/paimomo/ai')}>
              和我聊聊
            </button>
          </div>
          <div className={styles.heroCatWrap} aria-hidden>
            <img className={styles.heroCat} src="/images/paimomo/cat-hero.png?v=3" alt="" />
          </div>
        </div>
      </section>

      <section className={styles.sheet}>
        <div className={styles.handle} aria-hidden />
        <div className={styles.grid}>
          <button type="button" className={`${styles.card} ${styles.gray}`} onClick={() => navigate('/paimomo/health')}>
            <span className={styles.cardIcon}>💊</span>
            <span className={styles.cardMeta}>暂无数据</span>
            <span className={styles.cardTitle}>健康档案</span>
            <span className={styles.arrow}>↗</span>
          </button>
          <button type="button" className={`${styles.card} ${styles.tan}`} onClick={() => navigate('/paimomo/discover')}>
            <span className={styles.cardIcon}>📔</span>
            <span className={styles.cardTitle}>养宠日记</span>
            <span className={styles.arrow}>↗</span>
          </button>
          <button type="button" className={`${styles.card} ${styles.tan}`}>
            <span className={styles.cardIcon}>⏱</span>
            <span className={styles.cardMeta}>—岁 —个月</span>
            <span className={styles.cardTitle}>宠物年龄</span>
            <span className={styles.arrow}>↗</span>
          </button>
          <button type="button" className={`${styles.card} ${styles.gray}`} onClick={() => navigate('/paimomo/health')}>
            <span className={styles.cardIcon}>kg</span>
            <span className={styles.cardMeta}>5.2KG</span>
            <span className={styles.cardTitle}>今日体重</span>
            <span className={styles.link}>更新数据</span>
          </button>

          <div className={`${styles.card} ${styles.gray} ${styles.tall}`}>
            <div className={styles.vaxList}>
              <div>暂无记录</div>
              <div>暂无记录</div>
              <div>暂无记录</div>
            </div>
            <div className={styles.cardTitle}>疫苗接种</div>
            <button type="button" className={styles.link}>
              编辑记录
            </button>
          </div>

          <button type="button" className={`${styles.card} ${styles.tan}`} onClick={() => setExpenseOpen(true)}>
            <span className={styles.cardIcon}>¥</span>
            <span className={styles.cardMeta}>¥{expense}</span>
            <span className={styles.cardTitle}>养宠开销</span>
            <span className={styles.link}>更新数据</span>
          </button>

          <button type="button" className={`${styles.card} ${styles.gray}`}>
            <span className={styles.cardIcon}>芯片</span>
            <span className={styles.cardTitle}>智能设备</span>
            <span className={styles.cardSub}>扫码链接智能设备</span>
            <span className={styles.link}>扫码连接</span>
          </button>
        </div>
      </section>

      {expenseOpen && (
        <div className={styles.modalMask} onClick={() => setExpenseOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>记录开销</h2>
            <label className={styles.field}>
              <span>时间</span>
              <input defaultValue="2026年10月17日 12:02" />
            </label>
            <label className={styles.field}>
              <span>金额（元）</span>
              <input type="number" defaultValue={20} id="expense-input" />
            </label>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                const el = document.getElementById('expense-input') as HTMLInputElement | null
                setExpense((n) => n + Number(el?.value || 0))
                setExpenseOpen(false)
              }}
            >
              保存
            </button>
            <button type="button" className={styles.secondary}>
              查看历史记录
            </button>
            <button type="button" className={styles.cancel} onClick={() => setExpenseOpen(false)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
