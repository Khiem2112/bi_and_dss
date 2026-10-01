import { useMemo, useState } from 'react'
import type { TrendPoint } from '../../domain/types'

interface LineChartProps {
  data: TrendPoint[]
  secondary?: boolean
  valueLabel?: string
  selectedPeriod?: string
  onSelect?: (point: TrendPoint) => void
}

const width = 800
const height = 200
const padding = { top: 24, right: 20, bottom: 38, left: 46 }

export function LineChart({
  data,
  secondary = false,
  valueLabel = 'Tỷ lệ đến trễ',
  selectedPeriod,
  onSelect,
}: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: TrendPoint; x: number; y: number } | null>(null)

  const geometry = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 30, x: () => 0, y: () => 0, points: '', baseline: '' }
    const values = data.flatMap((point) => (point.baseline === undefined ? [point.value] : [point.value, point.baseline]))
    const minValue = Math.floor(Math.min(...values, 0) / 5) * 5
    const maxValue = Math.ceil(Math.max(...values, 5) / 5) * 5
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const x = (index: number) => padding.left + (data.length === 1 ? innerWidth / 2 : index * innerWidth / (data.length - 1))
    const y = (value: number) => padding.top + (maxValue - value) * innerHeight / Math.max(maxValue - minValue, 1)
    const points = data.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')
    const baseline = data.every((point) => point.baseline !== undefined)
      ? data.map((point, index) => `${x(index)},${y(point.baseline ?? 0)}`).join(' ')
      : ''
    return { minValue, maxValue, x, y, points, baseline }
  }, [data])

  const gridValues = Array.from({ length: 5 }, (_, index) => geometry.minValue + (geometry.maxValue - geometry.minValue) * index / 4)

  if (data.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
        Không có dữ liệu xu hướng trong khoảng thời gian này.
      </div>
    )
  }

  return (
    <div className="line-chart-container" style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${valueLabel} qua ${data.length} kỳ`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        {gridValues.map((value) => {
          const y = geometry.y(value)
          return (
            <g key={value}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 3.5} textAnchor="end" className="chart-axis-label" style={{ fontSize: '9.5px', fill: 'var(--muted)' }}>
                {value.toFixed(0)}%
              </text>
            </g>
          )
        })}

        {geometry.baseline && (
          <polyline fill="none" stroke="#64748b" strokeWidth="1.8" strokeDasharray="6 4" points={geometry.baseline} opacity={0.7} />
        )}

        <polyline
          fill="none"
          stroke={secondary ? '#2563eb' : '#e11d48'}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={geometry.points}
        />

        {data.map((point, index) => {
          const cx = geometry.x(index)
          const cy = geometry.y(point.value)
          const isSelected = selectedPeriod === point.period

          return (
            <g
              key={point.period}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer' }}
              aria-label={`${point.period}: ${point.value.toFixed(1)}%, n ${point.n}`}
              onClick={() => onSelect?.(point)}
              onMouseEnter={() => setHoveredPoint({ point, x: cx, y: cy })}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint({ point, x: cx, y: cy })}
              onBlur={() => setHoveredPoint(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect?.(point)
                }
              }}
            >
              {isSelected && (
                <circle cx={cx} cy={cy} r={9} fill="none" stroke="#0f172a" strokeWidth="2.5" />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 5 : 4}
                fill="#ffffff"
                stroke={isSelected ? '#0f172a' : secondary ? '#2563eb' : '#e11d48'}
                strokeWidth={isSelected ? 3 : 2.5}
              />
              {(index % 2 === 0 || index === data.length - 1) && (
                <text x={cx} y={height - 12} textAnchor="middle" className="chart-axis-label" style={{ fontSize: '10px', fill: 'var(--ink)' }}>
                  {point.period}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {hoveredPoint && (
        <div
          className="line-chart-tooltip"
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max((hoveredPoint.x / width) * 100, 14), 86)}%`,
            top: `${Math.max(hoveredPoint.y - 8, 4)}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(4px)',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.45',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            whiteSpace: 'nowrap',
            zIndex: 25,
          }}
        >
          <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '3px', marginBottom: '3px', color: '#ffffff' }}>
            Mốc thời gian: {hoveredPoint.point.period}
          </div>
          <div>Tỷ lệ trễ: {hoveredPoint.point.value.toFixed(1)}% {hoveredPoint.point.gap !== undefined ? `(${hoveredPoint.point.gap >= 0 ? '+' : ''}${hoveredPoint.point.gap.toFixed(1)}%)` : ''}</div>
          <div>Số chuyến trễ: {hoveredPoint.point.delayedCount !== undefined ? `${hoveredPoint.point.delayedCount.toLocaleString('vi-VN')} / ` : ''}{hoveredPoint.point.n.toLocaleString('vi-VN')} chuyến</div>
          <div>Độ trễ trung bình: {hoveredPoint.point.averageDelay !== undefined ? `${hoveredPoint.point.averageDelay.toFixed(1)} phút` : '--'}</div>
          <div>Cỡ mẫu n: {hoveredPoint.point.n.toLocaleString('vi-VN')} chuyến</div>
        </div>
      )}
    </div>
  )
}
