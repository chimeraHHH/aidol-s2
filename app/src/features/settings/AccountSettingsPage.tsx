import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/useAuthSession'
import {
  formatUserLabel,
  maskPhone,
  useUserAccount,
} from './useUserAccount'
import styles from './SettingsPage.module.scss'

export function AccountSettingsPage() {
  const navigate = useNavigate()
  const { account, accounts, activeId, patch, switchAccount, removeAccount } =
    useUserAccount()
  const { logout } = useAuthSession()
  const [tip, setTip] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onLogout = () => {
    const ok = window.confirm('确定退出登录？退出后需重新进入猫窝。')
    if (!ok) return
    logout()
    navigate('/login', { replace: true })
  }

  const onDeleteAccount = (userId: string, label: string) => {
    const isCurrent = userId === activeId
    const lastOne = accounts.length <= 1
    const msg = lastOne
      ? `确定删除账号「${label}」？这是本机最后一个账号，删除后将退出登录。`
      : isCurrent
        ? `确定删除当前账号「${label}」？删除后将切换到其他账号。`
        : `确定删除账号「${label}」？本机相关建档与聊天记录也会清除。`
    if (!window.confirm(msg)) return

    setError(null)
    try {
      const result = removeAccount(userId)
      if (result.emptied) {
        logout()
        navigate('/login', { replace: true })
        return
      }
      setTip(
        result.switchedTo && isCurrent
          ? `已删除「${label}」，已切换到其他账号`
          : `已删除「${label}」`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />

      <header className={styles.subHeader}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/settings')}>
          ‹
        </button>
        <h1 className={styles.subTitle}>设置</h1>
        <span className={styles.subHeaderSpacer} aria-hidden />
      </header>

      <section className={styles.card} aria-label="当前账号详情">
        <div className={styles.cardHead}>
          <h3>账号详情</h3>
          <span className={styles.statusOn}>使用中</span>
        </div>
        <div className={styles.accountMeta}>
          <span className={styles.accountChip}>{formatUserLabel(account)}</span>
          <span className={styles.accountChip}>{maskPhone(account.phone)}</span>
        </div>
        <div className={styles.fieldStack}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>昵称</span>
            <input
              className={styles.fieldInput}
              value={account.displayName}
              maxLength={20}
              onChange={(e) => {
                patch({ displayName: e.target.value })
                setTip(null)
              }}
              placeholder="怎么称呼你"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>手机号</span>
            <input
              className={styles.fieldInput}
              inputMode="tel"
              value={account.phone}
              maxLength={11}
              onChange={(e) => {
                patch({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })
                setTip(null)
              }}
              placeholder="11 位手机号"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>邮箱（选填）</span>
            <input
              className={styles.fieldInput}
              type="email"
              value={account.email}
              onChange={(e) => {
                patch({ email: e.target.value.trim() })
                setTip(null)
              }}
              placeholder="name@example.com"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>账号 ID</span>
            <input className={styles.fieldInput} value={account.userId} disabled readOnly />
          </label>
        </div>
        <button
          type="button"
          className={styles.toggleRow}
          onClick={() => patch({ notifyPush: !account.notifyPush })}
          aria-pressed={account.notifyPush}
        >
          <div>
            <span className={styles.rowLabel}>推送通知</span>
            <span className={styles.rowHint}>体重提醒、亲密度变化等</span>
          </div>
          <span className={`${styles.switch}${account.notifyPush ? ` ${styles.switchOn}` : ''}`} />
        </button>
        <button
          type="button"
          className={styles.toggleRow}
          onClick={() => patch({ notifyWeigh: !account.notifyWeigh })}
          aria-pressed={account.notifyWeigh}
        >
          <div>
            <span className={styles.rowLabel}>测量完成提醒</span>
            <span className={styles.rowHint}>称重锁定后发送本地提醒</span>
          </div>
          <span className={`${styles.switch}${account.notifyWeigh ? ` ${styles.switchOn}` : ''}`} />
        </button>
        {tip ? <p className={styles.avatarTip}>{tip}</p> : null}
        {error ? <p className={styles.avatarError}>{error}</p> : null}
      </section>

      <section className={styles.card} aria-label="切换账号">
        <h3 className={styles.cardTitle}>切换账号</h3>
        <p className={styles.fieldHint} style={{ marginBottom: 8 }}>
          点选切换；右侧可删除该账号。
        </p>
        <ul className={styles.accountList}>
          {accounts.map((item) => {
            const active = item.userId === activeId
            const label = item.displayName || formatUserLabel(item)
            return (
              <li key={item.userId} className={styles.accountRow}>
                <button
                  type="button"
                  className={`${styles.accountItem}${active ? ` ${styles.accountItemOn}` : ''}`}
                  onClick={() => {
                    if (active) return
                    switchAccount(item.userId)
                    setTip(`已切换到 ${label}`)
                    setError(null)
                  }}
                >
                  <span className={styles.accountAvatar} aria-hidden>
                    {label.slice(0, 1)}
                  </span>
                  <span className={styles.accountItemCopy}>
                    <strong>{label}</strong>
                    <em>
                      {formatUserLabel(item)} · {maskPhone(item.phone)}
                    </em>
                  </span>
                  {active ? (
                    <span className={styles.accountCheck}>使用中</span>
                  ) : (
                    <span className={styles.rowChevron}>›</span>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.accountDelete}
                  aria-label={`删除 ${label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteAccount(item.userId, label)
                  }}
                >
                  删除
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={styles.card} aria-label="登录状态">
        <h3 className={styles.cardTitle}>登录状态</h3>
        <p className={styles.fieldHint} style={{ marginBottom: 12 }}>
          退出后回到登录页，账号仍保留；删除账号会清除本机该账号资料。
        </p>
        <div className={styles.dangerStack}>
          <button type="button" className={styles.btnLogout} onClick={onLogout}>
            退出登录
          </button>
          <button
            type="button"
            className={styles.btnDangerSolid}
            onClick={() =>
              onDeleteAccount(
                account.userId,
                account.displayName || formatUserLabel(account),
              )
            }
          >
            删除当前账号
          </button>
        </div>
      </section>
    </div>
  )
}
