import { useState } from 'react'
import type { GranularTrendSeries } from '../../domain/types'

interface NetworkPerformanceMatrixProps {
  points: GranularTrendSeries[]
  selectedPeriod?: string
  onSelect: (point: GranularTrendSeries) => void
  onPointContextMenu?: (event: React.MouseEvent, point: GranularTrendSeries) => void
}

const formatPercent = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')} phút`
const formatCount = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString('vi-VN')

export function NetworkPerformanceMatrix({ points, selectedPeriod, onSelect, onPointContextMenu }: NetworkPerformanceMatrixProps) {
  const available = points.filter((point) => !point.isFuture && point.wn !== null && point.averageDelay !== undefined)
  const [activePeriod, setActivePeriod] = useState<string | undefined>(selectedPeriod ?? available[0]?.period)
  if (available.length === 0) return <p className="chart-empty">Không có kỳ lịch sử phù hợp với bộ lọc.</p>

  const width = 720
  const height = 330
  const pad = { left: 64, right: 28, top: 28, bottom: 54 }
  const rates = available.map((point) => point.wn ?? 0)
  const delays = available.map((point) => point.averageDelay ?? 0)
  const counts = available.map((point) => point.eligibleCount ?? point.wnN ?? 0)
  const xMin = Math.max(0, Math.floor(Math.min(...rates) - 4))
  const xMax = Math.max(xMin + 5, Math.ceil(Math.max(...rates) + 4))
  const yMin = Math.min(0, Math.floor(Math.min(...delays) - 3))
  const yMax = Math.max(yMin + 5, Math.ceil(Math.max(...delays) + 3))
  const maxCount = Math.max(...counts, 1)
  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom
  const x = (value: number) => pad.left + ((value - xMin) / (xMax - xMin)) * innerWidth
  const y = (value: number) => pad.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight
  const radius = (value: number) => 7 + Math.sqrt(value / maxCount) * 10
  const baselineRate = available[0]?.baseline ?? 0
  const baselineDelay = available[0]?.baselineAvgDelay ?? 0
  const active = available.find((point) => point.period === activePeriod) ?? available[0]
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  const activate = (point: GranularTrendSeries) => {
    setActivePeriod(point.period)
    onSelect(point)
  }

  return (
    <div className="performance-matrix">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ma trận tỷ lệ trễ và độ trễ đến trung bình theo tháng">
        {ticks.map((tick) => {
          const gridX = pad.left + tick * innerWidth
          const gridY = pad.top + tick * innerHeight
          return (
            <g key={tick}>
              <line x1={gridX} x2={gridX} y1={pad.top} y2={height - pad.bottom} className="matrix-grid-line" />
              <line x1={pad.left} x2={width - pad.right} y1={gridY} y2={gridY} className="matrix-grid-line" />
              <text x={gridX} y={height - 27} textAnchor="middle" className="matrix-axis-label">{(xMin + tick * (xMax - xMin)).toFixed(0)}%</text>
              <text x={pad.left - 10} y={gridY + 4} textAnchor="end" className="matrix-axis-label">{(yMax - tick * (yMax - yMin)).toFixed(0)}p</text>
            </g>
          )
        })}
        <line x1={x(baselineRate)} x2={x(baselineRate)} y1={pad.top} y2={height - pad.bottom} className="matrix-baseline-line" />
        <line x1={pad.left} x2={width - pad.right} y1={y(baselineDelay)} y2={y(baselineDelay)} className="matrix-baseline-line" />
        <text x={width - pad.right} y={height - 7} textAnchor="end" className="matrix-axis-title">Tỷ lệ chuyến đến trễ</text>
        <text x={pad.left} y={15} className="matrix-axis-title">Độ trễ đến TB</text>
        {available.map((point) => {
          const isSelected = point.period === selectedPeriod
          const isActive = point.period === active.period
          const label = point.label.replace('/2018', '')
          return (
            <g key={point.period}>
              <circle
                data-analysis-unit={`overview-matrix-${point.period}`}
                cx={x(point.wn ?? 0)}
                cy={y(point.averageDelay ?? 0)}
                r={radius(point.eligibleCount ?? point.wnN ?? 0)}
                className={`matrix-point${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: tỷ lệ trễ ${formatPercent(point.wn)}, trễ ${formatCount(point.delayedCount)} trên ${formatCount(point.eligibleCount ?? point.wnN)} chuyến, độ trễ đến trung bình ${formatMinutes(point.averageDelay)}. Nhấn để chọn điểm phân tích.`}
                onMouseEnter={() => setActivePeriod(point.period)}
                onFocus={() => activate(point)}
                onClick={() => activate(point)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    activate(point)
                  }
                }}
                onContextMenu={(event) => onPointContextMenu?.(event, point)}
              />
              <text x={x(point.wn ?? 0)} y={y(point.averageDelay ?? 0) + 3} textAnchor="middle" className="matrix-point-label" aria-hidden="true">{label.replace('Tháng ', 'T')}</text>
            </g>
          )
        })}
      </svg>
      <div className="chart-evidence-popover" role="status" aria-live="polite">
        <strong>{active.label}</strong>
        <span>Tỷ lệ trễ: <b>{formatPercent(active.wn)}</b></span>
        <span>Chuyến đến trễ: <b>{formatCount(active.delayedCount)} / {formatCount(active.eligibleCount ?? active.wnN)}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.averageDelay)}</b></span>
      </div>
    </div>
  )
}
