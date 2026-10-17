import { useState } from 'react'
import { PaiHeader } from '../components/PaiHeader'
import styles from './PaiDiscoverPage.module.scss'

const TABS = ['养宠知识', '推荐', '关注'] as const

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

type PaiDiscoverPageProps = {
  /** 嵌在小咪 AppLayout 内时使用，随内容撑开完整滚动 */
  embed?: boolean
}

export function PaiDiscoverPage({ embed = false }: PaiDiscoverPageProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('推荐')
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

  return (
    <div className={`${styles.page}${embed ? ` ${styles.embed}` : ''}`}>
      <PaiHeader />

      <div className={styles.filters} role="tablist" aria-label="发现筛选">
        <button type="button" className={styles.searchBtn} aria-label="搜索">
          <SearchIcon />
        </button>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`${styles.chip}${activeTab === tab ? ` ${styles.chipActive}` : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

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
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
