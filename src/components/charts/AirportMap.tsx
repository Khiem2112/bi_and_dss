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

const originColor = '#2563eb'
const destinationColor = '#f97316'

function getRoleFill(role: 'origin' | 'destination', metrics?: RoleMetrics): string {
  if (!metrics || metrics.n === 0) return '#94a3b8'
  return role === 'origin' ? originColor : destinationColor
}

function getRoleOpacity(metrics?: RoleMetrics, fallbackGap: number = 0): number {
  if (!metrics || metrics.n === 0) return 0.42
  const gap = metrics.gap ?? fallbackGap
  if (gap >= 5) return 1
  if (gap >= 3) return 0.86
  return 0.7
}

function getTooltipGapColor(gap: number | null | undefined): string {
  if (gap === null || gap === undefined) return '#cbd5e1'
  if (gap > 0) return '#f87171'
  if (gap < 0) return '#4ade80'
  return '#cbd5e1'
}

function getClusterColor(rate: number, baseline: number): string {
  const gap = rate - baseline
  if (gap >= 3.5) return '#dc2626'
  if (gap >= 1.5) return '#ea580c'
  if (gap >= -1.5) return '#d97706'
  return '#16a34a'
}

interface RegionInfo {
  id: string
  nameVi: string
  center: { x: number; y: number }
}

const REGIONS: Record<string, RegionInfo> = {
  Northeast: { id: 'Northeast', nameVi: 'Vùng Đông Bắc', center: { x: 740, y: 190 } },
  Southeast: { id: 'Southeast', nameVi: 'Vùng Đông Nam', center: { x: 670, y: 310 } },
  Midwest: { id: 'Midwest', nameVi: 'Vùng Trung Tây', center: { x: 570, y: 210 } },
  South: { id: 'South', nameVi: 'Vùng Nam & Texas', center: { x: 470, y: 320 } },
  Mountain: { id: 'Mountain', nameVi: 'Vùng Miền Tây & Núi', center: { x: 340, y: 250 } },
  Pacific: { id: 'Pacific', nameVi: 'Vùng Bờ Tây', center: { x: 200, y: 230 } },
}

const AIRPORT_REGIONS: Record<string, string> = {
  BOS: 'Northeast', BWI: 'Northeast', DCA: 'Northeast', IAD: 'Northeast', EWR: 'Northeast',
  LGA: 'Northeast', JFK: 'Northeast', PHL: 'Northeast', PIT: 'Northeast', ALB: 'Northeast',
  BDL: 'Northeast', BUF: 'Northeast', ISP: 'Northeast', MHT: 'Northeast', PVD: 'Northeast',
  PWM: 'Northeast', ROC: 'Northeast',
  ATL: 'Southeast', MCO: 'Southeast', TPA: 'Southeast', FLL: 'Southeast', BNA: 'Southeast',
  CLT: 'Southeast', RDU: 'Southeast', BHM: 'Southeast', CHS: 'Southeast', CVG: 'Southeast',
  ECP: 'Southeast', GSP: 'Southeast', JAX: 'Southeast', MEM: 'Southeast', ORF: 'Southeast',
  PBI: 'Southeast', PNS: 'Southeast', RIC: 'Southeast', RSW: 'Southeast', SDF: 'Southeast', SJU: 'Southeast',
  MDW: 'Midwest', STL: 'Midwest', MCI: 'Midwest', MSP: 'Midwest', DTW: 'Midwest',
  IND: 'Midwest', CLE: 'Midwest', CMH: 'Midwest', MKE: 'Midwest', OMA: 'Midwest',
  DSM: 'Midwest', GRR: 'Midwest', CAK: 'Midwest', DAY: 'Midwest', FNT: 'Midwest',
  DAL: 'South', HOU: 'South', AUS: 'South', SAT: 'South', MSY: 'South',
  OKC: 'South', TUL: 'South', ELP: 'South', LIT: 'South', AMA: 'South',
  LBB: 'South', MAF: 'South', CRP: 'South', HRL: 'South',
  DEN: 'Mountain', PHX: 'Mountain', LAS: 'Mountain', SLC: 'Mountain', ABQ: 'Mountain',
  TUS: 'Mountain', BOI: 'Mountain', RNO: 'Mountain', ICT: 'Mountain',
  LAX: 'Pacific', OAK: 'Pacific', SAN: 'Pacific', SJC: 'Pacific', SMF: 'Pacific',
  SEA: 'Pacific', PDX: 'Pacific', SFO: 'Pacific', SNA: 'Pacific', BUR: 'Pacific',
  ONT: 'Pacific', LGB: 'Pacific', GEG: 'Pacific',
}

const MAJOR_AIRPORT_CODES = new Set([
  'DAL', 'MDW', 'BWI', 'DEN', 'LAS', 'PHX', 'HOU', 'ATL', 'MCO', 'LAX',
  'OAK', 'SAN', 'STL', 'BNA', 'TPA', 'SJC', 'SMF', 'MCI', 'FLL', 'AUS',
])

interface RegionCluster {
  id: string
  nameVi: string
  center: { x: number; y: number }
  airports: AirportHotspot[]
  airportCount: number
  totalEligible: number
  totalDelayed: number
  rate: number
  averageDelay: number
  radius: number
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
  const [viewMode, setViewMode] = useState<'major' | 'region' | 'all'>('major')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [zoomCenter, setZoomCenter] = useState({ x: 460, y: 250 })
  const [activeRegionKey, setActiveRegionKey] = useState<string | null>(null)
  const [hoveredAirport, setHoveredAirport] = useState<AirportHotspot | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<RegionCluster | null>(null)

  const airportMap = useMemo(() => new Map(airports.map((a) => [a.code, a])), [airports])

  const selectedAirports = useMemo(() => {
    return selectedCodes.map((code) => airportMap.get(code)).filter((a): a is AirportHotspot => Boolean(a))
  }, [selectedCodes, airportMap])

  const regionClusters = useMemo<RegionCluster[]>(() => {
    const map = new Map<string, AirportHotspot[]>()
    Object.keys(REGIONS).forEach((k) => map.set(k, []))

    airports.forEach((a) => {
      const reg = a.region || AIRPORT_REGIONS[a.code] || 'Midwest'
      const list = map.get(reg) || []
      list.push(a)
      map.set(reg, list)
    })

    return Object.entries(REGIONS).map(([key, info]) => {
      const rAirports = map.get(key) || []
      const totalEligible = rAirports.reduce((sum, a) => sum + (a.eligibleCount ?? a.n ?? 0), 0)
      const totalDelayed = rAirports.reduce((sum, a) => sum + (a.delayedCount ?? 0), 0)
      const rate = totalEligible > 0 ? Number(((totalDelayed / totalEligible) * 100).toFixed(1)) : 0
      const delaySum = rAirports.reduce(
        (sum, a) => sum + (a.averageDelay ?? 0) * (a.eligibleCount ?? a.n ?? 0),
        0,
      )
      const averageDelay = totalEligible > 0 ? Number((delaySum / totalEligible).toFixed(1)) : 0
      const radius = Math.max(14, Math.min(24, 12 + Math.sqrt(rAirports.length) * 1.5))

      return {
        id: key,
        nameVi: info.nameVi,
        center: info.center,
        airports: rAirports,
        airportCount: rAirports.length,
        totalEligible,
        totalDelayed,
        rate,
        averageDelay,
        radius,
      }
    })
  }, [airports])

  const activeRegionInfo = useMemo(() => {
    if (!activeRegionKey) return null
    return regionClusters.find((r) => r.id === activeRegionKey) ?? null
  }, [activeRegionKey, regionClusters])

  const displayedAirports = useMemo(() => {
    if (activeRegionKey) {
      return airports.filter((a) => (a.region ?? AIRPORT_REGIONS[a.code]) === activeRegionKey)
    }
    if (viewMode === 'all' || zoomLevel >= 1.6) {
      return airports
    }
    if (viewMode === 'major') {
      return airports.filter(
        (a) => a.isMajor || MAJOR_AIRPORT_CODES.has(a.code) || selectedCodes.includes(a.code) || selectedId === a.id,
      )
    }
    return []
  }, [airports, viewMode, activeRegionKey, zoomLevel, selectedCodes, selectedId])

  const majorCount = useMemo(
    () => airports.filter((a) => a.isMajor || MAJOR_AIRPORT_CODES.has(a.code)).length,
    [airports],
  )

  const { minFlightCount, maxFlightCount } = useMemo(() => {
    if (airports.length === 0) return { minFlightCount: 1, maxFlightCount: 100000 }
    let min = Infinity
    let max = -Infinity
    for (const a of airports) {
      if (a.n < min) min = a.n
      if (a.n > max) max = a.n
    }
    return { minFlightCount: min, maxFlightCount: max }
  }, [airports])

  const handleSelectRegion = (region: RegionCluster) => {
    setActiveRegionKey(region.id)
    setZoomLevel(1.85)
    setZoomCenter(region.center)
  }

  const handleResetView = () => {
    setActiveRegionKey(null)
    setZoomLevel(1)
    setZoomCenter({ x: 460, y: 250 })
  }

  const handleZoomIn = () => {
    setZoomLevel((current) => Math.min(2.6, Number((current + 0.35).toFixed(2))))
  }

  const handleZoomOut = () => {
    setZoomLevel((current) => {
      const next = Math.max(1, Number((current - 0.35).toFixed(2)))
      if (next === 1) {
        setActiveRegionKey(null)
        setZoomCenter({ x: 460, y: 250 })
      }
      return next
    })
  }

  const baseWidth = 920
  const baseHeight = 500
  const currentWidth = baseWidth / zoomLevel
  const currentHeight = baseHeight / zoomLevel
  const viewBoxX = Math.max(0, Math.min(baseWidth - currentWidth, zoomCenter.x - currentWidth / 2))
  const viewBoxY = Math.max(0, Math.min(baseHeight - currentHeight, zoomCenter.y - currentHeight / 2))
  const viewBoxString = `${viewBoxX} ${viewBoxY} ${currentWidth} ${currentHeight}`

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
        (r.origin === ap2.code && r.destination === ap1.code),
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
      0,
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
    const pctLeft = ((x - viewBoxX) / currentWidth) * 100
    const pctTop = ((y - viewBoxY) / currentHeight) * 100
    return { x, y, pctLeft, pctTop }
  }, [hoveredAirport, viewBoxX, viewBoxY, currentWidth, currentHeight])

  const hoveredRegionCoords = useMemo(() => {
    if (!hoveredRegion) return null
    const pctLeft = ((hoveredRegion.center.x - viewBoxX) / currentWidth) * 100
    const pctTop = ((hoveredRegion.center.y - viewBoxY) / currentHeight) * 100
    return { pctLeft, pctTop }
  }, [hoveredRegion, viewBoxX, viewBoxY, currentWidth, currentHeight])

  return (
    <div className="airport-map" role="img" aria-label="Bản đồ điểm nóng sân bay và tính toán tuyến">
      <div className="airport-map-toolbar">
        <div className="airport-map-mode-tabs" role="group" aria-label="Chế độ hiển thị điểm nóng">
          <button
            type="button"
            className={`map-tab-btn ${viewMode === 'major' && !activeRegionKey ? 'active' : ''}`}
            onClick={() => {
              setViewMode('major')
              handleResetView()
            }}
          >
            Sân bay lớn ({majorCount})
          </button>
          <button
            type="button"
            className={`map-tab-btn ${viewMode === 'region' || activeRegionKey ? 'active' : ''}`}
            onClick={() => {
              setViewMode('region')
              handleResetView()
            }}
          >
            Theo vùng ({regionClusters.length} cụm)
          </button>
          <button
            type="button"
            className={`map-tab-btn ${viewMode === 'all' && !activeRegionKey ? 'active' : ''}`}
            onClick={() => {
              setViewMode('all')
            }}
          >
            Tất cả ({airports.length} sân bay)
          </button>
        </div>

        <div className="airport-map-zoom-controls" role="group" aria-label="Phóng to thu nhỏ bản đồ">
          {activeRegionInfo && (
            <span className="map-zoom-status">
              Đang xem: <strong>{activeRegionInfo.nameVi}</strong>
            </span>
          )}
          {zoomLevel > 1 && (
            <button
              type="button"
              className="map-zoom-btn map-zoom-btn--reset"
              onClick={handleResetView}
              title="Đặt lại góc nhìn toàn cảnh"
            >
              Đặt lại (1x)
            </button>
          )}
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2.6}
            aria-label="Phóng lớn bản đồ"
            title="Phóng lớn"
          >
            +
          </button>
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            aria-label="Thu nhỏ bản đồ"
            title="Thu nhỏ"
          >
            −
          </button>
        </div>
      </div>

      <div className="map-dual-rate-key" role="note" aria-label="Cách đọc điểm sân bay">
        <span className="map-dual-rate-marker" aria-hidden="true"><i /><i /></span>
        <span>
          <strong className="map-role-origin">Nửa trái: sân bay đi</strong>
          <b>·</b>
          <strong className="map-role-destination">Nửa phải: sân bay đến</strong>
        </span>
        <small>Màu sắc thể hiện vai trò; nhấp vào cụm vùng để phóng lớn chi tiết.</small>
      </div>

      <svg viewBox={viewBoxString} className="airport-map-canvas">
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

        {/* Che do xem cum theo vung khi chua chon vung cu the */}
        {viewMode === 'region' && !activeRegionKey && (
          <g className="map-regions-group">
            {regionClusters.map((region) => {
              const clusterColor = getClusterColor(region.rate, networkBaselineRate)
              return (
                <g
                  key={region.id}
                  className="map-region-cluster"
                  tabIndex={0}
                  role="button"
                  aria-label={`${region.nameVi}: ${region.airportCount} sân bay, tỷ lệ trễ ${region.rate.toFixed(1)}%, nhấp để phóng to chi tiết`}
                  onClick={() => handleSelectRegion(region)}
                  onMouseEnter={() => setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onFocus={() => setHoveredRegion(region)}
                  onBlur={() => setHoveredRegion(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectRegion(region)
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={region.center.x}
                    cy={region.center.y}
                    r={region.radius + 6}
                    fill={clusterColor}
                    opacity="0.2"
                  />
                  <circle
                    cx={region.center.x}
                    cy={region.center.y}
                    r={region.radius}
                    fill={clusterColor}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                  <text
                    x={region.center.x}
                    y={region.center.y - 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                    style={{ pointerEvents: 'none' }}
                  >
                    {region.rate.toFixed(1).replace('.', ',')}%
                  </text>
                  <text
                    x={region.center.x}
                    y={region.center.y + 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="700"
                    opacity="0.95"
                    style={{ pointerEvents: 'none' }}
                  >
                    {region.airportCount} SB
                  </text>

                  <rect
                    x={region.center.x - 52}
                    y={region.center.y + region.radius + 4}
                    width="104"
                    height="17"
                    rx="4"
                    fill="#0f172a"
                    opacity="0.85"
                  />
                  <text
                    x={region.center.x}
                    y={region.center.y + region.radius + 15.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {region.nameVi}
                  </text>
                </g>
              )
            })}
          </g>
        )}

        {/* Hien thi cac san bay chi tiet */}
        {(viewMode !== 'region' || activeRegionKey) &&
          displayedAirports.map((airport) => {
            const x = 40 + airport.x * 8.4
            const y = 25 + airport.y * 4.1

            const nRatio = maxFlightCount > minFlightCount
              ? Math.sqrt(Math.max(0, airport.n - minFlightCount)) / Math.sqrt(maxFlightCount - minFlightCount)
              : 0.5
            const radius = 5.5 + nRatio * 9.5
            const codeFontSize = radius >= 11 ? 7.5 : radius >= 8.5 ? 6.5 : 5.5

            const originFallbackGap = airport.role === 'Origin' ? (airport.gap ?? 0) : 0
            const destinationFallbackGap = airport.role === 'Destination' ? (airport.gap ?? 0) : 0
            const originFill = getRoleFill('origin', airport.originMetrics)
            const destinationFill = getRoleFill('destination', airport.destMetrics)
            const originOpacity = getRoleOpacity(airport.originMetrics, originFallbackGap)
            const destinationOpacity = getRoleOpacity(airport.destMetrics, destinationFallbackGap)

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
                    r={radius + 4.5}
                    className="map-selection-ring"
                    stroke={selectionNumber === 1 ? '#2563eb' : selectionNumber === 2 ? '#e11d48' : 'var(--ink)'}
                    strokeWidth="2.5"
                  />
                )}
                {/* Nua ben trai: San bay di (Origin) */}
                <path
                  d={`M ${x} ${y - radius} A ${radius} ${radius} 0 0 0 ${x} ${y + radius} Z`}
                  fill={originFill}
                  opacity={originOpacity}
                />
                {/* Nua ben phai: San bay den (Destination) */}
                <path
                  d={`M ${x} ${y - radius} A ${radius} ${radius} 0 0 1 ${x} ${y + radius} Z`}
                  fill={destinationFill}
                  opacity={destinationOpacity}
                />
                {/* Duong phan cach 2 nua va vien ngoai */}
                <line x1={x} y1={y - radius} x2={x} y2={y + radius} stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
                <circle cx={x} cy={y} r={radius} fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.45" />
                <text
                  x={x}
                  y={y + (codeFontSize * 0.35)}
                  textAnchor="middle"
                  className="map-code"
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    fontSize: `${codeFontSize}px`,
                    fontWeight: 700,
                  }}
                >
                  {airport.code}
                </text>

                {selectionNumber && (
                  <g className="selection-badge">
                    <circle
                      cx={x + radius - 1}
                      cy={y - radius + 1}
                      r="6.5"
                      fill={selectionNumber === 1 ? '#2563eb' : '#e11d48'}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={x + radius - 1}
                      y={y - radius + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.5"
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

      {/* Tooltip khi re chuot vao cum vung */}
      {hoveredRegion && hoveredRegionCoords && (
        <div
          className="airport-hover-tooltip"
          style={{
            left: `${hoveredRegionCoords.pctLeft}%`,
            top: `${hoveredRegionCoords.pctTop}%`,
            transform: `translate(${hoveredRegionCoords.pctLeft > 70 ? '-90%' : hoveredRegionCoords.pctLeft < 30 ? '-10%' : '-50%'}, ${hoveredRegionCoords.pctTop < 35 ? '18px' : '-115%'})`,
            minWidth: '280px',
          }}
          role="tooltip"
        >
          <div className="tooltip-airport-header">
            <span className="tooltip-airport-code">{hoveredRegion.airportCount} SB</span>
            <div className="tooltip-airport-titles">
              <strong>{hoveredRegion.nameVi}</strong>
              <small>Tổng hợp điểm nóng theo vùng địa lý</small>
            </div>
          </div>
          <div className="tooltip-airport-divider" />
          <div className="tooltip-metrics-rows">
            <div className="tooltip-metric-row">
              <span className="metric-label">Tỷ lệ chuyến đến trễ</span>
              <strong style={{ color: getClusterColor(hoveredRegion.rate, networkBaselineRate) }}>
                {hoveredRegion.rate.toFixed(1).replace('.', ',')}%
              </strong>
            </div>
            <div className="tooltip-metric-row">
              <span className="metric-label">Chuyến đến trễ / Đủ ĐK</span>
              <span>{hoveredRegion.totalDelayed.toLocaleString('vi-VN')} / {hoveredRegion.totalEligible.toLocaleString('vi-VN')}</span>
            </div>
            <div className="tooltip-metric-row">
              <span className="metric-label">Độ trễ TB</span>
              <span>{hoveredRegion.averageDelay.toFixed(1).replace('.', ',')} phút</span>
            </div>
            <div className="tooltip-metric-row">
              <span className="metric-label">Sân bay tiêu biểu</span>
              <span>{hoveredRegion.airports.slice(0, 5).map((a) => a.code).join(', ')}</span>
            </div>
          </div>
          <div className="tooltip-click-hint">
            Nhấp chuột để phóng lớn và khảo sát chi tiết từng sân bay trong vùng.
          </div>
        </div>
      )}

      {/* Tooltip khi re chuot vao san bay */}
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
            <span className="tooltip-role-pill">Đi &amp; Đến</span>
          </div>

          <div className="tooltip-airport-divider" />

          <div className="tooltip-metrics-rows">
            <div className="tooltip-metric-row tooltip-metric-header">
              <span className="metric-label">Chỉ số</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin role-header-text">Điểm đi</span>
                <span className="metric-val-dest role-header-text">Điểm đến</span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Tỷ lệ trễ</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin">
                  {hoveredAirport.originMetrics ? `${hoveredAirport.originMetrics.rate.toFixed(1).replace('.', ',')}%` : '—'}
                </span>
                <span className="metric-val-dest">
                  {hoveredAirport.destMetrics ? `${hoveredAirport.destMetrics.rate.toFixed(1).replace('.', ',')}%` : '—'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Chênh lệch chuẩn</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin" style={{ color: getTooltipGapColor(hoveredAirport.originMetrics?.gap) }}>
                  {hoveredAirport.originMetrics?.gap !== null && hoveredAirport.originMetrics?.gap !== undefined
                    ? `${hoveredAirport.originMetrics.gap > 0 ? '+' : ''}${hoveredAirport.originMetrics.gap.toFixed(1).replace('.', ',')}%`
                    : '—'}
                </span>
                <span className="metric-val-dest" style={{ color: getTooltipGapColor(hoveredAirport.destMetrics?.gap) }}>
                  {hoveredAirport.destMetrics?.gap !== null && hoveredAirport.destMetrics?.gap !== undefined
                    ? `${hoveredAirport.destMetrics.gap > 0 ? '+' : ''}${hoveredAirport.destMetrics.gap.toFixed(1).replace('.', ',')}%`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Chuyến trễ / Đủ ĐK</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin">
                  {hoveredAirport.originMetrics ? `${hoveredAirport.originMetrics.delayedCount.toLocaleString('vi-VN')} / ${hoveredAirport.originMetrics.eligibleCount.toLocaleString('vi-VN')}` : '—'}
                </span>
                <span className="metric-val-dest">
                  {hoveredAirport.destMetrics ? `${hoveredAirport.destMetrics.delayedCount.toLocaleString('vi-VN')} / ${hoveredAirport.destMetrics.eligibleCount.toLocaleString('vi-VN')}` : '—'}
                </span>
              </div>
            </div>

            <div className="tooltip-metric-row">
              <span className="metric-label">Độ trễ TB</span>
              <div className="metric-dual-values">
                <span className="metric-val-origin">
                  {hoveredAirport.originMetrics ? `${hoveredAirport.originMetrics.averageDelay.toFixed(1).replace('.', ',')} phút` : '—'}
                </span>
                <span className="metric-val-dest">
                  {hoveredAirport.destMetrics ? `${hoveredAirport.destMetrics.averageDelay.toFixed(1).replace('.', ',')} phút` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="tooltip-click-hint">
            Nhấp chuột để chọn điểm đo tuyến bay hoặc mở chi tiết.
          </div>
        </div>
      )}

      {/* Bang thong tin tinh toan tuyen giua 2 san bay */}
      {routeMeasurement && routeStats && (
        <div className="measurement-bundle-card" role="region" aria-label="Kết quả đo đạc tuyến bay đã chọn">
          <div className="measurement-header-row">
            <div className="measurement-pair-label">
              <span className="pair-point origin-badge">
                <span className="badge-tag">Điểm 1</span>
                <strong>{routeMeasurement.ap1.code}</strong>
                <small>{routeMeasurement.ap1.city ?? routeMeasurement.ap1.name}</small>
              </span>
              <span className="pair-connector">→</span>
              <span className="pair-point dest-badge">
                <span className="badge-tag">Điểm 2</span>
                <strong>{routeMeasurement.ap2.code}</strong>
                <small>{routeMeasurement.ap2.city ?? routeMeasurement.ap2.name}</small>
              </span>
            </div>

            <div className="measurement-flight-estimates">
              <div className="estimate-item">
                <span className="estimate-label">Khoảng cách địa lý</span>
                <strong>
                  {routeStats.distanceMiles.toLocaleString('vi-VN')} dặm
                  <small> ({routeStats.distanceKm.toLocaleString('vi-VN')} km)</small>
                </strong>
              </div>
              <div className="estimate-item">
                <span className="estimate-label">Thời gian bay ước tính</span>
                <strong>{routeStats.durationText}</strong>
              </div>
            </div>
          </div>

          <div className="measurement-stats-row">
            {routeStats.hasFlights ? (
              <div className="measurement-bundle-strip">
                <span className="bundle-strip-item">
                  <strong>Tỷ lệ trễ tuyến:</strong> {routeStats.rate.toFixed(1).replace('.', ',')}%
                  {routeStats.gap !== null && (
                    <small className={routeStats.gap > 0 ? 'gap-high' : 'gap-low'}>
                      {' '}({routeStats.gap > 0 ? '+' : ''}{routeStats.gap.toFixed(1).replace('.', ',')}% so với chuẩn)
                    </small>
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
          <span className="legend-dot" style={{ background: originColor }} />
          Nửa trái = sân bay đi
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: destinationColor }} />
          Nửa phải = sân bay đến
        </span>
        <span className="legend-item">Sắc đậm = chênh lệch lớn hơn</span>
        <span className="legend-item">Kích thước = cỡ mẫu</span>
      </div>
    </div>
  )
}
