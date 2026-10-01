import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { AirportHotspot, EvidenceRecord } from '../../domain/types'
import { Card, EmptyState } from '../ui/Card'

export type TableSortKey = 'code' | 'rate' | 'gap' | 'averageDelay' | 'n'
export type TableSortDir = 'none' | 'asc' | 'desc'

export interface RouteAirportEvidenceTableProps {
  id?: string
  title?: string
  subtitle?: string
  routes: EvidenceRecord[]
  airports: AirportHotspot[]
  routesByAirport?: Record<string, EvidenceRecord[]>
  selectedRoute?: string
  selectedAirportCode?: string
  selectedAirportCodes?: string[]
  defaultMode?: 'route' | 'airport'
  mode?: 'route' | 'airport'
  onModeChange?: (mode: 'route' | 'airport') => void
  onSelectRoute: (route: string) => void
  onSelectAirport: (code: string) => void
  onOpenContextMenu: (
    e: React.MouseEvent,
    entity: string,
    entityType: 'Airport' | 'Route',
    code?: string,
    role?: 'Origin' | 'Destination',
  ) => void
  extraAction?: ReactNode
}

function nextDir(dir: TableSortDir): TableSortDir {
  if (dir === 'none') return 'asc'
  if (dir === 'asc') return 'desc'
  return 'none'
}

function sortIndicator(key: TableSortKey, currentKey: TableSortKey, dir: TableSortDir): string {
  if (key !== currentKey || dir === 'none') return ''
  return dir === 'asc' ? ' ▲' : ' ▼'
}

function normalizeText(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function airportSearchString(a: AirportHotspot): string {
  const parts: string[] = [a.code ?? '', a.entity, a.city ?? '']
  if (a.originMetrics) {
    parts.push(
      `${a.originMetrics.rate.toFixed(1)}%`,
      a.originMetrics.gap !== null && a.originMetrics.gap !== undefined ? `+${a.originMetrics.gap.toFixed(1)}%` : '',
      a.originMetrics.averageDelay.toFixed(1),
    )
  }
  if (a.destMetrics) {
    parts.push(
      `${a.destMetrics.rate.toFixed(1)}%`,
      a.destMetrics.gap !== null && a.destMetrics.gap !== undefined ? `+${a.destMetrics.gap.toFixed(1)}%` : '',
      a.destMetrics.averageDelay.toFixed(1),
    )
  }
  return parts.join(' ')
}

function routeSearchString(r: EvidenceRecord): string {
  return [
    r.entity,
    `${r.rate.toFixed(1)}%`,
    r.gap !== null ? `+${r.gap.toFixed(1)}%` : '',
    r.averageDelay.toFixed(1),
    r.n.toLocaleString('vi-VN'),
  ].join(' ')
}

export function RouteAirportEvidenceTable({
  id = 'evidence-table',
  title,
  subtitle,
  routes,
  airports,
  routesByAirport = {},
  selectedRoute,
  selectedAirportCode,
  selectedAirportCodes = [],
  defaultMode = 'route',
  mode: controlledMode,
  onModeChange,
  onSelectRoute,
  onSelectAirport,
  onOpenContextMenu,
  extraAction,
}: RouteAirportEvidenceTableProps) {
  const [internalMode, setInternalMode] = useState<'route' | 'airport'>(defaultMode)
  const currentMode = controlledMode ?? internalMode

  const handleSetMode = (newMode: 'route' | 'airport') => {
    if (onModeChange) onModeChange(newMode)
    else setInternalMode(newMode)
  }

  const [expandedAirports, setExpandedAirports] = useState<Set<string>>(new Set())
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())

  const [airportSearch, setAirportSearch] = useState('')
  const [routeSearch, setRouteSearch] = useState('')

  const [sortKey, setSortKey] = useState<TableSortKey>('gap')
  const [sortDir, setSortDir] = useState<TableSortDir>('desc')

  const [routeSortKey, setRouteSortKey] = useState<TableSortKey>('gap')
  const [routeSortDir, setRouteSortDir] = useState<TableSortDir>('desc')

  const toggleAirportExpand = (code: string) => {
    setExpandedAirports((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleRouteExpand = (routeEntity: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(routeEntity)) next.delete(routeEntity)
      else next.add(routeEntity)
      return next
    })
  }

  const handleAirportSort = (key: TableSortKey) => {
    if (sortKey === key) setSortDir(nextDir(sortDir))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleRouteSort = (key: TableSortKey) => {
    if (routeSortKey === key) setRouteSortDir(nextDir(routeSortDir))
    else {
      setRouteSortKey(key)
      setRouteSortDir('asc')
    }
  }

  const filteredAirports = useMemo(() => {
    const q = normalizeText(airportSearch)
    const filtered = q ? airports.filter((a) => normalizeText(airportSearchString(a)).includes(q)) : airports
    if (sortDir === 'none') return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'code') cmp = (a.code ?? '').localeCompare(b.code ?? '', 'vi')
      else if (sortKey === 'rate') {
        const aMax = Math.max(a.originMetrics?.rate ?? a.rate, a.destMetrics?.rate ?? a.rate)
        const bMax = Math.max(b.originMetrics?.rate ?? b.rate, b.destMetrics?.rate ?? b.rate)
        cmp = aMax - bMax
      } else if (sortKey === 'gap') {
        const aMax = Math.max(a.originMetrics?.gap ?? a.gap ?? -999, a.destMetrics?.gap ?? a.gap ?? -999)
        const bMax = Math.max(b.originMetrics?.gap ?? b.gap ?? -999, b.destMetrics?.gap ?? b.gap ?? -999)
        cmp = aMax - bMax
      } else if (sortKey === 'averageDelay') {
        const aAvg = Math.max(a.originMetrics?.averageDelay ?? a.averageDelay, a.destMetrics?.averageDelay ?? a.averageDelay)
        const bAvg = Math.max(b.originMetrics?.averageDelay ?? b.averageDelay, b.destMetrics?.averageDelay ?? b.averageDelay)
        cmp = aAvg - bAvg
      } else if (sortKey === 'n') {
        cmp = a.n - b.n
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [airports, airportSearch, sortKey, sortDir])

  const filteredRoutes = useMemo(() => {
    const q = normalizeText(routeSearch)
    const filtered = q ? routes.filter((r) => normalizeText(routeSearchString(r)).includes(q)) : routes
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
  }, [routes, routeSearch, routeSortKey, routeSortDir])

  const resolvedTitle = title ?? (currentMode === 'route' ? 'Bằng chứng tuyến bay' : 'Bằng chứng sân bay')
  const resolvedSubtitle = subtitle ?? (
    currentMode === 'route'
      ? 'Tất cả tuyến theo bộ lọc · sắp xếp theo chênh lệch chuẩn'
      : 'Hiển thị đồng thời điểm đi và đến · hover để xem chi tiết đầy đủ'
  )

  const AirportSortTh = ({ colKey, label }: { colKey: TableSortKey; label: string }) => (
    <th
      scope="col"
      className="sortable"
      tabIndex={0}
      aria-sort={sortKey === colKey ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none') : 'none'}
      onClick={() => handleAirportSort(colKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleAirportSort(colKey)
        }
      }}
    >
      {label}
      <span className="sort-icon">{sortIndicator(colKey, sortKey, sortDir)}</span>
    </th>
  )

  const RouteSortTh = ({ colKey, label }: { colKey: TableSortKey; label: string }) => (
    <th
      scope="col"
      className="sortable"
      tabIndex={0}
      aria-sort={routeSortKey === colKey ? (routeSortDir === 'asc' ? 'ascending' : routeSortDir === 'desc' ? 'descending' : 'none') : 'none'}
      onClick={() => handleRouteSort(colKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleRouteSort(colKey)
        }
      }}
    >
      {label}
      <span className="sort-icon">{sortIndicator(colKey, routeSortKey, routeSortDir)}</span>
    </th>
  )

  return (
    <Card
      id={id}
      className="spatial-evidence-card"
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {extraAction}
          <div className="segmented-control segmented-control--compact" role="group" aria-label="Chế độ hiển thị danh sách">
            <button
              type="button"
              className={currentMode === 'airport' ? 'active' : ''}
              onClick={() => handleSetMode('airport')}
            >
              Theo sân bay
            </button>
            <button
              type="button"
              className={currentMode === 'route' ? 'active' : ''}
              onClick={() => handleSetMode('route')}
            >
              Theo tuyến bay
            </button>
          </div>
        </div>
      }
    >
      {currentMode === 'route' ? (
        <>
          <div className="table-toolbar">
            <input
              className="table-search"
              type="search"
              placeholder="Tìm tuyến bay..."
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              aria-label="Tìm kiếm toàn bảng tuyến bay"
            />
            {routeSearch && (
              <button className="btn btn-ghost btn--xs" type="button" onClick={() => setRouteSearch('')}>
                Xóa
              </button>
            )}
          </div>
          {filteredRoutes.length === 0 ? (
            <EmptyState
              title="Không có kết quả"
              detail={routeSearch ? `Không tìm thấy tuyến khớp "${routeSearch}".` : 'Không có tuyến nào theo bộ lọc hiện tại.'}
              action={routeSearch ? <button className="btn btn-ghost" type="button" onClick={() => setRouteSearch('')}>Xóa tìm kiếm</button> : undefined}
            />
          ) : (
            <div className="table-wrap table-scroll">
              <table className="spatial-table">
                <thead>
                  <tr>
                    <RouteSortTh colKey="code" label="Tuyến bay" />
                    <RouteSortTh colKey="gap" label="Tỷ lệ trễ & Chênh lệch" />
                    <RouteSortTh colKey="averageDelay" label="Trễ TB" />
                    <th style={{ width: '48px', textAlign: 'center' }} aria-label="Thao tác">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((route) => {
                    const isRouteExpanded = expandedRoutes.has(route.entity)
                    const parts = route.entity.split(/\s*→\s*/)
                    const originCode = parts[0]?.trim() ?? ''
                    const destCode = parts[1]?.trim() ?? ''
                    const originAirport = airports.find((a) => a.code === originCode)
                    const destAirport = airports.find((a) => a.code === destCode)
                    const rGapText = route.gap !== null ? `${(route.gap ?? 0) > 0 ? '+' : ''}${route.gap.toFixed(1).replace('.', ',')}%` : '--'

                    const routeTooltip = [
                      `Tuyến bay ${route.entity}:`,
                      `• Tỷ lệ trễ: ${route.rate.toFixed(1).replace('.', ',')}% (Chuẩn: ${route.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${rGapText})`,
                      `• Số chuyến trễ: ${(route.delayedCount ?? 0).toLocaleString('vi-VN')} / ${route.n.toLocaleString('vi-VN')} chuyến`,
                      `• Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`,
                      `• Cỡ mẫu n: ${route.n.toLocaleString('vi-VN')} chuyến`,
                    ].join('\n')

                    const isRouteRowSelected =
                      selectedRoute === route.entity ||
                      (selectedAirportCodes.length === 2 &&
                        parts.length === 2 &&
                        selectedAirportCodes.includes(originCode) &&
                        selectedAirportCodes.includes(destCode))

                    return (
                      <Fragment key={route.id}>
                        <tr
                          className={`selectable${isRouteRowSelected ? ' selected' : ''}`}
                          data-route-entity={route.entity}
                          onClick={() => onSelectRoute(route.entity)}
                          onContextMenu={(e) => onOpenContextMenu(e, route.entity, 'Route')}
                        >
                          <td className="route-name">{route.entity}</td>
                          <td data-tooltip-multiline data-tooltip={routeTooltip}>
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleRouteExpand(route.entity)
                                }}
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
                                onClick={(e) => onOpenContextMenu(e, route.entity, 'Route')}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectAirport(originCode)
                              }}
                              onContextMenu={(e) => onOpenContextMenu(e, originAirport?.entity ?? originCode, 'Airport', originCode, 'Origin')}
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectAirport(originCode)
                                  }}
                                  title={`Xem sân bay đi ${originCode}`}
                                >
                                  Xem
                                </button>
                              </td>
                            </tr>
                            <tr
                              key={`${route.id}-dest`}
                              className={`route-child-row selectable${selectedAirportCode === destCode ? ' selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectAirport(destCode)
                              }}
                              onContextMenu={(e) => onOpenContextMenu(e, destAirport?.entity ?? destCode, 'Airport', destCode, 'Destination')}
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectAirport(destCode)
                                  }}
                                  title={`Xem sân bay đến ${destCode}`}
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
      ) : (
        <>
          <div className="table-toolbar">
            <input
              className="table-search"
              type="search"
              placeholder="Tìm sân bay (mã, tên, chỉ số...)"
              value={airportSearch}
              onChange={(e) => setAirportSearch(e.target.value)}
              aria-label="Tìm kiếm toàn bảng sân bay"
            />
            {airportSearch && (
              <button className="btn btn-ghost btn--xs" type="button" onClick={() => setAirportSearch('')}>
                Xóa
              </button>
            )}
          </div>
          {filteredAirports.length === 0 ? (
            <EmptyState
              title="Không có kết quả"
              detail={`Không tìm thấy sân bay khớp với "${airportSearch}".`}
              action={<button className="btn btn-ghost" type="button" onClick={() => setAirportSearch('')}>Xóa tìm kiếm</button>}
            />
          ) : (
            <div className="table-wrap table-scroll">
              <table className="spatial-table">
                <thead>
                  <tr>
                    <AirportSortTh colKey="code" label="Sân bay" />
                    <AirportSortTh colKey="gap" label="Tỷ lệ trễ & Chênh lệch" />
                    <AirportSortTh colKey="averageDelay" label="Trễ TB" />
                    <th style={{ width: '48px', textAlign: 'center' }} aria-label="Thao tác">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAirports.map((airport) => {
                    const isSelected =
                      selectedAirportCode === airport.code ||
                      (selectedAirportCodes.length === 1 && selectedAirportCodes[0] === airport.code)
                    const isExpanded = expandedAirports.has(airport.code)
                    const subRoutes = routesByAirport[airport.code] ?? []
                    const o = airport.originMetrics
                    const d = airport.destMetrics

                    const oGapText = o?.gap !== null && o?.gap !== undefined ? `${(o.gap ?? 0) > 0 ? '+' : ''}${o.gap.toFixed(1).replace('.', ',')}%` : '--'
                    const dGapText = d?.gap !== null && d?.gap !== undefined ? `${(d.gap ?? 0) > 0 ? '+' : ''}${d.gap.toFixed(1).replace('.', ',')}%` : '--'

                    const tooltipDetail = [
                      `Sân bay ${airport.code} — ${airport.city ?? airport.name}`,
                      `• Điểm đi: Tỷ lệ trễ ${o ? o.rate.toFixed(1).replace('.', ',') + '%' : '--'} (Chuẩn: ${o?.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${oGapText})`,
                      `  Chuyến trễ: ${o ? o.delayedCount.toLocaleString('vi-VN') + ' / ' + o.n.toLocaleString('vi-VN') + ' chuyến' : '--'} | Trễ TB: ${o ? o.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'} | Cỡ mẫu n: ${o ? o.n.toLocaleString('vi-VN') : '--'}`,
                      '',
                      `• Điểm đến: Tỷ lệ trễ ${d ? d.rate.toFixed(1).replace('.', ',') + '%' : '--'} (Chuẩn: ${d?.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${dGapText})`,
                      `  Chuyến trễ: ${d ? d.delayedCount.toLocaleString('vi-VN') + ' / ' + d.n.toLocaleString('vi-VN') + ' chuyến' : '--'} | Trễ TB: ${d ? d.averageDelay.toFixed(1).replace('.', ',') + ' ph' : '--'} | Cỡ mẫu n: ${d ? d.n.toLocaleString('vi-VN') : '--'}`,
                    ].join('\n')

                    const avgTooltip = [
                      `Thời gian trễ trung bình tại ${airport.code}:`,
                      `• Khi là sân bay đi: ${o ? o.averageDelay.toFixed(1).replace('.', ',') + ' phút/chuyến' : '--'}`,
                      `• Khi là sân bay đến: ${d ? d.averageDelay.toFixed(1).replace('.', ',') + ' phút/chuyến' : '--'}`,
                    ].join('\n')

                    return (
                      <Fragment key={airport.id ?? airport.code}>
                        <tr
                          className={`selectable${isSelected ? ' selected' : ''}`}
                          onClick={() => onSelectAirport(airport.code)}
                          onContextMenu={(e) => onOpenContextMenu(e, airport.entity, 'Airport', airport.code)}
                        >
                          <td>
                            <span className="route-name" title={airport.entity}>
                              {airport.code}
                            </span>
                            <span className="subcell">{airport.city ?? airport.name}</span>
                          </td>

                          <td className="dual-stat-cell" data-tooltip-multiline data-tooltip={tooltipDetail}>
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

                          <td className="dual-stat-cell" data-tooltip-multiline data-tooltip={avgTooltip}>
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleAirportExpand(airport.code)
                                }}
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
                                onClick={(e) => onOpenContextMenu(e, airport.entity, 'Airport', airport.code)}
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
                                  `• Tỷ lệ trễ: ${route.rate.toFixed(1).replace('.', ',')}% (Chuẩn: ${route.baseline?.toFixed(1).replace('.', ',') ?? '--'}%, Chênh lệch: ${rGapText})`,
                                  `• Số chuyến trễ: ${(route.delayedCount ?? 0).toLocaleString('vi-VN')} / ${route.n.toLocaleString('vi-VN')} chuyến`,
                                  `• Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} phút`,
                                  `• Cỡ mẫu n: ${route.n.toLocaleString('vi-VN')} chuyến`,
                                ].join('\n')

                                const isSubRouteSelected =
                                  selectedRoute === route.entity ||
                                  (selectedAirportCodes.length === 2 &&
                                    selectedAirportCodes.includes(airport.code) &&
                                    (selectedAirportCodes.includes(route.origin ?? '') || selectedAirportCodes.includes(route.destination ?? '')))

                                return (
                                  <tr
                                    key={`${airport.code}-${route.id}`}
                                    className={`route-child-row selectable${isSubRouteSelected ? ' selected' : ''}`}
                                    onClick={() => onSelectRoute(route.entity)}
                                    onContextMenu={(e) => onOpenContextMenu(e, route.entity, 'Route')}
                                  >
                                    <td style={{ paddingLeft: '2rem' }}>
                                      <span className="route-name route-name--small">{route.entity}</span>
                                    </td>
                                    <td data-tooltip-multiline data-tooltip={routeTooltip}>
                                      <strong>{route.rate.toFixed(1).replace('.', ',')}%</strong>{' '}
                                      {route.gap !== null && (
                                        <span className={(route.gap ?? 0) > 0 ? 'diff-higher' : 'diff-lower'} style={{ fontSize: '11px', fontWeight: 600 }}>
                                          ({rGapText})
                                        </span>
                                      )}
                                    </td>
                                    <td data-tooltip={`Trễ trung bình: ${route.averageDelay.toFixed(1).replace('.', ',')} ph`}>
                                      {route.averageDelay.toFixed(1).replace('.', ',')} ph
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn--xs"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onSelectRoute(route.entity)
                                        }}
                                        title={`Xem tuyến ${route.entity}`}
                                      >
                                        Xem
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
        </>
      )}
    </Card>
  )
}
