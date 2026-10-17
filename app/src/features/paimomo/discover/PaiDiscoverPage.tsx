import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiDiscoverPage.module.scss'

const POSTS = [
  {
    id: 1,
    user: '用户08645',
    title: '小咪今天也很乖',
    body: '晒晒今天的小咪，健康分 100%，准备晚点和她聊聊。',
    tag: '宠友圈',
  },
  {
    id: 2,
    user: 'PaiMomo',
    title: '八月更新速览',
    body: 'AI 健康辅助上线：用药、就诊、行为记录都可以问。',
    tag: '官方',
  },
  {
    id: 3,
    user: 'momo',
    title: '第一次用 GO!',
    body: '遛宠地图已经打开，明天试试记录公里数。',
    tag: '遛宠',
  },
]

export function PaiDiscoverPage() {
  return (
    <div className={styles.page}>
      <PaiHeader />
      <div className={styles.head}>
        <h1>发现</h1>
        <p>宠友圈 · 资讯 · 灵感</p>
      </div>
      <div className={styles.list}>
        {POSTS.map((p) => (
          <article key={p.id} className={styles.card}>
            <div className={styles.meta}>
              <span className={styles.tag}>{p.tag}</span>
              <span>{p.user}</span>
            </div>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
