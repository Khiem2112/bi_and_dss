import { useMemo, useState } from 'react'
import type { YearMonthDelayPoint } from '../../domain/types'

interface YearMonthComparisonChartProps {
  points: YearMonthDelayPoint[]
  selectedPeriod?: string
  onSelect: (point: YearMonthDelayPoint) => void
  onPointContextMenu?: (event: React.MouseEvent<SVGGElement>, point: YearMonthDelayPoint) => void
}

const width = 900
const height = 300
const padding = { top: 36, right: 24, bottom: 42, left: 48 }
const seriesColors = ['#2563eb', '#0f766e', '#d97706', '#d9483b', '#7c3aed', '#64748b']
const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

export function YearMonthComparisonChart({ points, selectedPeriod, onSelect, onPointContextMenu }: YearMonthComparisonChartProps) {
  const [activePeriod, setActivePeriod] = useState(selectedPeriod ?? points[points.length - 1]?.period)
  const active = points.find((point) => point.period === activePeriod) ?? points[points.length - 1]
  const years = useMemo(() => [...new Set(points.map((point) => point.year))].sort(), [points])
  if (points.length === 0 || !active) return <p className="chart-empty">Không có dữ liệu tháng trong phạm vi phân tích.</p>

  const maxRate = Math.max(30, ...points.map((point) => point.metrics.delayRate ?? 0))
  const chartCeil = Math.ceil((maxRate + 4) / 5) * 5
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const x = (month: number) => padding.left + ((month - 1) / 11) * innerWidth
  const y = (rate: number) => padding.top + (chartCeil - rate) / chartCeil * innerHeight
  const activate = (point: YearMonthDelayPoint) => {
    setActivePeriod(point.period)
    onSelect(point)
  }

  return (
    <div className="year-month-chart">
      <div className="year-month-legend" aria-label="Chú giải năm">
        {years.map((year, index) => <span key={year}><i style={{ background: seriesColors[index % seriesColors.length] }} />{year}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="So sánh tỷ lệ chuyến đến trễ theo tháng giữa các năm">
        {[0, 10, 20, 30, chartCeil].filter((value, index, values) => value <= chartCeil && values.indexOf(value) === index).map((tick) => (
          <g key={tick}>
            <line className="year-month-grid" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-axis-label" x={padding.left - 8} y={y(tick) + 4} textAnchor="end">{tick}%</text>
          </g>
        ))}
        {monthLabels.map((label, index) => <text key={label} className="chart-axis-label" x={x(index + 1)} y={height - 15} textAnchor="middle">{label}</text>)}
        {years.map((year, yearIndex) => {
          const yearPoints = points.filter((point) => point.year === year).sort((a, b) => a.month - b.month)
          const polyline = yearPoints.filter((point) => point.metrics.delayRate !== null).map((point) => `${x(point.month)},${y(point.metrics.delayRate ?? 0)}`).join(' ')
          const color = seriesColors[yearIndex % seriesColors.length]
          return (
            <g key={year}>
              <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {yearPoints.map((point) => {
                const rate = point.metrics.delayRate
                if (rate === null) return null
                const isSelected = point.period === selectedPeriod
                return (
                  <g
                    key={point.period}
                    data-analysis-unit={`overview-year-month-${point.period}`}
                    role="button"
                    tabIndex={0}
                    className={`year-month-point${isSelected ? ' selected' : ''}`}
                    aria-label={`${point.label}: tỷ lệ trễ ${formatPercent(rate)}; ${point.metrics.delayedFlights.toLocaleString('vi-VN')} chuyến trễ trên ${point.metrics.eligibleFlights.toLocaleString('vi-VN')} chuyến đủ điều kiện; độ trễ đến trung bình ${formatMinutes(point.metrics.averageArrivalDelayMinutes)}.`}
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
                  >
                    <circle cx={x(point.month)} cy={y(rate)} r={isSelected ? 6 : 4.5} fill={color} />
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <div className="chart-evidence-popover" role="status" aria-live="polite">
        <strong>{active.label}</strong>
        <span>Tỷ lệ chuyến đến trễ: <b>{formatPercent(active.metrics.delayRate)}</b></span>
        <span>Chuyến đến trễ: <b>{active.metrics.delayedFlights.toLocaleString('vi-VN')} / {active.metrics.eligibleFlights.toLocaleString('vi-VN')}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.metrics.averageArrivalDelayMinutes)}</b></span>
      </div>
    </div>
  )
}
