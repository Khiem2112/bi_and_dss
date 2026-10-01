import type { AirportHotspot } from '../../domain/types'

interface AirportMapProps {
  airports: AirportHotspot[]
  selectedId?: string
  onSelect: (airport: AirportHotspot) => void
}

export function AirportMap({ airports, selectedId, onSelect }: AirportMapProps) {
  return (
    <div className="airport-map" role="img" aria-label="Bản đồ sân bay minh họa, màu theo chênh lệch mức tham chiếu, kích thước theo cỡ mẫu">
      <svg viewBox="0 0 920 500">
        <path className="map-land" d="M89 130 L135 83 L208 65 L286 82 L356 76 L421 104 L485 93 L561 112 L635 103 L707 130 L792 127 L849 170 L821 217 L848 249 L814 284 L790 344 L735 375 L684 367 L633 410 L575 391 L521 407 L458 381 L391 393 L335 366 L278 356 L223 319 L175 304 L144 260 L99 229 L71 185 Z" />
        <path className="map-line" d="M167 118 L183 294 M279 85 L284 356 M385 88 L390 390 M493 97 L488 389 M603 108 L584 390 M707 128 L671 373 M111 211 L819 222 M145 286 L789 290" />
        {airports.map((airport) => {
          const x = 40 + airport.x * 8.4
          const y = 25 + airport.y * 4.1
          const radius = 9 + Math.sqrt(airport.n) / 10
          const gap = airport.gap ?? 0
          const fill = gap >= 5 ? '#e11d48' : gap >= 3 ? '#f59e0b' : '#2563eb'
          const selected = selectedId === airport.id
          const roleLabel = airport.role === 'Origin' ? 'Sân bay đi' : 'Sân bay đến'
          return (
            <g
              key={airport.id}
              className="map-point"
              tabIndex={0}
              role="button"
              aria-label={`${airport.entity}, ${roleLabel}, tỷ lệ trễ ${airport.rate}%, chênh lệch ${gap} điểm phần trăm, cỡ mẫu ${airport.n}`}
              onClick={() => onSelect(airport)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(airport)
                }
              }}
            >
              {selected && <circle cx={x} cy={y} r={radius + 7} className="map-selection-ring" />}
              <circle cx={x} cy={y} r={radius} fill={fill} opacity="0.88" />
              <text x={x} y={y + 4} textAnchor="middle" className="map-code">{airport.code}</text>
              <title>{airport.entity} · Tỷ lệ {airport.rate}% · BL-AR {airport.baseline}% · Chênh lệch {gap > 0 ? '+' : ''}{gap} điểm % · n={airport.n}</title>
            </g>
          )
        })}
      </svg>
      <span className="map-watermark">Vị trí / khu vực sân bay minh họa</span>
      <div className="legend">
        <span className="legend-item"><span className="legend-dot" />Chênh lệch ≥ 5 điểm %</span>
        <span className="legend-item"><span className="legend-dot amber" />Chênh lệch 3–4,9 điểm %</span>
        <span className="legend-item"><span className="legend-dot blue" />Chênh lệch &lt; 3 điểm %</span>
        <span className="legend-item">Kích thước vòng tròn = cỡ mẫu n</span>
      </div>
    </div>
  )
}
