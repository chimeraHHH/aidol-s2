import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/app/providers/AppDataProvider'
import {
  formatDelta,
  formatKg,
  formatRelativeDay,
  formatShortDate,
} from '@/shared/lib/format'
import { buildHealthSnapshot, type LifestyleMetric } from './healthMock'
import { WeightBoard } from './WeightBoard'
import {
  SIM_ANALYSIS,
  SIM_IDEAL,
  simSeries,
} from './data/kittenSim'
import {
  PERIODS,
  periodMeta,
  type SeriesPoint,
  type WeightPeriod,
} from './weightSeries'
import styles from './TrendsPage.module.scss'

export function TrendsPage() {
  const navigate = useNavigate()
  const { measurements, profile, companion } = useAppData()
  const [period, setPeriod] = useState<WeightPeriod>('day')
  const [boardOpen, setBoardOpen] = useState(false)

  /** Summary chart: last 14 daily / 12 monthly / all yearly from Excel sim. */
  const series = useMemo(() => {
    const all = simSeries(period)
    if (period === 'day') return all.slice(-14)
    if (period === 'month') return all.slice(-12)
    return all
  }, [period])
  const meta = periodMeta(period)
  const analysis = SIM_ANALYSIS

  const latest = measurements[0] ?? null
  const rangeDelta = useMemo(() => {
    if (series.length < 2) return latest?.deltaKg ?? null
    return Number((series.at(-1)!.weightKg - series[0]!.weightKg).toFixed(2))
  }, [series, latest])

  const avgKg = useMemo(() => {
    if (!series.length) return null
    const sum = series.reduce((s, p) => s + p.weightKg, 0)
    return Number((sum / series.length).toFixed(2))
  }, [series])

  const checkCount = useMemo(
    () => series.reduce((s, p) => s + p.count, 0),
    [series],
  )

  const health = useMemo(
    () =>
      buildHealthSnapshot({
        name: profile?.name ?? analysis.catName,
        latestKg: latest?.weightKg ?? analysis.latest.weightKg,
        weekDelta: analysis.stats.weekDeltaKg,
        energy: companion?.energy ?? 78,
        mood: companion?.mood ?? 'curious',
      }),
    [profile?.name, latest?.weightKg, analysis, companion?.energy, companion?.mood],
  )

  const score = analysis.score
  const grade = analysis.grade
  const insight = analysis.insight
  const idealRange = SIM_IDEAL

  const chart = useMemo(
    () => buildChartPath(series, idealRange, period),
    [series, idealRange, period],
  )

  const inRange =
    latest !== null &&
    latest.weightKg >= idealRange.min &&
    latest.weightKg <= idealRange.max

  const sleep = health.lifestyle.find((m) => m.id === 'sleep')
  const rest = health.lifestyle.filter((m) => m.id !== 'sleep')

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />

      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>健康</h1>
          <p className={styles.sub}>{profile?.name ?? '小咪'}的身体节奏</p>
        </div>
        <button
          type="button"
          className={styles.weighLink}
          onClick={() => navigate('/weigh')}
        >
          <ScaleIcon />
          测量
        </button>
      </header>

      {/* 一屏总览：分数 + 洞察 */}
      <section className={styles.hero} aria-label="健康总览" style={{ ['--i' as string]: 0 }}>
        <div className={styles.heroMain}>
          <div className={styles.heroScore}>
            <span className={styles.scoreEyebrow}>健康指数</span>
            <span className={styles.scoreNum}>{score}</span>
            <span className={styles.scoreGrade}>{grade}</span>
          </div>
          <div
            className={styles.scoreRing}
            style={{ ['--score' as string]: `${score}%` }}
            aria-hidden
          >
            <img
              className={styles.scoreAvatar}
              src="/images/paimomo/cat-avatar.jpg"
              alt=""
              draggable={false}
            />
          </div>
        </div>
        <p className={styles.insight}>{insight}</p>
      </section>

      {/* 体重：主视觉 · 点击进入可滑动看板 */}
      <section className={styles.weight} aria-label="体重分析" style={{ ['--i' as string]: 1 }}>
        <div className={styles.weightTop}>
          <div>
            <div className={styles.weightLabel}>当前体重</div>
            <div className={styles.weightNow}>
              {latest ? (
                <>
                  <span className={styles.weightFig}>{latest.weightKg.toFixed(2)}</span>
                  <span className={styles.weightUnit}>kg</span>
                </>
              ) : (
                <span className={styles.weightFig}>—</span>
              )}
            </div>
            <div className={styles.weightMeta}>
              <span>{formatDelta(latest?.deltaKg ?? null)}</span>
              <span className={styles.metaDot} aria-hidden />
              <span className={inRange ? styles.metaOk : styles.metaWatch}>
                {inRange ? '理想区间' : '需关注'}
              </span>
            </div>
          </div>
          <div className={styles.rangeTabs} role="tablist" aria-label="分析维度">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`${styles.rangeTab}${period === p ? ` ${styles.rangeTabOn}` : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setPeriod(p)
                }}
              >
                {periodMeta(p).tab}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.chartHit}
          onPointerUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setBoardOpen(true)
          }}
          aria-label="打开体重看板，左右滑动查看每日或每月数据"
        >
          <div className={styles.chartWrap}>
            {chart ? (
              <svg className={styles.chart} viewBox="0 0 320 168" role="img" aria-hidden>
                <defs>
                  <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(196,120,74,0.22)" />
                    <stop offset="100%" stopColor="rgba(196,120,74,0)" />
                  </linearGradient>
                </defs>
                {chart.band && (
                  <rect
                    className={styles.idealBand}
                    x={chart.band.x}
                    y={chart.band.y}
                    width={chart.band.w}
                    height={chart.band.h}
                    rx="10"
                  />
                )}
                <path className={styles.area} d={chart.area} />
                <path className={styles.line} d={chart.line} />
                {chart.points.map((p, i) =>
                  i === chart.points.length - 1 ? (
                    <g key={p.key}>
                      <circle className={styles.dotGlow} cx={p.x} cy={p.y} r="8" />
                      <circle className={styles.dotHot} cx={p.x} cy={p.y} r="4.5" />
                    </g>
                  ) : (
                    <circle
                      key={p.key}
                      className={styles.dot}
                      cx={p.x}
                      cy={p.y}
                      r={period === 'day' ? 2.4 : 3.2}
                    />
                  ),
                )}
                {chart.ticks.map((t) => (
                  <text key={t.key} className={styles.tick} x={t.x} y={164} textAnchor="middle">
                    {t.label}
                  </text>
                ))}
              </svg>
            ) : (
              <p className={styles.emptyChart}>再测几次，趋势就会出现</p>
            )}
            <div className={styles.bandLegend}>
              <span className={styles.boardCue}>点进看板 · 左右滑动</span>
              <span aria-hidden>·</span>
              {period === 'day' && '近两周按日'}
              {period === 'month' && '近一年按月'}
              {period === 'year' && '长期按年'}
            </div>
          </div>
        </button>

        <div className={styles.statStrip} role="list">
          <div className={styles.stat} role="listitem">
            <span className={styles.statLabel}>{meta.avgLabel}</span>
            <span className={styles.statValue}>
              {avgKg !== null ? avgKg.toFixed(2) : '—'}
              <em>kg</em>
            </span>
          </div>
          <div className={styles.stat} role="listitem">
            <span className={styles.statLabel}>{meta.changeLabel}</span>
            <span
              className={`${styles.statValue}${
                rangeDelta !== null && Math.abs(rangeDelta) >= 0.06 ? ` ${styles.statAccent}` : ''
              }`}
            >
              {rangeDelta === null
                ? '—'
                : `${rangeDelta > 0 ? '+' : ''}${rangeDelta.toFixed(2)}`}
              <em>kg</em>
            </span>
          </div>
          <div className={styles.stat} role="listitem">
            <span className={styles.statLabel}>{meta.countLabel}</span>
            <span className={styles.statValue}>
              {period === 'day' ? checkCount : series.length}
              <em>{period === 'day' ? '次' : period === 'month' ? '月' : '年'}</em>
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.boardEntry}
          onPointerUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setBoardOpen(true)
          }}
        >
          进入体重看板
          <span aria-hidden>›</span>
        </button>
      </section>

      {boardOpen ? (
        <WeightBoard
          open
          onClose={() => setBoardOpen(false)}
          initialPeriod={period}
          idealRange={idealRange}
          catName={profile?.name ?? analysis.catName}
        />
      ) : null}

      {/* 日常：睡眠主，其余侧列 */}
      <section className={styles.life} aria-label="日常状态" style={{ ['--i' as string]: 2 }}>
        <h2 className={styles.sectionTitle}>日常节奏</h2>
        <div className={styles.lifeLayout}>
          {sleep && (
            <article className={`${styles.sleepFeature} ${toneClass(sleep.tone)}`}>
              <div className={styles.sleepHead}>
                <span className={styles.metricPic} aria-hidden>
                  <img src="/images/health/icon-sleep.jpg" alt="" />
                </span>
                <span className={styles.metricLabel}>睡眠</span>
              </div>
              <div className={styles.sleepValue}>
                {sleep.value}
                <span>{sleep.unit}</span>
              </div>
              <div className={styles.sleepBar} aria-hidden>
                <span style={{ width: `${sleep.score}%` }} />
              </div>
              <p className={styles.metricHint}>{sleep.hint}</p>
            </article>
          )}
          <div className={styles.lifeSide}>
            {rest.map((m) => (
              <article key={m.id} className={`${styles.sideMetric} ${toneClass(m.tone)}`}>
                <div className={styles.sideTop}>
                  {metricPic(m.id) ? (
                    <span className={styles.metricPic} aria-hidden>
                      <img src={metricPic(m.id)!} alt="" />
                    </span>
                  ) : (
                    <span className={styles.metricIcon} aria-hidden>
                      {metricIcon(m.id)}
                    </span>
                  )}
                  <span className={styles.metricLabel}>{m.label}</span>
                </div>
                <div className={styles.sideValue}>
                  {m.value}
                  <span>{m.unit}</span>
                </div>
                <div className={styles.sideBar} aria-hidden>
                  <span style={{ width: `${m.score}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 近期：分割线列表，无卡片堆叠 */}
      <section className={styles.recent} aria-label="近期体重变化" style={{ ['--i' as string]: 3 }}>
        <h2 className={styles.sectionTitle}>近期变化</h2>
        <ul className={styles.timeline}>
          {measurements.slice(0, 6).map((m) => (
            <li key={m.sessionId} className={styles.tlRow}>
              <div className={styles.tlMain}>
                <span className={styles.tlDay}>{formatRelativeDay(m.lockedAt)}</span>
                <span className={styles.tlMeta}>
                  {formatShortDate(m.lockedAt)} · {formatKg(m.weightKg)}
                </span>
              </div>
              <span
                className={`${styles.tlDelta}${
                  m.deltaKg !== null && m.deltaKg > 0
                    ? ` ${styles.up}`
                    : m.deltaKg !== null && m.deltaKg < 0
                      ? ` ${styles.down}`
                      : ''
                }`}
              >
                {formatDelta(m.deltaKg)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function toneClass(tone: LifestyleMetric['tone']): string {
  if (tone === 'good') return styles.toneGood
  if (tone === 'watch') return styles.toneWatch
  return styles.toneOk
}

function metricPic(id: LifestyleMetric['id']): string | null {
  switch (id) {
    case 'sleep':
      return '/images/health/icon-sleep.jpg'
    case 'activity':
      return '/images/health/icon-activity.jpg'
    case 'appetite':
      return '/images/health/icon-appetite.jpg'
    default:
      return null
  }
}

function ScaleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3.2" y="11.2" width="13.6" height="4.2" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6.2 7.2c1.1-1.6 2.4-2.4 3.8-2.4s2.7.8 3.8 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function metricIcon(id: LifestyleMetric['id']): ReactNode {
  switch (id) {
    case 'sleep':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M17.5 14.2A6.2 6.2 0 0 1 9.8 6.5 7 7 0 1 0 17.5 14.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'activity':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="8" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="15.5" cy="7.5" r="1.7" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16.2" cy="14.2" r="2.3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9.2" cy="16.5" r="1.6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'appetite':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20s-6.5-4.2-6.5-9.2A3.8 3.8 0 0 1 12 8.2a3.8 3.8 0 0 1 6.5 2.6C18.5 15.8 12 20 12 20Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'energy':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M13 3 6.5 13.5h5L11 21l6.5-10.5h-5L13 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

function buildChartPath(
  trend: SeriesPoint[],
  ideal: { min: number; max: number },
  period: WeightPeriod,
) {
  if (trend.length < 2) return null
  const w = 320
  const h = 168
  const padX = 14
  const padTop = 14
  const padBottom = 28
  const weights = trend.map((t) => t.weightKg)
  // Year/month span more; keep ideal band only meaningful for adult range near now
  const dataMin = Math.min(...weights)
  const dataMax = Math.max(...weights)
  // Amplify small adult-weight drifts so the curve stays readable
  const pad = Math.max(0.1, (dataMax - dataMin) * 0.45)
  const min = dataMin - pad
  const max = dataMax + pad
  const span = max - min || 1

  const yFor = (kg: number) => padTop + (1 - (kg - min) / span) * (h - padTop - padBottom)

  const points = trend.map((t, i) => {
    const x = padX + (i / (trend.length - 1)) * (w - padX * 2)
    const y = yFor(t.weightKg)
    return { key: t.key, x, y }
  })

  const line = smoothPath(points)
  const area = `${line} L ${points.at(-1)!.x.toFixed(1)} ${h - padBottom + 4} L ${points[0]!.x.toFixed(1)} ${h - padBottom + 4} Z`

  const showIdeal =
    period === 'day' && dataMin >= ideal.min - 0.15 && dataMax <= ideal.max + 0.15
  const bandTop = yFor(ideal.max)
  const bandBottom = yFor(ideal.min)

  const tickIdx = pickTickIndexes(trend.length, period)
  const ticks = tickIdx.map((i) => ({
    key: `t-${trend[i].key}`,
    x: points[i].x,
    label: trend[i].label,
  }))

  return {
    line,
    area,
    points,
    ticks,
    band: showIdeal
      ? {
          x: padX,
          y: bandTop,
          w: w - padX * 2,
          h: Math.max(8, bandBottom - bandTop),
        }
      : null,
  }
}

function pickTickIndexes(n: number, period: WeightPeriod): number[] {
  if (n <= 1) return [0]
  if (n <= 4) return Array.from({ length: n }, (_, i) => i)
  if (period === 'year') return Array.from({ length: n }, (_, i) => i)
  if (period === 'month') {
    const step = Math.max(1, Math.floor((n - 1) / 5))
    const idxs = [0]
    for (let i = step; i < n - 1; i += step) idxs.push(i)
    idxs.push(n - 1)
    return [...new Set(idxs)]
  }
  // day: first, mid-ish, last
  return [0, Math.floor((n - 1) / 2), n - 1]
}

/** Catmull-Rom-ish smooth polyline for a calmer chart. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}
