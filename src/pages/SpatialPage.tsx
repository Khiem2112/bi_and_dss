import { Fragment, useEffect, useMemo, useState } from 'react'
import type {
  AirportHotspot,
  ComparisonContext,
  EvidenceRecord,
  EntityTrendFilters,
  GlobalFilters,
  PageId,
  SpatialState,
} from '../domain/types'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entity: string
  entityType: 'Airport' | 'Route'
  code?: string
  role?: 'Origin' | 'Destination'
}
import { formatRole } from '../domain/formatters'
import { useAirportHotspots, useEntityTrend } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

interface SpatialPageProps {
  filters: GlobalFilters
  initialEntity: string
  onNavigate: (page: PageId) => void
  onOpenComparison: (context: ComparisonContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenCause: (entity: string) => void
  onSelectEntity: (entity: string) => void
  onToast: (message: string) => void
}

type SortKey = 'code' | 'rate' | 'gap' | 'averageDelay' | 'n'
type SortDir = 'asc' | 'desc' | 'none'

function nextDir(current: SortDir): SortDir {
  if (current === 'none') return 'asc'
  if (current === 'asc') return 'desc'
  return 'none'
}

function ariaSortVal(key: SortKey, sortKey: SortKey, sortDir: SortDir): 'ascending' | 'descending' | 'none' {
  if (key !== sortKey || sortDir === 'none') return 'none'
  return sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key: SortKey, sortKey: SortKey, sortDir: SortDir): string {
  if (key !== sortKey || sortDir === 'none') return ''
  return sortDir === 'asc' ? ' ▲' : ' ▼'
}

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function airportSearchStr(a: AirportHotspot): string {
  const parts: string[] = [a.code ?? '', a.entity, a.city ?? '']
  if (a.originMetrics) {
    parts.push(
      `${a.originMetrics.rate.toFixed(1)}%`,
      a.originMetrics.gap !== null && a.originMetrics.gap !== undefined ? `+${a.originMetrics.gap.toFixed(1)}%` : '',
      a.originMetrics.averageDelay.toFixed(1)
    )
  }
  if (a.destMetrics) {
    parts.push(
      `${a.destMetrics.rate.toFixed(1)}%`,
      a.destMetrics.gap !== null && a.destMetrics.gap !== undefined ? `+${a.destMetrics.gap.toFixed(1)}%` : '',
      a.destMetrics.averageDelay.toFixed(1)
    )
  }
  return parts.join(' ')
}

function routeSearchStr(r: EvidenceRecord): string {
  return [r.entity, `${r.rate.toFixed(1)}%`, r.gap !== null ? `+${r.gap.toFixed(1)}%` : '', r.averageDelay.toFixed(1), r.n.toLocaleString('vi-VN')].join(' ')
}

export function SpatialPage({ filters, onNavigate, onOpenComparison, onOpenEvidence, onOpenCause, onSelectEntity, onToast }: SpatialPageProps) {
  const [localState, setLocalState] = useState<SpatialState>({ grain: 'destination', metric: 'gap' })
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | undefined>()
  const [expandedAirports, setExpandedAirports] = useState<Set<string>>(new Set())
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const [routeOnlyMode, setRouteOnlyMode] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | undefined>()
  const [airportSearch, setAirportSearch] = useState('')
  const [routeSearch, setRouteSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('gap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [routeSortKey, setRouteSortKey] = useState<SortKey>('gap')
  const [routeSortDir, setRouteSortDir] = useState<SortDir>('desc')

  const airportsQuery = useAirportHotspots(filters, localState)

  const selectedAirport = useMemo(
    () => airportsQuery.data?.airports.find((a) => a.code === selectedAirportCode),
    [airportsQuery.data, selectedAirportCode],
  )

  const entityTrendFilters = useMemo<EntityTrendFilters | null>(() => {
    if (selectedRoute) return { entityCode: selectedRoute, entityType: 'Route', grain: localState.grain }
    if (selectedAirportCode) return { entityCode: selectedAirportCode, entityType: 'Airport', grain: localState.grain }
    return null
  }, [selectedRoute, selectedAirportCode, localState.grain])

  const trendQuery = useEntityTrend(entityTrendFilters, filters)

  const allRoutes = useMemo(() => {
    if (!airportsQuery.data) return []
    const seen = new Set<string>()
    const results: EvidenceRecord[] = []
    for (const routes of Object.values(airportsQuery.data.routesByAirport)) {
      for (const r of routes) {
        if (!seen.has(r.entity)) { seen.add(r.entity); results.push(r) }
      }
    }
    return results.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
  }, [airportsQuery.data])

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (!contextMenu?.visible) return
    function handleClose() {
      setContextMenu(null)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  function openContextMenu(e: React.MouseEvent, entity: string, entityType: 'Airport' | 'Route', code?: string, role?: 'Origin' | 'Destination') {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 250),
      y: Math.min(e.clientY, window.innerHeight - 280),
      entity,
      entityType,
      code,
      role,
    })
  }

  function handleAirportSort(key: SortKey) {
    if (sortKey === key) setSortDir(nextDir(sortDir))
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleRouteSort(key: SortKey) {
    if (routeSortKey === key) setRouteSortDir(nextDir(routeSortDir))
    else { setRouteSortKey(key); setRouteSortDir('asc') }
  }

  const filteredAirports = useMemo(() => {
    const airports = airportsQuery.data?.airports ?? []
    const q = normalize(airportSearch)
    const filtered = q ? airports.filter((a) => normalize(airportSearchStr(a)).includes(q)) : airports
    if (sortDir === 'none') return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'code') cmp = (a.code ?? '').localeCompare(b.code ?? '', 'vi')
      else if (sortKey === 'rate') {
        const aMax = Math.max(a.originMetrics?.rate ?? a.rate, a.destMetrics?.rate ?? a.rate)
        const bMax = Math.max(b.originMetrics?.rate ?? b.rate, b.destMetrics?.rate ?? b.rate)
        cmp = aMax - bMax
      }
      else if (sortKey === 'gap') {
        const aMax = Math.max(a.originMetrics?.gap ?? a.gap ?? -999, a.destMetrics?.gap ?? a.gap ?? -999)
        const bMax = Math.max(b.originMetrics?.gap ?? b.gap ?? -999, b.destMetrics?.gap ?? b.gap ?? -999)
        cmp = aMax - bMax
      }
      else if (sortKey === 'averageDelay') {
        const aAvg = Math.max(a.originMetrics?.averageDelay ?? a.averageDelay, a.destMetrics?.averageDelay ?? a.averageDelay)
        const bAvg = Math.max(b.originMetrics?.averageDelay ?? b.averageDelay, b.destMetrics?.averageDelay ?? b.averageDelay)
        cmp = aAvg - bAvg
      }
      else if (sortKey === 'n') cmp = a.n - b.n
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [airportsQuery.data, airportSearch, sortKey, sortDir])

  const filteredRoutes = useMemo(() => {
    const q = normalize(routeSearch)
    const filtered = q ? allRoutes.filter((r) => normalize(routeSearchStr(r)).includes(q)) : allRoutes
    if (routeSortDir === 'none') return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (routeSortKey === 'code') cmp = a.entity.localeCompare(b.entity, 'vi')
      else if (routeSortKey === 'rate') cmp = a.rate - b.rate
      else if (routeSortKey === 'gap') cmp = (a.gap ?? 0) - (b.gap ?? 0)
      else if (routeSortKey === 'averageDelay') cmp = a.averageDelay - b.averageDelay
      else if (routeSortKey === 'n') cmp = a.n - b.n
      return routeSortDir === 'asc' ? cmp : -cmp
    })
  }, [allRoutes, routeSearch, routeSortKey, routeSortDir])

  function toggleExpand(code: string) {
    setExpandedAirports((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  function toggleRouteExpand(routeCode: string) {
    setExpandedRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(routeCode)) next.delete(routeCode); else next.add(routeCode)
      return next
    })
  }

  function selectAirport(code: string) {
    setSelectedAirportCode(code)
    setSelectedRoute(undefined)
    const ap = airportsQuery.data?.airports.find((a) => a.code === code)
    if (ap) onSelectEntity(ap.entity)
    onToast(`${code} đã được chọn. Xu hướng bên dưới đã cập nhật.`)
  }

  function selectRoute(route: string) {
    setSelectedRoute(route)
    setSelectedAirportCode(undefined)
    onSelectEntity(route)
    onToast(`Tuyến ${route} đã được chọn. Xu hướng bên dưới đã cập nhật.`)
  }

  function resetLocal() {
    setSelectedAirportCode(undefined)
    setSelectedRoute(undefined)
    setExpandedAirports(new Set())
    setExpandedRoutes(new Set())
    setAirportSearch('')
    setRouteSearch('')
  }

  const trendTitle = selectedRoute
    ? `Xu hướng trễ — Tuyến ${selectedRoute}`
    : selectedAirportCode
      ? `Xu hướng trễ — ${selectedAirportCode} vai trò ${formatRole(localState.grain === 'origin' ? 'Origin' : 'Destination')}`
      : 'Xu hướng trễ'

  const mapRoutes = useMemo(() => airportsQuery.data ? Object.values(airportsQuery.data.routesByAirport).flat() : [], [airportsQuery.data])

  if (airportsQuery.isError) {
    return <ErrorState message={airportsQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => airportsQuery.refetch()} />
  }

  function SortTh({ colKey, label }: { colKey: SortKey; label: string; tableKey?: 'airport' | 'route' }) {
    const sk = sortKey; const sd = sortDir; const onS = handleAirportSort
    return (
      <th role="columnheader" aria-sort={ariaSortVal(colKey, sk, sd)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <button type="button" onClick={() => onS(colKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}>
          {label}{sortIcon(colKey, sk, sd)}
        </button>
      </th>
    )
  }

  function RouteSortTh({ colKey, label }: { colKey: SortKey; label: string }) {
    return (
      <th role="columnheader" aria-sort={ariaSortVal(colKey, routeSortKey, routeSortDir)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <button type="button" onClick={() => handleRouteSort(colKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}>
          {label}{sortIcon(colKey, routeSortKey, routeSortDir)}
        </button>
      </th>
    )
  }

  return (
    <section className="view active" aria-labelledby="spatial-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P2 · Bằng chứng không gian</div>
          <h1 id="spatial-title">Sân bay &amp; tuyến bay cần xem trước</h1>
          <p className="page-subtitle">Bảng số liệu là nguồn xếp hạng chính xác; bản đồ giúp định vị trực quan.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <IllustrativeLabel />
          {(selectedAirportCode || selectedRoute) && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={resetLocal} title="Bỏ chọn sân bay hoặc tuyến bay đang chọn">Bỏ chọn cục bộ</button>
          )}
        </div>
      </div>

      <div className="grid split-spatial page-section-gap">
        <Card
          id="P2-C02"
          className="spatial-map-card"
          title="Bản đồ điểm nóng sân bay"
          subtitle="Điểm nóng trễ theo vị trí không gian mạng lưới · Sắp xếp theo chênh lệch chuẩn"
          action={
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <IllustrativeLabel compact />
            </div>
          }
        >
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : (
            <AirportMap
              airports={airportsQuery.data.airports}
              routes={mapRoutes}
              networkBaselineRate={airportsQuery.data.networkBaselineRate}
              selectedId={selectedAirport?.id}
              enableMeasurement
              onSelect={(airport) => selectAirport(airport.code)}
              onSelectPair={(pair) => selectRoute(pair.join(' → '))}
              onAirportContextMenu={(e, airport) => openContextMenu(e, airport.entity, 'Airport', airport.code)}
            />
          )}
        </Card>

        <Card
          id="P2-C03"
          className="spatial-evidence-card"
          title={routeOnlyMode ? 'Bằng chứng tuyến bay' : 'Bằng chứng sân bay'}
          subtitle={routeOnlyMode ? 'Tất cả tuyến theo filter · sắp theo chênh lệch' : 'Hiển thị đồng thời điểm đi và đến · hover để xem chi tiết đầy đủ'}
          action={
            <div className="segmented-control segmented-control--compact" role="group" aria-label="Chế độ hiển thị danh sách">
              <button
                type="button"
                className={!routeOnlyMode ? 'active' : ''}
                onClick={() => {
                  if (routeOnlyMode) {
                    setRouteOnlyMode(false)
                    setSelectedRoute(undefined)
                    setSelectedAirportCode(undefined)
                  }
                }}
              >
                Theo sân bay
              </button>
              <button
                type="button"
                className={routeOnlyMode ? 'active' : ''}
                onClick={() => {
                  if (!routeOnlyMode) {
                    setRouteOnlyMode(true)
                    setSelectedRoute(undefined)
                    setSelectedAirportCode(undefined)
                  }
                }}
              >
                Theo tuyến bay
              </button>
            </div>
          }
        >
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : routeOnlyMode ? (
            <>
              <div className="table-toolbar">
                <input className="table-search" type="search" placeholder="Tìm tuyến bay..." value={routeSearch} onChange={(e) => setRouteSearch(e.target.value)} aria-label="Tìm kiếm toàn bảng tuyến bay" />
                {routeSearch && <button className="btn btn-ghost btn--xs" type="button" onClick={() => setRouteSearch('')}>Xoá</button>}
              </div>
              {filteredRoutes.length === 0 ? (
                <EmptyState title="Không có kết quả" detail={routeSearch ? `Không tìm thấy tuyến khớp "${routeSearch}".` : 'Không có tuyến nào theo bộ lọc hiện tại.'} action={routeSearch ? <button className="btn btn-ghost" type="button" onClick={() => setRouteSearch('')}>Xoá tìm kiếm</button> : undefined} />
              ) : (
                <div className="table-wrap table-scroll">
                  <table className="spatial-table">
                    <thead>
                      <tr>
                        <RouteSortTh colKey="code" label="Tuyến bay" />
                        <RouteSortTh colKey="gap" label="Tỷ lệ trễ &amp; Chênh lệch" />
                        <RouteSortTh colKey="averageDelay" label="Trễ TB" />
                        <th style={{ width: '48px', textAlign: 'center' }} aria-label="Thao tác">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoutes.map((route) => {
                        const isRouteExpanded = expandedRoutes.has(route.entity)
                        const parts = route.entity.split(/\s*→\s*/)
                        const originCode = parts[0]?.trim() ?? ''
                        const destCode = parts[1]?.trim() ?? ''
                        const originAirport = airportsQuery.data?.airports.find((a) => a.code === originCode)
                        const destAirport = airportsQuery.data?.airports.find((a) => a.code === destCode)
                        const rGapText = route.gap !== null ? `${(route.gap ?? 0) > 0 ? '+' : ''}${route.gap.toFixed(1).replace('.', ',')}%` : '--'

                        const routeTooltip = [
                          `Tuyến bay ${route.entity}:`,
                          `• Tỷ lệ trễ: ${route.rate.toFixed(1).replace('.', ',')}% (Chuẩn mạng: ${route.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${rGapText})`,
                          `• Số chuyến trễ: ${(route.delayedCount ?? 0).toLocaleString('vi-VN')} / ${route.n.toLocaleString('vi-VN')} chuyến`,
                          `• Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`,
                          `• Cỡ mẫu n: ${route.n.toLocaleString('vi-VN')} chuyến`
                        ].join('\n')

                        return (
                          <Fragment key={route.id}>
                            <tr
                              className={`selectable${selectedRoute === route.entity ? ' selected' : ''}`}
                              onClick={() => selectRoute(route.entity)}
                              onContextMenu={(e) => openContextMenu(e, route.entity, 'Route')}
                            >
                              <td className="route-name">{route.entity}</td>
                              <td
                                data-tooltip-multiline
                                data-tooltip={routeTooltip}
                              >
                                <strong>{route.rate.toFixed(1).replace('.', ',')}%</strong>{' '}
                                {route.gap !== null && (
                                  <span className={(route.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'} style={{ fontSize: '11px', fontWeight: 600 }}>
                                    ({rGapText})
                                  </span>
                                )}
                              </td>
                              <td data-tooltip={`Trễ trung bình tuyến ${route.entity}: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`}>
                                {route.averageDelay.toFixed(1).replace('.', ',')} ph
                              </td>
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn--xs expand-btn"
                                    onClick={(e) => { e.stopPropagation(); toggleRouteExpand(route.entity) }}
                                    aria-expanded={isRouteExpanded}
                                    aria-label={`${isRouteExpanded ? 'Thu gọn' : 'Mở rộng'} 2 sân bay của tuyến ${route.entity}`}
                                    data-tooltip={isRouteExpanded ? 'Thu gọn sân bay đi/đến' : 'Xem 2 sân bay của tuyến này'}
                                    title={isRouteExpanded ? 'Thu gọn sân bay đi/đến' : 'Xem 2 sân bay của tuyến này'}
                                  >
                                    {isRouteExpanded ? '▲' : '▼'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn--xs"
                                    style={{ padding: '0 4px', minWidth: '18px', height: '22px', fontSize: '12px', fontWeight: 'bold' }}
                                    onClick={(e) => openContextMenu(e, route.entity, 'Route')}
                                    data-tooltip="Mở menu thao tác"
                                    title="Mở menu thao tác"
                                    aria-label="Thao tác"
                                  >
                                    ⋮
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isRouteExpanded && (
                              <>
                                <tr
                                  key={`${route.id}-origin`}
                                  className={`route-child-row selectable${selectedAirportCode === originCode ? ' selected' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); selectAirport(originCode) }}
                                  onContextMenu={(e) => openContextMenu(e, originAirport?.entity ?? originCode, 'Airport', originCode, 'Origin')}
                                >
                                  <td style={{ paddingLeft: '1.5rem' }}>
                                    <span className="route-name route-name--small">{originCode}</span>
                                    <span className="subcell">Sân bay đi</span>
                                  </td>
                                  <td
                                    data-tooltip-multiline
                                    data-tooltip={`Sân bay đi ${originCode}:\n• Tỷ lệ trễ: ${originAirport?.originMetrics ? originAirport.originMetrics.rate.toFixed(1).replace('.', ',') + '%' : '--'}\n• Chuẩn: ${originAirport?.originMetrics?.baseline?.toFixed(1).replace('.', ',') ?? '--'}% (Chênh lệch: ${originAirport?.originMetrics?.gap !== null && originAirport?.originMetrics?.gap !== undefined ? (originAirport.originMetrics.gap > 0 ? '+' : '') + originAirport.originMetrics.gap.toFixed(1).replace('.', ',') + '%' : '--'})\n• Chuyến trễ: ${originAirport?.originMetrics?.delayedCount.toLocaleString('vi-VN') ?? '--'} / ${originAirport?.originMetrics?.n.toLocaleString('vi-VN') ?? '--'}\n• Cỡ mẫu n: ${originAirport?.originMetrics?.n.toLocaleString('vi-VN') ?? '--'}`}
                                  >
                                    <strong>{originAirport?.originMetrics ? `${originAirport.originMetrics.rate.toFixed(1).replace('.', ',')}%` : '--'}</strong>{' '}
                                    {originAirport?.originMetrics?.gap !== null && originAirport?.originMetrics?.gap !== undefined && (
                                      <span className={(originAirport.originMetrics.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'} style={{ fontSize: '11px', fontWeight: 600 }}>
                                        ({(originAirport.originMetrics.gap ?? 0) > 0 ? '+' : ''}{originAirport.originMetrics.gap.toFixed(1).replace('.', ',')}%)
                                      </span>
                                    )}
                                  </td>
                                  <td data-tooltip={`Trễ trung bình: ${originAirport?.originMetrics ? originAirport.originMetrics.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'}`}>
                                    {originAirport?.originMetrics ? `${originAirport.originMetrics.averageDelay.toFixed(1).replace('.', ',')} ph` : '--'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn--xs"
                                      onClick={(e) => { e.stopPropagation(); selectAirport(originCode) }}
                                      title={`Xem xu hướng sân bay đi ${originCode}`}
                                    >
                                      Xem
                                    </button>
                                  </td>
                                </tr>
                                <tr
                                  key={`${route.id}-dest`}
                                  className={`route-child-row selectable${selectedAirportCode === destCode ? ' selected' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); selectAirport(destCode) }}
                                  onContextMenu={(e) => openContextMenu(e, destAirport?.entity ?? destCode, 'Airport', destCode, 'Destination')}
                                >
                                  <td style={{ paddingLeft: '1.5rem' }}>
                                    <span className="route-name route-name--small">{destCode}</span>
                                    <span className="subcell">Sân bay đến</span>
                                  </td>
                                  <td
                                    data-tooltip-multiline
                                    data-tooltip={`Sân bay đến ${destCode}:\n• Tỷ lệ trễ: ${destAirport?.destMetrics ? destAirport.destMetrics.rate.toFixed(1).replace('.', ',') + '%' : '--'}\n• Chuẩn: ${destAirport?.destMetrics?.baseline?.toFixed(1).replace('.', ',') ?? '--'}% (Chênh lệch: ${destAirport?.destMetrics?.gap !== null && destAirport?.destMetrics?.gap !== undefined ? (destAirport.destMetrics.gap > 0 ? '+' : '') + destAirport.destMetrics.gap.toFixed(1).replace('.', ',') + '%' : '--'})\n• Chuyến trễ: ${destAirport?.destMetrics?.delayedCount.toLocaleString('vi-VN') ?? '--'} / ${destAirport?.destMetrics?.n.toLocaleString('vi-VN') ?? '--'}\n• Cỡ mẫu n: ${destAirport?.destMetrics?.n.toLocaleString('vi-VN') ?? '--'}`}
                                  >
                                    <strong>{destAirport?.destMetrics ? `${destAirport.destMetrics.rate.toFixed(1).replace('.', ',')}%` : '--'}</strong>{' '}
                                    {destAirport?.destMetrics?.gap !== null && destAirport?.destMetrics?.gap !== undefined && (
                                      <span className={(destAirport.destMetrics.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'} style={{ fontSize: '11px', fontWeight: 600 }}>
                                        ({(destAirport.destMetrics.gap ?? 0) > 0 ? '+' : ''}{destAirport.destMetrics.gap.toFixed(1).replace('.', ',')}%)
                                      </span>
                                    )}
                                  </td>
                                  <td data-tooltip={`Trễ trung bình: ${destAirport?.destMetrics ? destAirport.destMetrics.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'}`}>
                                    {destAirport?.destMetrics ? `${destAirport.destMetrics.averageDelay.toFixed(1).replace('.', ',')} ph` : '--'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn--xs"
                                      onClick={(e) => { e.stopPropagation(); selectAirport(destCode) }}
                                      title={`Xem xu hướng sân bay đến ${destCode}`}
                                    >
                                      Xem
                                    </button>
                                  </td>
                                </tr>
                              </>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : airportsQuery.data.airports.length === 0 ? (
            <EmptyState title="Không có dữ liệu sân bay" detail="Không có sân bay nào phù hợp với phạm vi phân tích hiện tại." />
          ) : (
            <>
              <div className="table-toolbar">
                <input className="table-search" type="search" placeholder="Tìm sân bay (mã, tên, chỉ số...)" value={airportSearch} onChange={(e) => setAirportSearch(e.target.value)} aria-label="Tìm kiếm toàn bảng sân bay" />
                {airportSearch && <button className="btn btn-ghost btn--xs" type="button" onClick={() => setAirportSearch('')}>Xoá</button>}
              </div>
              {filteredAirports.length === 0 ? (
                <EmptyState title="Không có kết quả" detail={`Không tìm thấy sân bay khớp với "${airportSearch}".`} action={<button className="btn btn-ghost" type="button" onClick={() => setAirportSearch('')}>Xoá tìm kiếm</button>} />
              ) : (
                <div className="table-wrap table-scroll">
                  <table className="spatial-table">
                    <thead>
                      <tr>
                        <SortTh colKey="code" label="Sân bay" />
                        <SortTh colKey="gap" label="Tỷ lệ trễ &amp; Chênh lệch" />
                        <SortTh colKey="averageDelay" label="Trễ TB" />
                        <th style={{ width: '48px', textAlign: 'center' }} aria-label="Thao tác">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAirports.map((airport) => {
                        const isSelected = selectedAirportCode === airport.code
                        const isExpanded = expandedAirports.has(airport.code)
                        const subRoutes = airportsQuery.data?.routesByAirport[airport.code] ?? []
                        const o = airport.originMetrics
                        const d = airport.destMetrics

                        const oGapText = o?.gap !== null && o?.gap !== undefined ? `${(o.gap ?? 0) > 0 ? '+' : ''}${o.gap.toFixed(1).replace('.', ',')}%` : '--'
                        const dGapText = d?.gap !== null && d?.gap !== undefined ? `${(d.gap ?? 0) > 0 ? '+' : ''}${d.gap.toFixed(1).replace('.', ',')}%` : '--'

                        const tooltipDetail = [
                          `Sân bay ${airport.code} — ${airport.city ?? airport.name}`,
                          `• Điểm đi: Tỷ lệ trễ ${o ? o.rate.toFixed(1).replace('.', ',') + '%' : '--'} (Chuẩn mạng: ${o?.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${oGapText})`,
                          `  Chuyến trễ: ${o ? o.delayedCount.toLocaleString('vi-VN') + ' / ' + o.n.toLocaleString('vi-VN') + ' chuyến' : '--'} | Trễ TB: ${o ? o.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'} | Cỡ mẫu n: ${o ? o.n.toLocaleString('vi-VN') : '--'}`,
                          ``,
                          `• Điểm đến: Tỷ lệ trễ ${d ? d.rate.toFixed(1).replace('.', ',') + '%' : '--'} (Chuẩn mạng: ${d?.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${dGapText})`,
                          `  Chuyến trễ: ${d ? d.delayedCount.toLocaleString('vi-VN') + ' / ' + d.n.toLocaleString('vi-VN') + ' chuyến' : '--'} | Trễ TB: ${d ? d.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'} | Cỡ mẫu n: ${d ? d.n.toLocaleString('vi-VN') : '--'}`
                        ].join('\n')

                        const avgTooltip = [
                          `Thời gian trễ trung bình tại ${airport.code}:`,
                          `• Khi là sân bay đi: ${o ? o.averageDelay.toFixed(1).replace('.', ',') + ' phút/chuyến' : '--'}`,
                          `• Khi là sân bay đến: ${d ? d.averageDelay.toFixed(1).replace('.', ',') + ' phút/chuyến' : '--'}`
                        ].join('\n')

                        return (
                          <Fragment key={airport.id ?? airport.code}>
                            <tr
                              className={`selectable${isSelected ? ' selected' : ''}`}
                              onClick={() => selectAirport(airport.code)}
                              onContextMenu={(e) => openContextMenu(e, airport.entity, 'Airport', airport.code)}
                            >
                              <td>
                                <span className="route-name" title={airport.entity}>{airport.code}</span>
                                <span className="subcell">{airport.city ?? airport.name}</span>
                              </td>

                              <td
                                className="dual-stat-cell"
                                data-tooltip-multiline
                                data-tooltip={tooltipDetail}
                              >
                                <div className="role-stat-row">
                                  <span className="role-badge role-badge--origin">Đi</span>
                                  <span className="role-rate-val">{o ? `${o.rate.toFixed(1).replace('.', ',')}%` : '--'}</span>
                                  {o?.gap !== null && o?.gap !== undefined && (
                                    <span className={`role-gap-val ${(o.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'}`}>
                                      ({oGapText})
                                    </span>
                                  )}
                                </div>
                                <div className="role-stat-row">
                                  <span className="role-badge role-badge--dest">Đến</span>
                                  <span className="role-rate-val">{d ? `${d.rate.toFixed(1).replace('.', ',')}%` : '--'}</span>
                                  {d?.gap !== null && d?.gap !== undefined && (
                                    <span className={`role-gap-val ${(d.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'}`}>
                                      ({dGapText})
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td
                                className="dual-stat-cell"
                                data-tooltip-multiline
                                data-tooltip={avgTooltip}
                              >
                                <div className="role-stat-row">
                                  <span className="role-badge role-badge--origin">Đi</span>
                                  <span>{o ? `${o.averageDelay.toFixed(1).replace('.', ',')} ph` : '--'}</span>
                                </div>
                                <div className="role-stat-row">
                                  <span className="role-badge role-badge--dest">Đến</span>
                                  <span>{d ? `${d.averageDelay.toFixed(1).replace('.', ',')} ph` : '--'}</span>
                                </div>
                              </td>

                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn--xs expand-btn"
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(airport.code) }}
                                    aria-expanded={isExpanded}
                                    aria-label={`${isExpanded ? 'Thu gọn' : 'Mở rộng'} các tuyến ứng với sân bay ${airport.code}`}
                                    data-tooltip={isExpanded ? `Thu gọn các tuyến của ${airport.code}` : `Xem các tuyến ứng với sân bay ${airport.code}`}
                                    title={isExpanded ? `Thu gọn các tuyến của ${airport.code}` : `Xem các tuyến ứng với sân bay ${airport.code}`}
                                  >
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn--xs"
                                    style={{ padding: '0 4px', minWidth: '18px', height: '22px', fontSize: '12px', fontWeight: 'bold' }}
                                    onClick={(e) => openContextMenu(e, airport.entity, 'Airport', airport.code)}
                                    data-tooltip="Mở menu thao tác"
                                    title="Mở menu thao tác"
                                    aria-label="Thao tác"
                                  >
                                    ⋮
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <>
                                {subRoutes.length === 0 ? (
                                  <tr key={`${airport.code}-noroutes`} className="route-child-row">
                                    <td colSpan={4} style={{ paddingLeft: '2rem', fontStyle: 'italic', color: 'var(--muted)' }}>
                                      Không có tuyến bay kết nối phù hợp bộ lọc hiện tại.
                                    </td>
                                  </tr>
                                ) : (
                                  subRoutes.map((route) => {
                                    const rGapText = route.gap !== null ? `${(route.gap ?? 0) > 0 ? '+' : ''}${route.gap.toFixed(1).replace('.', ',')}%` : '--'
                                    const routeTooltip = [
                                      `Tuyến bay ${route.entity}:`,
                                      `• Tỷ lệ trễ: ${route.rate.toFixed(1).replace('.', ',')}% (Chuẩn mạng: ${route.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${rGapText})`,
                                      `• Số chuyến trễ: ${(route.delayedCount ?? 0).toLocaleString('vi-VN')} / ${route.n.toLocaleString('vi-VN')} chuyến`,
                                      `• Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`,
                                      `• Cỡ mẫu n: ${route.n.toLocaleString('vi-VN')} chuyến`
                                    ].join('\n')

                                    return (
                                      <tr
                                        key={route.id}
                                        className={`route-child-row selectable${selectedRoute === route.entity ? ' selected' : ''}`}
                                        onClick={() => selectRoute(route.entity)}
                                        onContextMenu={(e) => openContextMenu(e, route.entity, 'Route')}
                                      >
                                        <td style={{ paddingLeft: '1.8rem' }}>
                                          <span className="route-name route-name--small">{route.entity}</span>
                                        </td>
                                        <td
                                          data-tooltip-multiline
                                          data-tooltip={routeTooltip}
                                        >
                                          <strong>{route.rate.toFixed(1).replace('.', ',')}%</strong>{' '}
                                          {route.gap !== null && (
                                            <span className={(route.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'} style={{ fontSize: '11px', fontWeight: 600 }}>
                                              ({rGapText})
                                            </span>
                                          )}
                                        </td>
                                        <td data-tooltip={`Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`}>
                                          {route.averageDelay.toFixed(1).replace('.', ',')} ph
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            type="button"
                                            className="btn btn-ghost btn--xs"
                                            style={{ padding: '0 4px', minWidth: '18px', height: '22px', fontSize: '12px', fontWeight: 'bold' }}
                                            onClick={(e) => openContextMenu(e, route.entity, 'Route')}
                                            data-tooltip="Mở menu thao tác"
                                            title="Mở menu thao tác"
                                            aria-label="Thao tác"
                                          >
                                            ⋮
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="inline-actions">
                <button className="btn btn-secondary" type="button" disabled={!selectedAirport} onClick={() => selectedAirport && onOpenEvidence(selectedAirport.entity)}>Xem bằng chứng</button>
                <button className="btn btn-secondary" type="button" disabled={!selectedAirport} onClick={() => selectedAirport && onOpenCause(selectedAirport.entity)}>Bối cảnh nguyên nhân</button>
              </div>
            </>
          )}
        </Card>
      </div>

      {entityTrendFilters && (
        <Card
          id="P2-C05"
          title={trendTitle}
          subtitle="Xu hướng tháng/tuần/ngày · WN so với DL, AA · Dự báo tháng tiếp theo"
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedAirportCode && (
                <div className="segmented-control segmented-control--compact" aria-label="Vai trò hiển thị xu hướng">
                  <button
                    type="button"
                    className={localState.grain === 'origin' ? 'active' : ''}
                    onClick={() => setLocalState((s) => ({ ...s, grain: 'origin' }))}
                  >
                    Sân bay đi
                  </button>
                  <button
                    type="button"
                    className={localState.grain === 'destination' ? 'active' : ''}
                    onClick={() => setLocalState((s) => ({ ...s, grain: 'destination' }))}
                  >
                    Sân bay đến
                  </button>
                </div>
              )}
              {selectedRoute && (
                <button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-R' })}>
                  So sánh hãng bay
                </button>
              )}
            </div>
          }
        >
          {trendQuery.isLoading || !trendQuery.data ? <LoadingState rows={4} /> : trendQuery.isError ? (
            <EmptyState title="Không thể tải xu hướng" detail={trendQuery.error?.message ?? 'Lỗi dữ liệu'} />
          ) : (
            <UnifiedTrendChart data={trendQuery.data} onToast={onToast} />
          )}
        </Card>
      )}

      {contextMenu?.visible && (
        <div
          className="custom-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          role="menu"
          aria-label={`Menu thao tác cho ${contextMenu.entity}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span>Thực thể</span>
            <strong>{contextMenu.code ?? contextMenu.entity}</strong>
          </div>

          <button
            type="button"
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              if (contextMenu.entityType === 'Route') {
                selectRoute(contextMenu.entity)
              } else if (contextMenu.code) {
                if (contextMenu.role) {
                  setLocalState((s) => ({ ...s, grain: contextMenu.role === 'Origin' ? 'origin' : 'destination' }))
                }
                selectAirport(contextMenu.code)
              }
              setContextMenu(null)
            }}
          >
            Xem xu hướng chi tiết
          </button>

          <button
            type="button"
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              onSelectEntity(contextMenu.entity)
              onNavigate('temporal')
              setContextMenu(null)
            }}
          >
            Phân tích quy luật thời gian
          </button>

          <button
            type="button"
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              onSelectEntity(contextMenu.entity)
              onNavigate('prediction')
              setContextMenu(null)
            }}
          >
            Mở dự báo &amp; ưu tiên
          </button>

          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              onOpenEvidence(contextMenu.entity)
              setContextMenu(null)
            }}
          >
            Xem bằng chứng phân đoạn
          </button>

          <button
            type="button"
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              onOpenCause(contextMenu.entity)
              setContextMenu(null)
            }}
          >
            Bối cảnh nguyên nhân ghi nhận
          </button>

          {contextMenu.entityType === 'Route' && (
            <button
              type="button"
              className="context-menu-item"
              role="menuitem"
              onClick={() => {
                onOpenComparison({ entity: contextMenu.entity, variant: 'CM-R' })
                setContextMenu(null)
              }}
            >
              So sánh hãng bay trên tuyến
            </button>
          )}
        </div>
      )}
    </section>
  )
}
