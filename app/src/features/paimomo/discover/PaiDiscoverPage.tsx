import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiDiscoverPage.module.scss'

const TABS = ['猫猫知识', '推荐', '关注'] as const

type Post = {
  id: number
  user: string
  avatar: string
  title: string
  body: string
  image: string
  date: string
  likes: number
  comments: number
  liked?: boolean
  starred?: boolean
}

type KnowledgeTopic = '全部' | '饮食' | '健康' | '护理' | '行为'

type KnowledgeArticle = {
  id: number
  topic: Exclude<KnowledgeTopic, '全部'>
  title: string
  summary: string
  cover: string
  readMins: number
  views: string
  author: string
  featured?: boolean
}

type QuickTip = {
  id: number
  title: string
  desc: string
  cover: string
}

const POSTS: Post[] = [
  {
    id: 1,
    user: '团团的铲屎官',
    avatar: '/images/discover/discover-user-2.jpg',
    title: '团团',
    body: '晒太阳晒到融化了，谁来叫它吃饭',
    image: '/images/discover/discover-post-1.jpg',
    date: '10/17',
    likes: 128,
    comments: 16,
    liked: true,
  },
  {
    id: 2,
    user: '灰灰的家长',
    avatar: '/images/discover/discover-user-3.jpg',
    title: '灰灰',
    body: '窗台观察员正式上岗，楼下鸟一个没放过',
    image: '/images/discover/discover-post-2.jpg',
    date: '10/16',
    likes: 86,
    comments: 9,
  },
  {
    id: 3,
    user: '花卷妈咪',
    avatar: '/images/discover/discover-user-1.jpg',
    title: '花卷',
    body: '今天也要睡够十八小时，别吵',
    image: '/images/discover/discover-post-3.jpg',
    date: '10/15',
    likes: 203,
    comments: 24,
    starred: true,
  },
  {
    id: 4,
    user: '饼饼的管家',
    avatar: '/images/discover/discover-user-4.jpg',
    title: '饼饼',
    body: '新玩具到货，战斗力瞬间拉满',
    image: '/images/discover/discover-post-4.jpg',
    date: '10/14',
    likes: 67,
    comments: 5,
  },
  {
    id: 5,
    user: '雪球家的猫',
    avatar: '/images/discover/discover-user-1.jpg',
    title: '雪球',
    body: '猫爬架顶层才是王座，谁也别抢',
    image: '/images/discover/discover-post-5.jpg',
    date: '10/13',
    likes: 154,
    comments: 11,
    liked: true,
  },
]

const KNOWLEDGE_TOPICS: KnowledgeTopic[] = ['全部', '饮食', '健康', '护理', '行为']

const QUICK_TIPS: QuickTip[] = [
  {
    id: 1,
    title: '饮水小技巧',
    desc: '流水更能勾起喝水欲',
    cover: '/images/discover/knowledge-water.jpg',
  },
  {
    id: 2,
    title: '梳毛节奏',
    desc: '换毛季每天 5 分钟',
    cover: '/images/discover/knowledge-groom.jpg',
  },
  {
    id: 3,
    title: '优质睡眠',
    desc: '安静角落胜过豪华窝',
    cover: '/images/discover/knowledge-sleep.jpg',
  },
]

const ARTICLES: KnowledgeArticle[] = [
  {
    id: 1,
    topic: '饮食',
    title: '新手喂粮指南：怎么判断猫粮适不适合你家主子',
    summary: '从成分表、便便状态到挑食信号，三步帮你选对口粮。',
    cover: '/images/discover/knowledge-food.jpg',
    readMins: 4,
    views: '2.4万',
    author: '小咪营养官',
    featured: true,
  },
  {
    id: 2,
    topic: '健康',
    title: '年度体检该查什么？铲屎官必看清单',
    summary: '血常规、粪检、口腔，哪些项目值得优先安排。',
    cover: '/images/discover/knowledge-health.jpg',
    readMins: 6,
    views: '1.8万',
    author: '猫科健康站',
  },
  {
    id: 3,
    topic: '护理',
    title: '换毛季不爆毛：梳毛、洗澡与环境清洁',
    summary: '正确工具比用力更重要，避开常见梳毛误区。',
    cover: '/images/discover/knowledge-groom.jpg',
    readMins: 5,
    views: '3.1万',
    author: '毛孩子研究所',
  },
  {
    id: 4,
    topic: '行为',
    title: '每天玩多久？用游戏消耗猫的狩猎本能',
    summary: '追扑、抓咬、收尾，一套完整互动流程更安心。',
    cover: '/images/discover/knowledge-play.jpg',
    readMins: 3,
    views: '9560',
    author: '行为观察室',
  },
  {
    id: 5,
    topic: '健康',
    title: '为什么猫咪总爱蹲水碗旁边？',
    summary: '缺水、结石风险与饮水机选择，一篇讲清楚。',
    cover: '/images/discover/knowledge-water.jpg',
    readMins: 4,
    views: '1.2万',
    author: '小咪营养官',
  },
  {
    id: 6,
    topic: '行为',
    title: '主子白天睡很久正常吗？',
    summary: '猫咪睡眠周期与人类不同，这些情况才需要留意。',
    cover: '/images/discover/knowledge-sleep.jpg',
    readMins: 3,
    views: '7800',
    author: '行为观察室',
  },
]

type PaiDiscoverPageProps = {
  /** 嵌在小咪 AppLayout 内时使用，随内容撑开完整滚动 */
  embed?: boolean
}

export function PaiDiscoverPage({ embed = false }: PaiDiscoverPageProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('推荐')
  const [topic, setTopic] = useState<KnowledgeTopic>('全部')
  const [posts, setPosts] = useState(POSTS)

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    )
  }

  const toggleStar = (id: number) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)))
  }

  const knowledgeList = ARTICLES.filter(
    (a) => !a.featured && (topic === '全部' || a.topic === topic),
  )

  const featured = ARTICLES.find((a) => a.featured)!

  return (
    <div className={`${styles.page}${embed ? ` ${styles.embed}` : ''}`}>
      <PaiHeader
        title="发现"
        subtitle="猫友动态与猫猫知识"
        onSearch={() => navigate('/search')}
      />

      <div className={styles.topBar}>
        <div className={styles.tabs} role="tablist" aria-label="发现筛选">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`${styles.tab}${activeTab === tab ? ` ${styles.tabActive}` : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === '猫猫知识' ? (
        <div className={styles.knowledge}>
          <section className={styles.heroCard}>
            <img src={featured.cover} alt="" className={styles.heroCover} />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <span className={styles.heroBadge}>今日精选 · {featured.topic}</span>
              <h2>{featured.title}</h2>
              <p>
                {featured.readMins} 分钟阅读 · {featured.views} 阅读
              </p>
            </div>
          </section>

          <div className={styles.topicRow} role="tablist" aria-label="知识分类">
            {KNOWLEDGE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={topic === t}
                className={`${styles.topicChip}${topic === t ? ` ${styles.topicChipActive}` : ''}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <section className={styles.tipsSection}>
            <div className={styles.sectionHead}>
              <h3>一分钟小贴士</h3>
              <span>滑动查看</span>
            </div>
            <div className={styles.tipsScroller}>
              {QUICK_TIPS.map((tip) => (
                <article key={tip.id} className={styles.tipCard}>
                  <img src={tip.cover} alt="" />
                  <div>
                    <h4>{tip.title}</h4>
                    <p>{tip.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.articleSection}>
            <div className={styles.sectionHead}>
              <h3>{topic === '全部' ? '精选文章' : `${topic}专题`}</h3>
              <span>{knowledgeList.length} 篇</span>
            </div>
            <div className={styles.articleList}>
              {knowledgeList.map((article) => (
                <article key={article.id} className={styles.articleCard}>
                  <img src={article.cover} alt="" className={styles.articleCover} />
                  <div className={styles.articleBody}>
                    <span className={styles.articleTag}>{article.topic}</span>
                    <h4>{article.title}</h4>
                    <p>{article.summary}</p>
                    <div className={styles.articleMeta}>
                      <span>{article.author}</span>
                      <span>
                        {article.readMins} 分钟 · {article.views}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : activeTab === '关注' ? (
        <div className={styles.emptyFollow}>
          <p>还没有关注的铲屎官</p>
          <span>去「推荐」看看大家的小猫日常吧</span>
          <button type="button" className={styles.emptyBtn} onClick={() => setActiveTab('推荐')}>
            去推荐逛逛
          </button>
        </div>
      ) : (
        <div className={styles.feed}>
          {posts.map((post) => (
            <article key={post.id} className={styles.card}>
              <div className={styles.media}>
                <img src={post.image} alt={post.title} className={styles.cover} />
                <div className={styles.userPill}>
                  <img src={post.avatar} alt="" className={styles.userAvatar} />
                  <span>{post.user}</span>
                </div>
                <button type="button" className={styles.moreBtn} aria-label="更多">
                  <MoreIcon />
                </button>
              </div>

              <div className={styles.body}>
                <h2>{post.title}</h2>
                <p>{post.body}</p>
                <span className={styles.date}>{post.date}</span>
              </div>

              <div className={styles.actions}>
                <div className={styles.actionLeft}>
                  <button
                    type="button"
                    className={`${styles.action}${post.liked ? ` ${styles.actionOn}` : ''}`}
                    onClick={() => toggleLike(post.id)}
                    aria-label="点赞"
                  >
                    <HeartIcon filled={!!post.liked} />
                    <span>{post.likes}</span>
                  </button>
                  <button type="button" className={styles.action} aria-label="评论">
                    <CommentIcon />
                    <span>{post.comments}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.action}${post.starred ? ` ${styles.actionOn}` : ''}`}
                    onClick={() => toggleStar(post.id)}
                    aria-label="收藏"
                  >
                    <StarIcon filled={!!post.starred} />
                  </button>
                </div>
                <button type="button" className={styles.action} aria-label="分享">
                  <ShareIcon />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20s-6.5-4.1-8.8-7.8C1.5 9.4 2.8 6.2 6 5.4c1.8-.5 3.5.2 4.5 1.5C11.5 5.6 13.2 4.9 15 5.4c3.2.8 4.5 4 2.8 6.8C18.5 15.9 12 20 12 20Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-6.5-4.1-8.8-7.8C1.5 9.4 2.8 6.2 6 5.4c1.8-.5 3.5.2 4.5 1.5C11.5 5.6 13.2 4.9 15 5.4c3.2.8 4.5 4 2.8 6.8C18.5 15.9 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 17.2V8.8A2.8 2.8 0 0 1 8.3 6h7.4A2.8 2.8 0 0 1 18.5 8.8v5.2a2.8 2.8 0 0 1-2.8 2.8H9.2L5.5 19.5v-2.3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="m12 4.2 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.4l5-.7L12 4.2Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 4.2 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.4l5-.7L12 4.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 11.5 19 5.5l-4.2 14-3.3-5.2-5-2.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m11.5 14.3 7.5-8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
