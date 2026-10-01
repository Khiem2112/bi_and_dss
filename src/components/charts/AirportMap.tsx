import { useMemo } from 'react'
import type { AirportHotspot } from '../../domain/types'

interface AirportMapProps {
  airports: AirportHotspot[]
  selectedId?: string
  selectedCodes?: string[]
  onSelect?: (airport: AirportHotspot) => void
  onSelectPair?: (pair: string[]) => void
  onClearPair?: () => void
  enableMeasurement?: boolean
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

export function AirportMap({
  airports,
  selectedId,
  selectedCodes = [],
  onSelect,
  onSelectPair,
  onClearPair,
  enableMeasurement = true,
}: AirportMapProps) {
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

  return (
    <div className="airport-map" role="img" aria-label="Bản đồ sân bay và đo khoảng cách">
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
          const gap = airport.gap ?? 0
          const fill = gap >= 5 ? '#e11d48' : gap >= 3 ? '#f59e0b' : '#2563eb'

          const selectedIdx = selectedCodes.indexOf(airport.code)
          const isSelected = selectedIdx !== -1 || selectedId === airport.id
          const selectionNumber = selectedIdx !== -1 ? selectedIdx + 1 : null
          const roleLabel = airport.role === 'Origin' ? 'Sân bay đi' : 'Sân bay đến'
          const delayedText = airport.delayedCount !== undefined ? airport.delayedCount.toLocaleString('vi-VN') : '0'
          const eligibleText = airport.eligibleCount !== undefined ? airport.eligibleCount.toLocaleString('vi-VN') : airport.n.toLocaleString('vi-VN')
          const avgDelayText = airport.averageDelay !== undefined ? airport.averageDelay.toFixed(1).replace('.', ',') : '0,0'

          return (
            <g
              key={airport.id}
              className={`map-point ${isSelected ? 'is-selected' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${airport.entity} (${roleLabel}): Tỷ lệ trễ ${airport.rate.toFixed(1).replace('.', ',')}%, Số chuyến trễ ${delayedText}/${eligibleText} chuyến, Độ trễ TB ${avgDelayText} phút, Chênh lệch ${gap > 0 ? '+' : ''}${gap.toFixed(1).replace('.', ',')}%`}
              onClick={() => handleAirportClick(airport)}
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
              <circle cx={x} cy={y} r={radius} fill={fill} opacity="0.88" />
              <text x={x} y={y + 4} textAnchor="middle" className="map-code">
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

              <title>
                {`${airport.entity} (${roleLabel})\n• Tỷ lệ chuyến đến trễ: ${airport.rate.toFixed(1).replace('.', ',')}%\n• Số chuyến đến trễ: ${delayedText} / ${eligibleText} chuyến\n• Độ trễ đến trung bình: ${avgDelayText} phút\n• Mức chuẩn mạng lưới: ${airport.baseline?.toFixed(1).replace('.', ',') ?? '0,0'}%\n• Chênh lệch: ${gap > 0 ? '+' : ''}${gap.toFixed(1).replace('.', ',')}%`}
              </title>
            </g>
          )
        })}
      </svg>

      <span className="map-watermark">Vị trí / khu vực sân bay minh họa</span>

      {enableMeasurement && routeMeasurement && (
        <div className="map-measurement-card">
          <div className="measurement-info">
            <div className="measurement-route-title">
              <span className="badge-point point-1">1</span>
              <strong>{routeMeasurement.ap1.code} ({routeMeasurement.ap1.city})</strong>
              <span className="route-arrow">↔</span>
              <span className="badge-point point-2">2</span>
              <strong>{routeMeasurement.ap2.code} ({routeMeasurement.ap2.city})</strong>
            </div>
            <div className="measurement-stats">
              <span className="stat-item">
                <span className="stat-label">Quãng đường bay:</span>
                <span className="stat-value">
                  {routeMeasurement.distanceMiles.toLocaleString('vi-VN')} dặm (~{routeMeasurement.distanceKm.toLocaleString('vi-VN')} km)
                </span>
              </span>
              <span className="stat-separator">·</span>
              <span className="stat-item">
                <span className="stat-label">Ước tính thời gian bay:</span>
                <span className="stat-value">
                  {routeMeasurement.durationText} (~{routeMeasurement.flightMinutes} phút)
                </span>
              </span>
            </div>
            <div className="measurement-bundle-strip">
              <span className="bundle-strip-item">
                <strong>{routeMeasurement.ap1.code}:</strong> Trễ {routeMeasurement.ap1.rate.toFixed(1).replace('.', ',')}% · {routeMeasurement.ap1.delayedCount?.toLocaleString('vi-VN') ?? 0}/{routeMeasurement.ap1.n.toLocaleString('vi-VN')} chuyến · TB {routeMeasurement.ap1.averageDelay?.toFixed(1).replace('.', ',') ?? '0,0'} phút
              </span>
              <span className="stat-separator">|</span>
              <span className="bundle-strip-item">
                <strong>{routeMeasurement.ap2.code}:</strong> Trễ {routeMeasurement.ap2.rate.toFixed(1).replace('.', ',')}% · {routeMeasurement.ap2.delayedCount?.toLocaleString('vi-VN') ?? 0}/{routeMeasurement.ap2.n.toLocaleString('vi-VN')} chuyến · TB {routeMeasurement.ap2.averageDelay?.toFixed(1).replace('.', ',') ?? '0,0'} phút
              </span>
            </div>
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
            Đã chọn điểm thứ nhất: <strong>{selectedCodes[0]}</strong>. Nhấp vào sân bay thứ hai trên bản đồ để đo khoảng cách và ước tính thời gian bay.
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
          <span className="legend-dot" />
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
        <span className="legend-item">Kích thước vòng tròn = cỡ mẫu n</span>
      </div>
    </div>
  )
}
