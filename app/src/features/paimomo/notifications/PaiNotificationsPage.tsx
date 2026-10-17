import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  markAllPaiNoticesRead,
  markPaiNoticeRead,
  usePaiNotices,
  usePaiUnreadCount,
} from './paiNotificationsStore'
import styles from './PaiNotificationsPage.module.scss'

type Filter = '全部' | '未读'

export function PaiNotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('全部')
  const items = usePaiNotices()
  const unreadCount = usePaiUnreadCount()

  const list = useMemo(
    () => (filter === '未读' ? items.filter((n) => n.unread) : items),
    [filter, items],
  )

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="返回">
          ‹
        </button>
        <h1>通知</h1>
        <button
          type="button"
          className={styles.mark}
          onClick={markAllPaiNoticesRead}
          disabled={!unreadCount}
        >
          全部已读
        </button>
      </header>

      <div className={styles.tabs} role="tablist">
        {(['全部', '未读'] as Filter[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            className={`${styles.tab}${filter === tab ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
            {tab === '未读' && unreadCount > 0 ? <span>{unreadCount}</span> : null}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {list.length === 0 ? (
          <div className={styles.empty}>
            <p>暂时没有未读通知</p>
            <span>小咪会在有健康提醒或互动时叫你</span>
          </div>
        ) : (
          list.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`${styles.card}${n.unread ? ` ${styles.unread}` : ''}`}
              onClick={() => markPaiNoticeRead(n.id)}
            >
              <div className={styles.cardTop}>
                <span className={`${styles.kind} ${styles[`kind_${n.kind}`]}`}>{n.kind}</span>
                <time>{n.time}</time>
              </div>
              <h2>{n.title}</h2>
              <p>{n.body}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
