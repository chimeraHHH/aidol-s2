import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiSearchPage.module.scss'

const HOT = ['换毛季梳毛', '猫粮怎么选', '疫苗时间表', '饮水技巧', '主子不爱动', '体检清单']

const ARTICLES = [
  {
    id: 1,
    topic: '饮食',
    title: '新手喂粮指南：怎么判断猫粮适不适合你家主子',
    summary: '从成分表、便便状态到挑食信号，三步帮你选对口粮。',
    cover: '/images/discover/knowledge-food.jpg',
  },
  {
    id: 2,
    topic: '健康',
    title: '年度体检该查什么？铲屎官必看清单',
    summary: '血常规、粪检、口腔，哪些项目值得优先安排。',
    cover: '/images/discover/knowledge-health.jpg',
  },
  {
    id: 3,
    topic: '护理',
    title: '换毛季不爆毛：梳毛、洗澡与环境清洁',
    summary: '正确工具比用力更重要，避开常见梳毛误区。',
    cover: '/images/discover/knowledge-groom.jpg',
  },
  {
    id: 4,
    topic: '行为',
    title: '每天玩多久？用游戏消耗猫的狩猎本能',
    summary: '追扑、抓咬、收尾，一套完整互动流程更安心。',
    cover: '/images/discover/knowledge-play.jpg',
  },
  {
    id: 5,
    topic: '健康',
    title: '为什么猫咪总爱蹲水碗旁边？',
    summary: '缺水、结石风险与饮水机选择，一篇讲清楚。',
    cover: '/images/discover/knowledge-water.jpg',
  },
]

export function PaiSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(['梳毛', '疫苗'])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.topic.includes(q),
    )
  }, [query])

  const applyQuery = (text: string) => {
    setQuery(text)
    setRecent((prev) => {
      const next = [text, ...prev.filter((x) => x !== text)]
      return next.slice(0, 6)
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="返回">
          ‹
        </button>
        <label className={styles.searchBox}>
          <span aria-hidden>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索养宠知识、话题…"
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="清空">
              ×
            </button>
          ) : null}
        </label>
      </header>

      {!query.trim() ? (
        <div className={styles.idle}>
          {recent.length > 0 && (
            <section>
              <div className={styles.secHead}>
                <h2>最近搜索</h2>
                <button type="button" onClick={() => setRecent([])}>
                  清空
                </button>
              </div>
              <div className={styles.chips}>
                {recent.map((item) => (
                  <button key={item} type="button" onClick={() => applyQuery(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className={styles.secHead}>
              <h2>热门搜索</h2>
            </div>
            <div className={styles.chips}>
              {HOT.map((item) => (
                <button key={item} type="button" onClick={() => applyQuery(item)}>
                  {item}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.results}>
          <p className={styles.resultMeta}>
            {results.length ? `找到 ${results.length} 条相关内容` : '没有找到相关内容，换个词试试'}
          </p>
          {results.map((a) => (
            <article key={a.id} className={styles.resultCard}>
              <img src={a.cover} alt="" />
              <div>
                <span>{a.topic}</span>
                <h3>{a.title}</h3>
                <p>{a.summary}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
