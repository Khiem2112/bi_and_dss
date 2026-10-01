import { useMemo, useState } from 'react'
import type { TrendPoint } from '../../domain/types'

interface LineChartProps {
  data: TrendPoint[]
  secondary?: boolean
  valueLabel?: string
  onSelect?: (point: TrendPoint) => void
}

const width = 760
const height = 240
const padding = { top: 22, right: 22, bottom: 42, left: 48 }

export function LineChart({ data, secondary = false, valueLabel = 'Delay Rate', onSelect }: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const geometry = useMemo(() => {
    const values = data.flatMap((point) => point.baseline === undefined ? [point.value] : [point.value, point.baseline])
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

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${valueLabel} qua ${data.length} kỳ`}>
        {gridValues.map((value) => {
          const y = geometry.y(value)
          return (
            <g key={value}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{value.toFixed(0)}%</text>
            </g>
          )
        })}
        {geometry.baseline && <polyline fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="7 5" points={geometry.baseline} />}
        <polyline fill="none" stroke={secondary ? '#2563eb' : '#e11d48'} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" points={geometry.points} />
        {data.map((point, index) => {
          const x = geometry.x(index)
          const y = geometry.y(point.value)
          const selected = activeIndex === index
          return (
            <g
              key={point.period}
              tabIndex={0}
              role="button"
              aria-label={`${point.period}: ${point.value.toFixed(1)}%, n ${point.n}`}
              onClick={() => { setActiveIndex(index); onSelect?.(point) }}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveIndex(index)
                  onSelect?.(point)
                }
              }}
            >
              <circle cx={x} cy={y} r={selected ? 6 : 4} fill="#fff" stroke={secondary ? '#2563eb' : '#e11d48'} strokeWidth="3" />
              {(index % 2 === 0 || index === data.length - 1) && <text x={x} y={height - 15} textAnchor="middle" className="chart-axis-label">{point.period.slice(5)}</text>}
              {selected && (
                <g className="svg-tooltip">
                  <rect x={Math.min(Math.max(x - 61, 4), width - 128)} y={Math.max(y - 66, 4)} width="124" height="50" rx="8" />
                  <text x={Math.min(Math.max(x + 1, 66), width - 66)} y={Math.max(y - 44, 26)} textAnchor="middle">{point.period} · {point.value.toFixed(1)}%</text>
                  <text x={Math.min(Math.max(x + 1, 66), width - 66)} y={Math.max(y - 27, 43)} textAnchor="middle">n = {point.n.toLocaleString('vi-VN')}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
