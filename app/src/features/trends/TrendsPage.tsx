import { useMemo } from 'react'
import { useAppData } from '@/app/providers/AppDataProvider'
import {
  formatDelta,
  formatKg,
  formatRelativeDay,
  formatShortDate,
} from '@/shared/lib/format'
import styles from './TrendsPage.module.scss'

export function TrendsPage() {
  const { trend, measurements, profile } = useAppData()

  const chart = useMemo(() => buildChartPath(trend), [trend])

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.title}>趋势</div>
        <div className={styles.sub}>先看变化，再看数字 · {profile?.name ?? '小咪'}</div>
      </header>

      <section className={styles.chartCard} aria-label="体重趋势图">
        {chart ? (
          <svg className={styles.chart} viewBox="0 0 320 180" role="img">
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(196,165,116,0.35)" />
                <stop offset="100%" stopColor="rgba(196,165,116,0)" />
              </linearGradient>
            </defs>
            <path className={styles.area} d={chart.area} />
            <path className={styles.line} d={chart.line} />
            {chart.points.map((p) => (
              <circle key={p.key} className={styles.dot} cx={p.x} cy={p.y} r={4} />
            ))}
            <text className={styles.axis} x="8" y="18">
              {chart.maxLabel}
            </text>
            <text className={styles.axis} x="8" y="170">
              {chart.minLabel}
            </text>
          </svg>
        ) : (
          <p className={styles.sub}>还没有足够数据画出趋势</p>
        )}
      </section>

      <section className={styles.list}>
        {measurements.slice(0, 8).map((m) => (
          <div key={m.sessionId} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowDate}>{formatRelativeDay(m.lockedAt)}</span>
              <span className={styles.rowMeta}>{formatShortDate(m.lockedAt)}</span>
            </div>
            <span className={styles.rowDelta}>{formatDelta(m.deltaKg)}</span>
          </div>
        ))}
      </section>

      <details className={styles.detail}>
        <summary>查看绝对体重记录</summary>
        <div className={styles.detailBody}>
          {measurements.slice(0, 8).map((m) => (
            <div key={`abs-${m.sessionId}`} className={styles.row}>
              <span className={styles.rowDate}>{formatShortDate(m.lockedAt)}</span>
              <span className={styles.rowDelta}>{formatKg(m.weightKg)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function buildChartPath(trend: { date: string; weightKg: number }[]) {
  if (trend.length < 2) return null
  const w = 320
  const h = 180
  const padX = 18
  const padY = 24
  const weights = trend.map((t) => t.weightKg)
  const min = Math.min(...weights) - 0.05
  const max = Math.max(...weights) + 0.05
  const span = max - min || 1

  const points = trend.map((t, i) => {
    const x = padX + (i / (trend.length - 1)) * (w - padX * 2)
    const y = padY + (1 - (t.weightKg - min) / span) * (h - padY * 2)
    return { key: t.date + i, x, y }
  })

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${points.at(-1)!.x.toFixed(1)} ${h - 8} L ${points[0]!.x.toFixed(1)} ${h - 8} Z`

  return {
    line,
    area,
    points,
    minLabel: `${min.toFixed(2)} kg`,
    maxLabel: `${max.toFixed(2)} kg`,
  }
}
