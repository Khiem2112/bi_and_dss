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

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function piePath(startAngle: number, endAngle: number) {
  const start = polarPoint(112, 112, 94, endAngle)
  const end = polarPoint(112, 112, 94, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M 112 112 L ${start.x} ${start.y} A 94 94 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

export function DelaySeverityDistribution({ bands, selectedId, onSelect, onBandContextMenu }: DelaySeverityDistributionProps) {
  const [activeId, setActiveId] = useState<string | undefined>(selectedId ?? bands[0]?.id)
  const active = bands.find((band) => band.id === activeId) ?? bands[0]
  if (!active) return <p className="chart-empty">Không có chuyến bay đủ điều kiện để phân nhóm mức độ trễ.</p>

  const totalShare = bands.reduce((sum, band) => sum + band.share, 0)
  let angle = 0
  const slices = bands.map((band, index) => {
    const startAngle = angle
    angle += totalShare > 0 ? (band.share / totalShare) * 360 : 0
    return { band, index, startAngle, endAngle: angle }
  })

  const activate = (band: DelaySeverityBand) => {
    setActiveId(band.id)
    onSelect(band)
  }

  return (
    <div className="severity-chart severity-chart--pie">
      <div className="severity-pie-layout">
        <svg viewBox="0 0 224 224" className="severity-pie" role="img" aria-label="Biểu đồ tròn phân phối chuyến bay theo mức độ trễ đến">
          {slices.map(({ band, index, startAngle, endAngle }) => (
            <path
              key={band.id}
              d={piePath(startAngle, endAngle)}
              data-analysis-unit={`overview-severity-${band.id}`}
              className={`severity-pie-slice${band.id === selectedId ? ' selected' : ''}`}
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
        </svg>
        <div className="severity-legend" aria-label="Chú giải mức độ trễ">
          {bands.map((band, index) => (
            <button key={band.id} type="button" className={band.id === active.id ? 'active' : ''} onClick={() => activate(band)}>
              <i className="severity-swatch" style={{ background: colors[index % colors.length] }} />
              <span>{band.label}</span>
              <strong>{band.share.toFixed(1).replace('.', ',')}%</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="chart-evidence-popover" role="status" aria-live="polite">
        <strong>{active.label} · {active.shortLabel}</strong>
        <span>Tỷ trọng trong phạm vi: <b>{active.share.toFixed(1).replace('.', ',')}%</b></span>
        <span>Tỷ lệ trễ trong nhóm: <b>{formatPercent(active.metrics.delayRate)}</b></span>
        <span>Chuyến đến trễ: <b>{active.metrics.delayedFlights.toLocaleString('vi-VN')} / {active.metrics.eligibleFlights.toLocaleString('vi-VN')}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.metrics.averageArrivalDelayMinutes)}</b></span>
      </div>
    </div>
  )
}
