import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { formatDelta } from '@/shared/lib/format'
import {
  SIM_ANALYSIS,
  SIM_XLSX_URL,
  simBoardSeries,
} from './data/kittenSim'
import {
  PERIODS,
  periodMeta,
  type SeriesPoint,
  type WeightPeriod,
} from './weightSeries'
import styles from './WeightBoard.module.scss'

interface WeightBoardProps {
  open: boolean
  onClose: () => void
  initialPeriod: WeightPeriod
  idealRange: { min: number; max: number }
  catName: string
}

const DAY_CHART_WINDOW = 28

export function WeightBoard({
  open,
  onClose,
  initialPeriod,
  idealRange,
  catName,
}: WeightBoardProps) {
  const [period, setPeriod] = useState<WeightPeriod>(initialPeriod)
  const [index, setIndex] = useState(() =>
    Math.max(0, simBoardSeries(initialPeriod).length - 1),
  )
  const drag = useRef<{ x: number; i: number; active: boolean } | null>(null)
  const fillId = useId().replace(/:/g, '')

  const series = useMemo(() => simBoardSeries(period), [period])
  const analysis = SIM_ANALYSIS
  const latestIndex = Math.max(0, series.length - 1)

  useEffect(() => {
    if (!open) return
    setPeriod(initialPeriod)
  }, [open, initialPeriod])

  // Sync to latest before paint so first frame isn't stuck at index 0
  useLayoutEffect(() => {
    setIndex(latestIndex)
  }, [period, latestIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(series.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, series.length])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const point = series[index] ?? null

  /** Day view: sliding 28-day window so the curve stays readable (not 90 flat dots). */
  const chartView = useMemo(
    () => buildChartWindow(series, index, period),
    [series, index, period],
  )

  const chart = useMemo(
    () =>
      buildScrubChart(
        chartView.trend,
        chartView.activeLocal,
        idealRange,
        period,
      ),
    [chartView, idealRange, period],
  )

  const go = useCallback(
    (next: number) => {
      if (!series.length) return
      setIndex(Math.max(0, Math.min(series.length - 1, next)))
    },
    [series.length],
  )

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!series.length) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, i: index, active: true }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d?.active) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) < 24) return
    const step = Math.round(-dx / 56)
    go(d.i + step)
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d?.active) return
    const dx = e.clientX - d.x
    if (dx <= -48) go(d.i + 1)
    else if (dx >= 48) go(d.i - 1)
    d.active = false
  }

  const [host, setHost] = useState<Element | null>(null)
  const [backdropReady, setBackdropReady] = useState(false)

  useEffect(() => {
    setHost(document.querySelector('[data-phone-screen]'))
  }, [open])

  useEffect(() => {
    if (!open) {
      setBackdropReady(false)
      return
    }
    const id = window.setTimeout(() => setBackdropReady(true), 280)
    return () => window.clearTimeout(id)
  }, [open])

  const inRange =
    point !== null &&
    point.weightKg >= idealRange.min &&
    point.weightKg <= idealRange.max

  if (!open) return null

  const board = (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="体重看板">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="关闭看板"
        onClick={() => {
          if (backdropReady) onClose()
        }}
      />
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="关闭">
            <ChevronLeftIcon />
          </button>
          <div className={styles.headCenter}>
            <div className={styles.headTitle}>体重看板</div>
            <div className={styles.headSub}>
              {catName} · Excel模拟分析 · {periodMeta(period).boardHint}
            </div>
          </div>
          <a className={styles.xlsxLink} href={SIM_XLSX_URL} download aria-label="下载Excel数据">
            <SheetIcon />
          </a>
        </header>

        <div className={styles.body}>
          <div className={styles.insightCard}>
            <div className={styles.insightScore}>
              <strong>{analysis.score}</strong>
              <span>{analysis.grade}</span>
            </div>
            <p className={styles.insightText}>{analysis.insight}</p>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="分析维度">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`${styles.tab}${period === p ? ` ${styles.tabOn}` : ''}`}
                onClick={() => setPeriod(p)}
              >
                {periodMeta(p).tab}
              </button>
            ))}
          </div>

          {point && series.length > 0 ? (
            <>
              <div
                className={styles.stage}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <div className={styles.date}>{point.title}</div>
                <div className={styles.valueRow}>
                  <span className={styles.value}>{point.weightKg.toFixed(2)}</span>
                  <span className={styles.unit}>kg</span>
                </div>
                <div className={styles.meta}>
                  <span>{formatDelta(point.deltaKg)}</span>
                  <span className={styles.metaDot} aria-hidden />
                  <span className={inRange ? styles.ok : styles.watch}>
                    {period === 'day'
                      ? inRange
                        ? '理想区间'
                        : '区间外'
                      : `${point.count} 次称重`}
                  </span>
                </div>

                <div className={styles.statChips} aria-label="分析指标">
                  <span>14日均 {analysis.stats.avg14dKg}</span>
                  <span>
                    30日变 {analysis.stats.monthDeltaKg > 0 ? '+' : ''}
                    {analysis.stats.monthDeltaKg}
                  </span>
                  <span>波动 {analysis.stats.volatility60d}</span>
                </div>
              </div>

              <div className={styles.chartBlock}>
                <div className={styles.chartHead}>
                  <span className={styles.chartTitle}>体重趋势</span>
                  <span className={styles.chartMeta}>
                    {period === 'day'
                      ? `近 ${chartView.trend.length} 日 · ${index + 1}/${series.length}`
                      : `${index + 1} / ${series.length}`}
                  </span>
                </div>
                {chart ? (
                  <svg
                    className={styles.chart}
                    viewBox="0 0 320 168"
                    role="img"
                    aria-label="体重趋势，可左右滑动切换"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    <defs>
                      <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(196,120,74,0.32)" />
                        <stop offset="100%" stopColor="rgba(196,120,74,0)" />
                      </linearGradient>
                    </defs>
                    {chart.band && (
                      <rect
                        className={styles.band}
                        x={chart.band.x}
                        y={chart.band.y}
                        width={chart.band.w}
                        height={chart.band.h}
                        rx="8"
                      />
                    )}
                    <path className={styles.area} d={chart.area} style={{ fill: `url(#${fillId})` }} />
                    <path className={styles.line} d={chart.line} />
                    {chart.cursor && (
                      <line
                        className={styles.cursor}
                        x1={chart.cursor.x}
                        x2={chart.cursor.x}
                        y1={8}
                        y2={140}
                      />
                    )}
                    {chart.points.map((p, i) => (
                      <circle
                        key={p.key}
                        className={i === chartView.activeLocal ? styles.dotHot : styles.dot}
                        cx={p.x}
                        cy={p.y}
                        r={i === chartView.activeLocal ? 6 : period === 'day' ? 2.6 : 3.2}
                        onClick={() => go(chartView.offset + i)}
                      />
                    ))}
                    {chart.ticks.map((t) => (
                      <text key={t.key} className={styles.tick} x={t.x} y={160} textAnchor="middle">
                        {t.label}
                      </text>
                    ))}
                  </svg>
                ) : (
                  <p className={styles.emptyChart}>数据不足，暂无法绘图</p>
                )}
                <p className={styles.hint}>左右滑动切换 · 点图表节点也可跳转</p>
              </div>

              <div className={styles.progress}>
                <div className={styles.progressBar} aria-hidden>
                  <i style={{ width: `${((index + 1) / series.length) * 100}%` }} />
                </div>
              </div>

              <div className={styles.nav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  disabled={index <= 0}
                  onClick={() => go(index - 1)}
                >
                  <ChevronLeftIcon />
                  上一条
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  disabled={index >= series.length - 1}
                  onClick={() => go(index + 1)}
                >
                  下一条
                  <ChevronRightIcon />
                </button>
              </div>

              <NeighborStrip series={series} index={index} onSelect={go} period={period} />

              <div className={styles.tableBlock} aria-label="近期数据表">
                <div className={styles.tableHead}>
                  <span>日期</span>
                  <span>体重</span>
                  <span>变化</span>
                </div>
                {[...chartView.trend].slice(-8).reverse().map((row) => {
                  const i = series.findIndex((s) => s.key === row.key)
                  const active = i === index
                  return (
                    <button
                      key={row.key}
                      type="button"
                      className={`${styles.tableRow}${active ? ` ${styles.tableRowOn}` : ''}`}
                      onClick={() => go(i)}
                    >
                      <span>{row.label}</span>
                      <span className={styles.tableKg}>{row.weightKg.toFixed(2)}</span>
                      <span className={deltaClass(row.deltaKg)}>{formatDelta(row.deltaKg)}</span>
                    </button>
                  )
                })}
              </div>

              <ul className={styles.highlights}>
                {analysis.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.empty}>暂无足够数据</p>
          )}
        </div>
      </div>
    </div>
  )

  return host ? createPortal(board, host) : board
}

function NeighborStrip({
  series,
  index,
  onSelect,
  period,
}: {
  series: SeriesPoint[]
  index: number
  onSelect: (i: number) => void
  period: WeightPeriod
}) {
  const start = Math.max(0, index - 2)
  const end = Math.min(series.length, index + 3)
  const slice = series.slice(start, end)

  return (
    <div className={styles.strip} aria-label="邻近数据">
      {slice.map((p, local) => {
        const i = start + local
        const active = i === index
        return (
          <button
            key={p.key}
            type="button"
            className={`${styles.stripItem}${active ? ` ${styles.stripOn}` : ''}`}
            onClick={() => onSelect(i)}
          >
            <span className={styles.stripLabel}>{p.label}</span>
            <span className={styles.stripVal}>
              {p.weightKg.toFixed(period === 'year' ? 2 : 2)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function buildChartWindow(
  series: SeriesPoint[],
  index: number,
  period: WeightPeriod,
): { trend: SeriesPoint[]; activeLocal: number; offset: number } {
  if (period !== 'day' || series.length <= DAY_CHART_WINDOW) {
    return { trend: series, activeLocal: index, offset: 0 }
  }
  const win = DAY_CHART_WINDOW
  let start = Math.max(0, index - win + 1)
  start = Math.min(start, series.length - win)
  return {
    trend: series.slice(start, start + win),
    activeLocal: index - start,
    offset: start,
  }
}

function buildScrubChart(
  trend: SeriesPoint[],
  active: number,
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
  const dataMin = Math.min(...weights)
  const dataMax = Math.max(...weights)
  // Keep vertical drama even when adult weights barely move
  const pad = Math.max(0.08, (dataMax - dataMin) * 0.35)
  const min = dataMin - pad
  const max = dataMax + pad
  const span = max - min || 1
  const yFor = (kg: number) => padTop + (1 - (kg - min) / span) * (h - padTop - padBottom)

  const points = trend.map((t, i) => {
    const x = padX + (i / (trend.length - 1)) * (w - padX * 2)
    return { key: t.key, x, y: yFor(t.weightKg) }
  })

  const line = smoothPath(points)
  const area = `${line} L ${points.at(-1)!.x.toFixed(1)} ${h - padBottom + 2} L ${points[0]!.x.toFixed(1)} ${h - padBottom + 2} Z`

  const showIdeal =
    period === 'day' && dataMin >= ideal.min - 0.25 && dataMax <= ideal.max + 0.25

  const tickN = Math.min(4, trend.length)
  const ticks = Array.from({ length: tickN }, (_, k) => {
    const i =
      tickN === 1 ? 0 : Math.round((k / (tickN - 1)) * (trend.length - 1))
    return { key: `tk-${trend[i].key}`, x: points[i].x, label: trend[i].label }
  })

  return {
    line,
    area,
    points,
    ticks,
    cursor: points[active] ? { x: points[active].x } : null,
    band: showIdeal
      ? {
          x: padX,
          y: yFor(ideal.max),
          w: w - padX * 2,
          h: Math.max(8, yFor(ideal.min) - yFor(ideal.max)),
        }
      : null,
  }
}

function deltaClass(delta: number | null | undefined): string {
  if (delta == null || delta === 0) return styles.deltaFlat
  if (delta > 0) return styles.deltaUp
  return styles.deltaDown
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.2 4.8 7 10l5.2 5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.8 4.8 13 10l-5.2 5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SheetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3.5" y="2.8" width="13" height="14.4" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.4 7h7.2M6.4 10.2h7.2M6.4 13.4h4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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
