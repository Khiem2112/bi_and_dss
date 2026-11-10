import { useState } from 'react'
import type { DelaySeverityBand } from '../../domain/types'

interface DelaySeverityDistributionProps {
  bands: DelaySeverityBand[]
  selectedId?: string
  onSelect: (band: DelaySeverityBand) => void
  onBandContextMenu?: (event: React.MouseEvent, band: DelaySeverityBand) => void
}

const colors = ['#86b7a8', '#8bb9dc', '#e9c46a', '#f4a261', '#d85b4a']
const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

const CX = 125
const CY = 125
const RADIUS = 76
const LABEL_RADIUS = 100
const TICK_INNER = 79
const TICK_OUTER = 90

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function piePath(startAngle: number, endAngle: number) {
  const start = polarPoint(CX, CY, RADIUS, endAngle)
  const end = polarPoint(CX, CY, RADIUS, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

export function DelaySeverityDistribution({ bands, selectedId, onSelect, onBandContextMenu }: DelaySeverityDistributionProps) {
  const [activeId, setActiveId] = useState<string | undefined>(selectedId ?? bands[0]?.id)
  const active = bands.find((band) => band.id === activeId) ?? bands[0]
  if (!active) return <p className="chart-empty">Không có chuyến bay đủ điều kiện để phân nhóm mức độ trễ.</p>

  const totalShare = bands.reduce((sum, band) => sum + band.share, 0)
  let angle = 0
  const slices = bands.map((band, index) => {
    const startAngle = angle
    const sliceAngle = totalShare > 0 ? (band.share / totalShare) * 360 : 0
    angle += sliceAngle
    const endAngle = angle
    const midAngle = startAngle + sliceAngle / 2
    return { band, index, startAngle, endAngle, midAngle }
  })

  const activate = (band: DelaySeverityBand) => {
    setActiveId(band.id)
    onSelect(band)
  }

  return (
    <div className="severity-chart severity-chart--pie">
      <div className="severity-pie-layout">
        <svg viewBox="0 0 250 250" className="severity-pie" role="img" aria-label="Biểu đồ tròn phân phối chuyến bay theo mức độ trễ đến">
          {/* Cac lat cat pie chart */}
          {slices.map(({ band, index, startAngle, endAngle }) => (
            <path
              key={band.id}
              d={piePath(startAngle, endAngle)}
              data-analysis-unit={`overview-severity-${band.id}`}
              className={`severity-pie-slice${band.id === active.id ? ' selected' : ''}`}
              style={{ fill: colors[index % colors.length] }}
              role="button"
              tabIndex={0}
              aria-label={`${band.label}, ${band.share.toFixed(1).replace('.', ',')}% số chuyến; tỷ lệ trễ ${formatPercent(band.metrics.delayRate)}; ${band.metrics.delayedFlights.toLocaleString('vi-VN')} chuyến trễ; độ trễ đến trung bình ${formatMinutes(band.metrics.averageArrivalDelayMinutes)}.`}
              onMouseEnter={() => setActiveId(band.id)}
              onFocus={() => activate(band)}
              onClick={() => activate(band)}
              onContextMenu={(event) => onBandContextMenu?.(event, band)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  activate(band)
                }
              }}
            />
          ))}

          {/* Cac nhan so phan tram o canh pie chart */}
          {slices.map(({ band, index, midAngle }) => {
            if (band.share < 2.5) return null
            const labelPos = polarPoint(CX, CY, LABEL_RADIUS, midAngle)
            const tickStart = polarPoint(CX, CY, TICK_INNER, midAngle)
            const tickEnd = polarPoint(CX, CY, TICK_OUTER, midAngle)
            const sliceColor = colors[index % colors.length]

            return (
              <g key={`label-${band.id}`} className="pie-label-group" pointerEvents="none">
                <line
                  x1={tickStart.x}
                  y1={tickStart.y}
                  x2={tickEnd.x}
                  y2={tickEnd.y}
                  stroke={sliceColor}
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y + 4}
                  textAnchor="middle"
                  fill={sliceColor}
                  style={{
                    fontWeight: 800,
                    fontSize: '11px',
                    userSelect: 'none',
                  }}
                >
                  {band.share.toFixed(1).replace('.', ',')}%
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend the hien label cua muc do den tre */}
        <div className="severity-legend" aria-label="Chú giải các mức độ trễ đến">
          {bands.map((band, index) => (
            <button
              key={band.id}
              type="button"
              className={band.id === active.id ? 'active' : ''}
              onClick={() => activate(band)}
              aria-label={`${band.label}: ${band.share.toFixed(1).replace('.', ',')}% số chuyến.`}
              data-tooltip-multiline
              data-tooltip={`${band.label}\n• Tỷ trọng: ${band.share.toFixed(1).replace('.', ',')}%\n• Tỷ lệ chuyến đến trễ: ${formatPercent(band.metrics.delayRate)}\n• Chuyến đến trễ: ${band.metrics.delayedFlights.toLocaleString('vi-VN')} / ${band.metrics.eligibleFlights.toLocaleString('vi-VN')}\n• Độ trễ đến trung bình: ${formatMinutes(band.metrics.averageArrivalDelayMinutes)}`}
            >
              <i className="severity-swatch" style={{ background: colors[index % colors.length] }} />
              <span className="severity-legend-name">{band.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chart-evidence-popover" role="status" aria-live="polite">
        <strong>{active.label}</strong>
        <span>Tỷ trọng trong phạm vi: <b>{active.share.toFixed(1).replace('.', ',')}%</b></span>
        <span>Tỷ lệ trễ trong nhóm: <b>{formatPercent(active.metrics.delayRate)}</b></span>
        <span>Chuyến đến trễ: <b>{active.metrics.delayedFlights.toLocaleString('vi-VN')} / {active.metrics.eligibleFlights.toLocaleString('vi-VN')}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.metrics.averageArrivalDelayMinutes)}</b></span>
      </div>
    </div>
  )
}
