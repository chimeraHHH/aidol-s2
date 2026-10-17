import { useAppData } from '@/app/providers/AppDataProvider'
import { Button } from '@/shared/components/Button/Button'
import styles from './SettingsPage.module.scss'

export function SettingsPage() {
  const { profile, device, connectDevice } = useAppData()

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.title}>我的</div>
      </header>

      <section className={styles.profile}>
        <img
          className={styles.avatar}
          src="/images/xiaomi-product.jpg"
          alt=""
        />
        <div>
          <div className={styles.profileName}>{profile?.name ?? '咪酱'}</div>
          <div className={styles.profileMeta}>
            {profile?.breed} · 生日 {profile?.birthday}
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>设备</span>
          <span className={styles.rowValue}>{device?.name ?? '小咪'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>固件</span>
          <span className={styles.rowValue}>{device?.firmware ?? '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>连接状态</span>
          <span className={styles.rowValue}>
            {device?.connection === 'connected' ? '已连接' : '未连接'}
          </span>
        </div>
      </section>

      {device?.connection !== 'connected' && (
        <Button block onClick={() => void connectDevice()}>
          重新连接设备
        </Button>
      )}

      <section className={styles.group}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>默认展示</span>
          <span className={styles.rowValue}>差值优先</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>隐私</span>
          <span className={styles.rowValue}>本地优先 · 不朗读体重</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>架构</span>
          <span className={styles.rowValue}>Mock BLE · 可替换</span>
        </div>
      </section>

      <p className={styles.note}>
        当前为演示层：设备服务与仓储通过接口注入。后续接入真实 BLE / 云端时，只需替换
        `services/createServices.ts` 中的实现，无需改动页面。
      </p>
    </div>
  )
}
