import { useSyncExternalStore } from 'react'

export type PaiNotice = {
  id: string
  kind: '健康' | '互动' | '系统'
  title: string
  body: string
  time: string
  unread?: boolean
}

const INITIAL_NOTICES: PaiNotice[] = [
  {
    id: '1',
    kind: '健康',
    title: '疫苗提醒',
    body: '小咪的加强免疫建议在 10 月 25 日前完成，可去健康档案里更新记录。',
    time: '今天 09:20',
    unread: true,
  },
  {
    id: '2',
    kind: '健康',
    title: '体重波动提醒',
    body: '近 7 日体重较上周下降 0.2kg，建议多观察饮食与精神状态。',
    time: '昨天 18:40',
    unread: true,
  },
  {
    id: '3',
    kind: '互动',
    title: '团团的铲屎官 赞了你',
    body: '赞了你在宠友圈的动态「晒晒今天的小咪」。',
    time: '昨天 12:08',
  },
  {
    id: '4',
    kind: '系统',
    title: '智能设备已连接',
    body: '猫窝体重秤连接成功，可以开始今日测量啦。',
    time: '10/16',
  },
  {
    id: '5',
    kind: '互动',
    title: '灰灰的家长 评论了你',
    body: '「好可爱！你们家主子也爱趴窗台吗？」',
    time: '10/15',
  },
]

let notices: PaiNotice[] = INITIAL_NOTICES
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return notices
}

export function usePaiNotices() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function usePaiUnreadCount() {
  const items = usePaiNotices()
  return items.reduce((n, item) => n + (item.unread ? 1 : 0), 0)
}

export function markPaiNoticeRead(id: string) {
  notices = notices.map((n) => (n.id === id ? { ...n, unread: false } : n))
  emit()
}

export function markAllPaiNoticesRead() {
  notices = notices.map((n) => ({ ...n, unread: false }))
  emit()
}
