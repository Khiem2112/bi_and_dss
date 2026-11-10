import { useRef, useState } from 'react'
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

const CX = 120
const CY = 120
const RADIUS = 100

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

function getTooltipPlacementStyle(x: number, y: number, container: HTMLDivElement | null): React.CSSProperties {
  if (!container) {
    return {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(14px, -50%)',
    }
  }

  const rect = container.getBoundingClientRect()
  const isRightHalf = x > rect.width * 0.52
  const isTopClose = y < 55
  const isBottomClose = y > rect.height - 65

  const translateX = isRightHalf ? '-105%' : '14px'
  let translateY = '-50%'
  if (isTopClose) {
    translateY = '8px'
  } else if (isBottomClose) {
    translateY = '-95%'
  }

  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: `translate(${translateX}, ${translateY})`,
  }
}

export function DelaySeverityDistribution({ bands, selectedId, onSelect, onBandContextMenu }: DelaySeverityDistributionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | undefined>(selectedId ?? bands[0]?.id)
  const [hoveredSlice, setHoveredSlice] = useState<{
    band: DelaySeverityBand
    color: string
    x: number
    y: number
  } | null>(null)

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

  const handleSliceMouseMove = (event: React.MouseEvent<SVGPathElement>, band: DelaySeverityBand, index: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setHoveredSlice({
      band,
      color: colors[index % colors.length],
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const handleSliceMouseEnter = (event: React.MouseEvent<SVGPathElement>, band: DelaySeverityBand, index: number) => {
    setActiveId(band.id)
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setHoveredSlice({
      band,
      color: colors[index % colors.length],
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const handleSliceFocus = (event: React.FocusEvent<SVGPathElement>, band: DelaySeverityBand, index: number) => {
    activate(band)
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const sliceRect = event.currentTarget.getBoundingClientRect()
    setHoveredSlice({
      band,
      color: colors[index % colors.length],
      x: sliceRect.left - containerRect.left + sliceRect.width / 2,
      y: sliceRect.top - containerRect.top + sliceRect.height / 2,
    })
  }

  return (
    <div ref={containerRef} className="severity-chart severity-chart--pie">
      <div className="severity-pie-layout">
        <svg
          viewBox="0 0 240 240"
          className="severity-pie"
          role="img"
          aria-label="Biểu đồ tròn phân phối chuyến bay theo mức độ trễ đến"
          onMouseLeave={() => setHoveredSlice(null)}
        >
          {/* Cac lat cat pie chart */}
          {slices.map(({ band, index, startAngle, endAngle }) => (
            <path
              key={band.id}
              d={piePath(startAngle, endAngle)}
              data-analysis-unit={`overview-severity-${band.id}`}
              className={`severity-pie-slice${band.id === (hoveredSlice?.band.id ?? active.id) ? ' selected' : ''}`}
              style={{ fill: colors[index % colors.length] }}
              role="button"
              tabIndex={0}
              aria-label={`${band.label}, ${band.share.toFixed(1).replace('.', ',')}% số chuyến; tỷ lệ trễ ${formatPercent(band.metrics.delayRate)}; ${band.metrics.delayedFlights.toLocaleString('vi-VN')} chuyến trễ; độ trễ đến trung bình ${formatMinutes(band.metrics.averageArrivalDelayMinutes)}.`}
              onMouseEnter={(event) => handleSliceMouseEnter(event, band, index)}
              onMouseMove={(event) => handleSliceMouseMove(event, band, index)}
              onMouseLeave={() => setHoveredSlice(null)}
              onFocus={(event) => handleSliceFocus(event, band, index)}
              onBlur={() => setHoveredSlice(null)}
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

          {/* Nhan ty le phan tram truc tiep tren cac lat cat co ty trong lon */}
          {slices.map(({ band, midAngle }) => {
            if (band.share < 7) return null
            const labelPos = polarPoint(CX, CY, RADIUS * 0.65, midAngle)
            const isDark = band.id === 'delay-15-29'
            return (
              <text
                key={`label-${band.id}`}
                x={labelPos.x}
                y={labelPos.y + 4}
                textAnchor="middle"
                fill={isDark ? '#1e293b' : '#ffffff'}
                pointerEvents="none"
                style={{
                  fontWeight: 800,
                  fontSize: band.share > 20 ? '13px' : '11px',
                  userSelect: 'none',
                  textShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.5)',
                }}
              >
                {band.share.toFixed(1).replace('.', ',')}%
              </text>
            )
          })}
        </svg>

        {/* Legend the hien label va ty trong cua tung muc do */}
        <div className="severity-legend" aria-label="Chú giải các mức độ trễ đến">
          {bands.map((band, index) => (
            <button
              key={band.id}
              type="button"
              className={band.id === (hoveredSlice?.band.id ?? active.id) ? 'active' : ''}
              onClick={() => activate(band)}
              onMouseEnter={() => setActiveId(band.id)}
              aria-label={`${band.label}: ${band.share.toFixed(1).replace('.', ',')}% số chuyến.`}
              data-tooltip-multiline
              data-tooltip={`${band.label}\n- Tỷ trọng: ${band.share.toFixed(1).replace('.', ',')}%\n- Số chuyến bay: ${band.metrics.eligibleFlights.toLocaleString('vi-VN')} chuyến\n- Độ trễ đến trung bình: ${formatMinutes(band.metrics.averageArrivalDelayMinutes)}`}
            >
              <i className="severity-swatch" style={{ background: colors[index % colors.length] }} />
              <span className="severity-legend-name">{band.label}</span>
              <strong className="severity-legend-value">{band.share.toFixed(1).replace('.', ',')}%</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip hien thi thong so khi hover lat cat pie chart */}
      {hoveredSlice && (
        <div
          className="severity-pie-tooltip"
          role="tooltip"
          style={getTooltipPlacementStyle(hoveredSlice.x, hoveredSlice.y, containerRef.current)}
        >
          <div className="severity-pie-tooltip-header">
            <span className="severity-pie-tooltip-swatch" style={{ background: hoveredSlice.color }} />
            <strong className="severity-pie-tooltip-title">{hoveredSlice.band.label}</strong>
          </div>
          <div className="severity-pie-tooltip-body">
            <div className="severity-pie-tooltip-row">
              <span className="severity-pie-tooltip-label">Tỷ trọng trong phạm vi:</span>
              <span className="severity-pie-tooltip-val">{hoveredSlice.band.share.toFixed(1).replace('.', ',')}%</span>
            </div>
            <div className="severity-pie-tooltip-row">
              <span className="severity-pie-tooltip-label">Số chuyến bay:</span>
              <span className="severity-pie-tooltip-val">
                {hoveredSlice.band.metrics.eligibleFlights.toLocaleString('vi-VN')} chuyến
              </span>
            </div>
            <div className="severity-pie-tooltip-row">
              <span className="severity-pie-tooltip-label">Độ trễ đến trung bình:</span>
              <span className="severity-pie-tooltip-val">{formatMinutes(hoveredSlice.band.metrics.averageArrivalDelayMinutes)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
