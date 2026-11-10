import { useMemo, useState } from 'react'
import type { YearMonthDelayPoint } from '../../domain/types'

interface YearMonthComparisonChartProps {
  points: YearMonthDelayPoint[]
  selectedPeriod?: string
  onSelect: (point: YearMonthDelayPoint) => void
  onPointContextMenu?: (event: React.MouseEvent<SVGGElement>, point: YearMonthDelayPoint) => void
}

const width = 900
const padding = { top: 38, right: 24, bottom: 32, left: 60 }
const cellGap = 5
const cellHeight = 44
const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
const monthFullNames = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

function getHeatmapColor(rate: number | null): { bg: string; text: string; border: string } {
  if (rate === null) return { bg: '#f1f5f9', text: '#94a3b8', border: '#e2e8f0' }
  if (rate < 15) return { bg: '#60a5fa', text: '#ffffff', border: '#3b82f6' }
  if (rate < 18) return { bg: '#2dd4bf', text: '#042f2e', border: '#14b8a6' }
  if (rate < 21) return { bg: '#fbbf24', text: '#451a03', border: '#f59e0b' }
  if (rate < 25) return { bg: '#fb923c', text: '#431407', border: '#f97316' }
  return { bg: '#f87171', text: '#ffffff', border: '#ef4444' }
}

const HEATMAP_LEGEND = [
  { label: '< 15%', color: '#60a5fa', text: '#ffffff' },
  { label: '15% - 18%', color: '#2dd4bf', text: '#042f2e' },
  { label: '18% - 21%', color: '#fbbf24', text: '#451a03' },
  { label: '21% - 25%', color: '#fb923c', text: '#431407' },
  { label: '≥ 25%', color: '#f87171', text: '#ffffff' },
]

export function YearMonthComparisonChart({ points, selectedPeriod, onSelect, onPointContextMenu }: YearMonthComparisonChartProps) {
  const [activePeriod, setActivePeriod] = useState(selectedPeriod ?? points[points.length - 1]?.period)
  const active = points.find((point) => point.period === activePeriod) ?? points[points.length - 1]
  const years = useMemo(() => [...new Set(points.map((point) => point.year))].sort(), [points])

  if (points.length === 0 || !active) {
    return <p className="chart-empty">Không có dữ liệu tháng trong phạm vi phân tích.</p>
  }

  const innerWidth = width - padding.left - padding.right
  const cellWidth = (innerWidth - 11 * cellGap) / 12
  const svgHeight = padding.top + years.length * (cellHeight + cellGap) + padding.bottom

  const activate = (point: YearMonthDelayPoint) => {
    setActivePeriod(point.period)
    onSelect(point)
  }

  const matrix = useMemo(() => {
    const map = new Map<string, YearMonthDelayPoint>()
    for (const pt of points) {
      map.set(`${pt.year}-${pt.month}`, pt)
    }
    return map
  }, [points])

  return (
    <div className="year-month-chart year-month-heatmap">
      <div className="year-month-chart-header">
        <div className="combo-chart-titles">
          <span className="section-title-tag">Ma trận nhiệt</span>
          <strong>Ma trận tỷ lệ chuyến đến trễ theo tháng và năm</strong>
          <small className="chart-sub-note">Trục ngang là các tháng (T1 - T12), trục dọc là các năm; chọn ô để mở phân tích chi tiết.</small>
        </div>
        <div className="heatmap-legend" aria-label="Chú giải dải màu tỷ lệ trễ">
          <span className="heatmap-legend-title">Tỷ lệ trễ:</span>
          {HEATMAP_LEGEND.map((item) => (
            <span key={item.label} className="heatmap-legend-item">
              <i style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="year-month-chart-canvas">
        <svg viewBox={`0 0 ${width} ${svgHeight}`} role="img" aria-label="Ma trận nhiệt tỷ lệ chuyến đến trễ theo tháng và năm">
          {/* Nhan truc X: Cac thang */}
          {monthLabels.map((label, monthIndex) => {
            const x = padding.left + monthIndex * (cellWidth + cellGap) + cellWidth / 2
            return (
              <text
                key={label}
                className="chart-axis-label"
                x={x}
                y={padding.top - 12}
                textAnchor="middle"
                style={{ fontWeight: 600, fontSize: '12px', fill: 'var(--ink)' }}
              >
                {label}
              </text>
            )
          })}

          {/* Cac hang: Moi hang la 1 nam */}
          {years.map((year, yearIndex) => {
            const y = padding.top + yearIndex * (cellHeight + cellGap)

            return (
              <g key={year}>
                {/* Nhan truc Y: Nam */}
                <text
                  className="chart-axis-label"
                  x={padding.left - 12}
                  y={y + cellHeight / 2 + 5}
                  textAnchor="end"
                  style={{ fontWeight: 700, fontSize: '13px', fill: 'var(--ink)' }}
                >
                  {year}
                </text>

                {/* Cac o thang trong nam */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month, monthIndex) => {
                  const x = padding.left + monthIndex * (cellWidth + cellGap)
                  const point = matrix.get(`${year}-${month}`)
                  const rate = point?.metrics.delayRate ?? null
                  const colorScheme = getHeatmapColor(rate)
                  const isSelected = point?.period === selectedPeriod || point?.period === activePeriod

                  if (!point) {
                    return (
                      <rect
                        key={`${year}-${month}`}
                        x={x}
                        y={y}
                        width={cellWidth}
                        height={cellHeight}
                        rx="4"
                        fill="#f8fafc"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                    )
                  }

                  return (
                    <g
                      key={point.period}
                      data-analysis-unit={`overview-year-month-${point.period}`}
                      role="button"
                      tabIndex={0}
                      className={`heatmap-cell${isSelected ? ' selected' : ''}`}
                      aria-label={`${monthFullNames[month - 1]} năm ${year}: tỷ lệ trễ ${formatPercent(rate)}; ${point.metrics.delayedFlights.toLocaleString('vi-VN')} chuyến trễ trên ${point.metrics.eligibleFlights.toLocaleString('vi-VN')} chuyến đủ điều kiện; độ trễ đến trung bình ${formatMinutes(point.metrics.averageArrivalDelayMinutes)}.`}
                      onMouseEnter={() => setActivePeriod(point.period)}
                      onFocus={() => activate(point)}
                      onClick={() => activate(point)}
                      onContextMenu={(event) => onPointContextMenu?.(event, point)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          activate(point)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={cellWidth}
                        height={cellHeight}
                        rx="4"
                        fill={colorScheme.bg}
                        stroke={isSelected ? '#0f172a' : colorScheme.border}
                        strokeWidth={isSelected ? 2.5 : 1}
                      />
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 + 5}
                        textAnchor="middle"
                        fill={colorScheme.text}
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        {formatPercent(rate)}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="chart-evidence-popover" role="status" aria-live="polite">
        <strong>{active.label}</strong>
        <span>Tỷ lệ chuyến đến trễ: <b>{formatPercent(active.metrics.delayRate)}</b></span>
        <span>Chuyến đến trễ: <b>{active.metrics.delayedFlights.toLocaleString('vi-VN')} / {active.metrics.eligibleFlights.toLocaleString('vi-VN')}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.metrics.averageArrivalDelayMinutes)}</b></span>
      </div>
    </div>
  )
}
