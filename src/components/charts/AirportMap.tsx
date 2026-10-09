import { useMemo, useState } from 'react'
import type { AirportHotspot, EvidenceRecord, RoleMetrics } from '../../domain/types'

interface AirportMapProps {
  airports: AirportHotspot[]
  routes?: EvidenceRecord[]
  networkBaselineRate?: number
  selectedId?: string
  selectedCodes?: string[]
  onSelect?: (airport: AirportHotspot) => void
  onSelectPair?: (pair: string[]) => void
  onClearPair?: () => void
  enableMeasurement?: boolean
  onAirportContextMenu?: (e: React.MouseEvent, airport: AirportHotspot) => void
}

function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function estimateFlightMinutes(distanceMiles: number): number {
  return Math.max(35, Math.round((distanceMiles / 480) * 60 + 30))
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

function getDelayFill(metrics?: RoleMetrics, fallbackGap: number = 0): string {
  if (!metrics || metrics.n === 0) return '#64748b'
  const gap = metrics.gap ?? fallbackGap
  if (gap >= 5) return '#e11d48'
  if (gap >= 3) return '#f59e0b'
  return '#2563eb'
}

function getTooltipRateColor(metrics?: RoleMetrics, fallbackGap: number = 0): string {
  if (!metrics || metrics.n === 0) return '#cbd5e1'
  const gap = metrics.gap ?? fallbackGap
  if (gap >= 5) return '#fb7185'
  if (gap >= 3) return '#fbbf24'
  return '#60a5fa'
}

function getTooltipGapColor(gap: number | null | undefined): string {
  if (gap === null || gap === undefined) return '#cbd5e1'
  if (gap > 0) return '#f87171'
  if (gap < 0) return '#4ade80'
  return '#cbd5e1'
}

export function AirportMap({
  airports,
  routes,
  networkBaselineRate = 18.4,
  selectedId,
  selectedCodes = [],
  onSelect,
  onSelectPair,
  onClearPair,
  enableMeasurement = true,
  onAirportContextMenu,
}: AirportMapProps) {
  const [hoveredAirport, setHoveredAirport] = useState<AirportHotspot | null>(null)
  const airportMap = useMemo(() => new Map(airports.map((a) => [a.code, a])), [airports])

  const selectedAirports = useMemo(() => {
    return selectedCodes.map((code) => airportMap.get(code)).filter((a): a is AirportHotspot => Boolean(a))
  }, [selectedCodes, airportMap])

  const routeMeasurement = useMemo(() => {
    if (selectedAirports.length < 2) return null
    const [ap1, ap2] = selectedAirports

    let distanceMiles = 0
    if (ap1.lat !== undefined && ap1.lng !== undefined && ap2.lat !== undefined && ap2.lng !== undefined) {
      distanceMiles = calculateDistanceMiles(ap1.lat, ap1.lng, ap2.lat, ap2.lng)
    } else {
      const dx = (ap1.x - ap2.x) * 25
      const dy = (ap1.y - ap2.y) * 20
      distanceMiles = Math.round(Math.sqrt(dx * dx + dy * dy))
    }

    const distanceKm = Math.round(distanceMiles * 1.60934)
    const flightMinutes = estimateFlightMinutes(distanceMiles)
    const durationText = formatDuration(flightMinutes)

    const x1 = 40 + ap1.x * 8.4
    const y1 = 25 + ap1.y * 4.1
    const x2 = 40 + ap2.x * 8.4
    const y2 = 25 + ap2.y * 4.1

    const midX = (x1 + x2) / 2
    const midY = Math.min(y1, y2) - 42

    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`

    return {
      ap1,
      ap2,
      distanceMiles,
      distanceKm,
      flightMinutes,
      durationText,
      pathD,
      x1,
      y1,
      x2,
      y2,
      midX,
      midY,
    }
  }, [selectedAirports])

  const routeStats = useMemo(() => {
    if (!routeMeasurement) return null
    const { ap1, ap2 } = routeMeasurement

    const matchingRoutes = (routes ?? []).filter(
      (r) =>
        (r.origin === ap1.code && r.destination === ap2.code) ||
        (r.origin === ap2.code && r.destination === ap1.code)
    )

    if (matchingRoutes.length === 0) {
      return {
        hasFlights: false,
        rate: 0,
        delayedCount: 0,
        eligibleCount: 0,
        averageDelay: 0,
        gap: null,
        distanceMiles: routeMeasurement.distanceMiles,
        distanceKm: routeMeasurement.distanceKm,
        flightMinutes: routeMeasurement.flightMinutes,
        durationText: routeMeasurement.durationText,
      }
    }

    const totalEligible = matchingRoutes.reduce((sum, r) => sum + (r.eligibleCount ?? r.n ?? 0), 0)
    const totalDelayed = matchingRoutes.reduce((sum, r) => sum + (r.delayedCount ?? 0), 0)
    const rate = totalEligible > 0 ? Number(((totalDelayed / totalEligible) * 100).toFixed(1)) : 0

    const totalDelayWeightedMinutes = matchingRoutes.reduce(
      (sum, r) => sum + r.averageDelay * (r.eligibleCount ?? r.n ?? 0),
      0
    )
    const averageDelay = totalEligible > 0 ? Number((totalDelayWeightedMinutes / totalEligible).toFixed(1)) : 0

    const gap = totalEligible > 0 ? Number((rate - networkBaselineRate).toFixed(1)) : null
    const distanceMiles = matchingRoutes[0]?.distance ?? routeMeasurement.distanceMiles
    const distanceKm = Math.round(distanceMiles * 1.60934)
    const flightMinutes = matchingRoutes[0]?.estimatedTime ?? routeMeasurement.flightMinutes
    const durationText = formatDuration(flightMinutes)

    return {
      hasFlights: totalEligible > 0,
      rate,
      delayedCount: totalDelayed,
      eligibleCount: totalEligible,
      averageDelay,
      gap,
      distanceMiles,
      distanceKm,
      flightMinutes,
      durationText,
    }
  }, [routeMeasurement, routes, networkBaselineRate])

  const handleAirportClick = (airport: AirportHotspot) => {
    if (onSelectPair) {
      if (selectedCodes.length === 0) {
        onSelectPair([airport.code])
      } else if (selectedCodes.length === 1) {
        if (selectedCodes[0] === airport.code) {
          onSelectPair([])
        } else {
          onSelectPair([selectedCodes[0], airport.code])
        }
      } else {
        onSelectPair([airport.code])
      }
    }
    onSelect?.(airport)
  }

  const hoveredAirportCoords = useMemo(() => {
    if (!hoveredAirport) return null
    const x = 40 + hoveredAirport.x * 8.4
    const y = 25 + hoveredAirport.y * 4.1
    const pctLeft = (x / 920) * 100
    const pctTop = (y / 500) * 100
    return { x, y, pctLeft, pctTop }
  }, [hoveredAirport])

  return (
    <div className="airport-map" role="img" aria-label="Bản đồ điểm nóng sân bay và tính toán tuyến">
      <svg viewBox="0 0 920 500">
        <path
          className="map-land"
          d="M89 130 L135 83 L208 65 L286 82 L356 76 L421 104 L485 93 L561 112 L635 103 L707 130 L792 127 L849 170 L821 217 L848 249 L814 284 L790 344 L735 375 L684 367 L633 410 L575 391 L521 407 L458 381 L391 393 L335 366 L278 356 L223 319 L175 304 L144 260 L99 229 L71 185 Z"
        />
        <path
          className="map-line"
          d="M167 118 L183 294 M279 85 L284 356 M385 88 L390 390 M493 97 L488 389 M603 108 L584 390 M707 128 L671 373 M111 211 L819 222 M145 286 L789 290"
        />

        {routeMeasurement && (
          <g className="map-route-group">
            <path
              d={routeMeasurement.pathD}
              fill="none"
              stroke="#0f172a"
              strokeWidth="5"
              strokeOpacity="0.2"
            />
            <path
              d={routeMeasurement.pathD}
              fill="none"
              stroke="#e11d48"
              strokeWidth="3.25"
              strokeDasharray="7 5"
              className="map-route-line"
            />
            <circle cx={routeMeasurement.midX} cy={routeMeasurement.midY + 16} r="4" fill="#e11d48" />
          </g>
        )}

        {airports.map((airport) => {
          const x = 40 + airport.x * 8.4
          const y = 25 + airport.y * 4.1
          const radius = 9 + Math.sqrt(airport.n) / 10

          const originFill = getDelayFill(airport.originMetrics, airport.role === 'Origin' ? (airport.gap ?? 0) : 0)
          const destFill = getDelayFill(airport.destMetrics, airport.role === 'Destination' ? (airport.gap ?? 0) : 0)

          const selectedIdx = selectedCodes.indexOf(airport.code)
          const isSelected = selectedIdx !== -1 || selectedId === airport.id
          const selectionNumber = selectedIdx !== -1 ? selectedIdx + 1 : null

          return (
            <g
              key={airport.id}
              data-analysis-unit={`airport-${airport.code}`}
              className={`map-point ${isSelected ? 'is-selected' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${airport.entity}: Khởi hành trễ ${airport.originMetrics?.rate.toFixed(1) ?? '--'}%, Hạ cánh trễ ${airport.destMetrics?.rate.toFixed(1) ?? '--'}%`}
              onClick={() => handleAirportClick(airport)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAirportContextMenu?.(e, airport)
              }}
              onMouseEnter={() => setHoveredAirport(airport)}
              onMouseLeave={() => setHoveredAirport(null)}
              onFocus={() => setHoveredAirport(airport)}
              onBlur={() => setHoveredAirport(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleAirportClick(airport)
                }
              }}
            >
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 8}
                  className="map-selection-ring"
                  stroke={selectionNumber === 1 ? '#2563eb' : selectionNumber === 2 ? '#e11d48' : 'var(--ink)'}
                  strokeWidth="3"
                />
              )}
              {/* Nửa bên trái: Sân bay đi (Origin) */}
              <path
                d={`M ${x} ${y - radius} A ${radius} ${radius} 0 0 0 ${x} ${y + radius} Z`}
                fill={originFill}
                opacity="0.9"
              />
              {/* Nửa bên phải: Sân bay đến (Destination) */}
              <path
                d={`M ${x} ${y - radius} A ${radius} ${radius} 0 0 1 ${x} ${y + radius} Z`}
                fill={destFill}
                opacity="0.9"
              />
              {/* Đường phân cách 2 nửa và viền ngoài */}
              <line x1={x} y1={y - radius} x2={x} y2={y + radius} stroke="#ffffff" strokeWidth="1" opacity="0.75" />
              <circle cx={x} cy={y} r={radius} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />
              <text x={x} y={y + 4} textAnchor="middle" className="map-code" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {airport.code}
              </text>

              {selectionNumber && (
                <g className="selection-badge">
                  <circle
                    cx={x + radius - 2}
                    cy={y - radius + 2}
                    r="8.5"
                    fill={selectionNumber === 1 ? '#2563eb' : '#e11d48'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x + radius - 2}
                    y={y - radius + 5.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="800"
                  >
                    {selectionNumber}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {hoveredAirport && hoveredAirportCoords && (
        <div
          className="airport-hover-tooltip"
          style={{
            left: `${hoveredAirportCoords.pctLeft}%`,
            top: `${hoveredAirportCoords.pctTop}%`,
            transform: `translate(${hoveredAirportCoords.pctLeft > 70 ? '-90%' : hoveredAirportCoords.pctLeft < 30 ? '-10%' : '-50%'}, ${hoveredAirportCoords.pctTop < 35 ? '18px' : '-115%'})`,
            minWidth: '310px',
          }}
          role="tooltip"
        >
          <div className="tooltip-airport-header">
            <span className="tooltip-airport-code">{hoveredAirport.code}</span>
            <div className="tooltip-airport-titles">
              <strong>{hoveredAirport.city ?? hoveredAirport.code}</strong>
              <small>{hoveredAirport.name ?? hoveredAirport.entity}</small>
            </div>
            <span className="tooltip-role-pill">
              Đi &amp; Đến
            </span>
          </div>

          <div className="tooltip-airport-divider" />

          <div className="tooltip-metrics-rows">
            <div className="tooltip-metric-row tooltip-metric-header">
              <span className="metric-label">Chỉ số</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin role-header-text">Điểm đi</span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest role-header-text">Điểm đến</span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Tỷ lệ trễ</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin" style={{ color: getTooltipRateColor(hoveredAirport.originMetrics, 0), fontWeight: 700 }}>
                  {hoveredAirport.originMetrics ? `${hoveredAirport.originMetrics.rate.toFixed(1).replace('.', ',')}%` : '--'}
                </span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest" style={{ color: getTooltipRateColor(hoveredAirport.destMetrics, 0), fontWeight: 700 }}>
                  {hoveredAirport.destMetrics ? `${hoveredAirport.destMetrics.rate.toFixed(1).replace('.', ',')}%` : '--'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Chênh lệch</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin" style={{ color: getTooltipGapColor(hoveredAirport.originMetrics?.gap), fontWeight: 600 }}>
                  {hoveredAirport.originMetrics?.gap !== null && hoveredAirport.originMetrics?.gap !== undefined
                    ? `${(hoveredAirport.originMetrics.gap ?? 0) > 0 ? '+' : ''}${hoveredAirport.originMetrics.gap.toFixed(1).replace('.', ',')}%`
                    : '--'}
                </span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest" style={{ color: getTooltipGapColor(hoveredAirport.destMetrics?.gap), fontWeight: 600 }}>
                  {hoveredAirport.destMetrics?.gap !== null && hoveredAirport.destMetrics?.gap !== undefined
                    ? `${(hoveredAirport.destMetrics.gap ?? 0) > 0 ? '+' : ''}${hoveredAirport.destMetrics.gap.toFixed(1).replace('.', ',')}%`
                    : '--'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Số chuyến trễ</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin">
                  {hoveredAirport.originMetrics
                    ? `${hoveredAirport.originMetrics.delayedCount.toLocaleString('vi-VN')} / ${hoveredAirport.originMetrics.n.toLocaleString('vi-VN')}`
                    : '--'}
                </span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest">
                  {hoveredAirport.destMetrics
                    ? `${hoveredAirport.destMetrics.delayedCount.toLocaleString('vi-VN')} / ${hoveredAirport.destMetrics.n.toLocaleString('vi-VN')}`
                    : '--'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Trễ trung bình</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin">
                  {hoveredAirport.originMetrics
                    ? `${hoveredAirport.originMetrics.averageDelay.toFixed(1).replace('.', ',')} ph`
                    : '--'}
                </span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest">
                  {hoveredAirport.destMetrics
                    ? `${hoveredAirport.destMetrics.averageDelay.toFixed(1).replace('.', ',')} ph`
                    : '--'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Cỡ mẫu n</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin" style={{ color: '#cbd5e1' }}>
                  {hoveredAirport.originMetrics ? hoveredAirport.originMetrics.n.toLocaleString('vi-VN') : '--'}
                </span>
                <span className="metric-v-sep">|</span>
                <span className="metric-val-dest" style={{ color: '#cbd5e1' }}>
                  {hoveredAirport.destMetrics ? hoveredAirport.destMetrics.n.toLocaleString('vi-VN') : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <span className="map-watermark">Vị trí sân bay minh họa</span>

      {enableMeasurement && routeMeasurement && routeStats && (
        <div className="map-measurement-card">
          <div className="measurement-info">
            <div className="measurement-route-title">
              <span className="badge-point point-1">1</span>
              <strong>
                {routeMeasurement.ap1.code} ({routeMeasurement.ap1.city})
              </strong>
              <span className="route-arrow">↔</span>
              <span className="badge-point point-2">2</span>
              <strong>
                {routeMeasurement.ap2.code} ({routeMeasurement.ap2.city})
              </strong>
            </div>

            <div className="measurement-stats">
              <span className="stat-item">
                <span className="stat-label">Quãng đường bay:</span>
                <span className="stat-value">
                  {routeStats.distanceMiles.toLocaleString('vi-VN')} dặm (~{routeStats.distanceKm.toLocaleString('vi-VN')} km)
                </span>
              </span>
              <span className="stat-separator">·</span>
              <span className="stat-item">
                <span className="stat-label">Ước tính thời gian bay:</span>
                <span className="stat-value">
                  {routeStats.durationText} (~{routeStats.flightMinutes} phút)
                </span>
              </span>
            </div>

            {routeStats.hasFlights ? (
              <div className="measurement-bundle-strip">
                <span className="bundle-strip-item">
                  <strong>Tỷ lệ trễ tuyến:</strong> {routeStats.rate.toFixed(1).replace('.', ',')}%
                  {routeStats.gap !== null && (
                    <span className={routeStats.gap > 0 ? 'diff-higher' : 'diff-lower'}>
                      {' '}({routeStats.gap > 0 ? '+' : ''}{routeStats.gap.toFixed(1).replace('.', ',')}% so với chuẩn)
                    </span>
                  )}
                </span>
                <span className="stat-separator">|</span>
                <span className="bundle-strip-item">
                  <strong>Số chuyến trễ:</strong> {routeStats.delayedCount.toLocaleString('vi-VN')} / {routeStats.eligibleCount.toLocaleString('vi-VN')} chuyến
                </span>
                <span className="stat-separator">|</span>
                <span className="bundle-strip-item">
                  <strong>Độ trễ TB tuyến:</strong> {routeStats.averageDelay > 0 ? '+' : ''}{routeStats.averageDelay.toFixed(1).replace('.', ',')} phút/chuyến
                </span>
              </div>
            ) : (
              <div className="measurement-no-data-strip">
                <span>Chưa ghi nhận dữ liệu chuyến bay cho tuyến này theo bộ lọc hiện tại.</span>
              </div>
            )}
          </div>

          {onClearPair && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClearPair}
              aria-label="Xóa chọn tuyến đo"
            >
              Xóa tuyến
            </button>
          )}
        </div>
      )}

      {enableMeasurement && selectedCodes.length === 1 && !routeMeasurement && (
        <div className="map-instruction-bar">
          <span>
            Đã chọn điểm thứ nhất: <strong>{selectedCodes[0]}</strong>. Nhấp vào sân bay thứ hai trên bản đồ để đo tuyến.
          </span>
          {onClearPair && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClearPair}>
              Hủy
            </button>
          )}
        </div>
      )}

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#e11d48' }} />
          Chênh lệch ≥ 5%
        </span>
        <span className="legend-item">
          <span className="legend-dot amber" />
          Chênh lệch 3–4,9%
        </span>
        <span className="legend-item">
          <span className="legend-dot blue" />
          Chênh lệch &lt; 3%
        </span>
        <span className="legend-item">Kích thước = cỡ mẫu</span>
      </div>
    </div>
  )
}
