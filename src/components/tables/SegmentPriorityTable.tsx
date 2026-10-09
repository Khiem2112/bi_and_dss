import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { RiskAggregate } from '../../domain/types'
import { formatEntityType } from '../../domain/formatters'
import { Card, EmptyState, SampleBadge } from '../ui/Card'

export type PrioritySortKey =
  | 'entity'
  | 'expectedRate'
  | 'highRiskShare'
  | 'historicalRate'
  | 'historicalGap'
  | 'sampleFlag'
  | 'priority'

export type PrioritySortDir = 'none' | 'asc' | 'desc'

export interface SegmentPriorityTableProps {
  id?: string
  title?: string
  subtitle?: string
  routes: RiskAggregate[]
  airports: RiskAggregate[]
  routesByAirport?: Record<string, RiskAggregate[]>
  allAggregates?: RiskAggregate[]
  selectedEntity?: string
  defaultMode?: 'route' | 'airport' | 'all'
  mode?: 'route' | 'airport' | 'all'
  onModeChange?: (mode: 'route' | 'airport' | 'all') => void
  onSelectEntity: (risk: RiskAggregate) => void
  onCardContextMenu?: React.MouseEventHandler<HTMLElement>
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, risk: RiskAggregate) => void
  extraAction?: ReactNode
}

const formatNumber = (value: number) => value.toLocaleString('vi-VN')
const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

function nextDir(dir: PrioritySortDir): PrioritySortDir {
  if (dir === 'none') return 'asc'
  if (dir === 'asc') return 'desc'
  return 'none'
}

function sortIndicator(key: PrioritySortKey, currentKey: PrioritySortKey, dir: PrioritySortDir): string {
  if (key !== currentKey || dir === 'none') return ''
  return dir === 'asc' ? ' ▲' : ' ▼'
}

function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesTerms(index: string, query: string): boolean {
  const normalizedIndex = normalizeText(index)
  return normalizeText(query)
    .split(' ')
    .filter(Boolean)
    .every((term) => normalizedIndex.includes(term))
}

function buildSearchIndex(risk: RiskAggregate): string {
  const parts: (string | number | null | undefined)[] = [
    risk.entity,
    risk.id,
    risk.code,
    risk.origin,
    risk.destination,
    formatEntityType(risk.type),
    risk.expectedRate,
    `${risk.expectedRate.toFixed(1)}%`,
    `${risk.expectedRate.toFixed(1).replace('.', ',')}%`,
    risk.scoredN,
    risk.highRiskShare,
    `${risk.highRiskShare.toFixed(1)}%`,
    `${risk.highRiskShare.toFixed(1).replace('.', ',')}%`,
    risk.historicalRate,
    `${risk.historicalRate.toFixed(1)}%`,
    `${risk.historicalRate.toFixed(1).replace('.', ',')}%`,
    risk.historicalDelayed,
    risk.historicalEligible,
    risk.historicalAverageDelay,
    risk.historicalGap,
    `${risk.historicalGap.toFixed(1)}%`,
    risk.sampleFlag,
    risk.priority,
  ]
  return parts.filter((p) => p !== null && p !== undefined).join(' ')
}

export function SegmentPriorityTable({
  id = 'P4-C05',
  title = 'Bảng ưu tiên phân đoạn',
  subtitle = 'Rủi ro + bằng chứng lịch sử + giải trình · Chỉ số ưu tiên vẫn ở trạng thái Chưa hiệu chỉnh',
  routes,
  airports,
  routesByAirport = {},
  allAggregates,
  selectedEntity,
  defaultMode = 'route',
  mode: controlledMode,
  onModeChange,
  onSelectEntity,
  onCardContextMenu,
  onRowContextMenu,
  extraAction,
}: SegmentPriorityTableProps) {
  const [internalMode, setInternalMode] = useState<'route' | 'airport' | 'all'>(defaultMode)
  const currentMode = controlledMode ?? internalMode

  const handleSetMode = (newMode: 'route' | 'airport' | 'all') => {
    if (onModeChange) onModeChange(newMode)
    else setInternalMode(newMode)
  }

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<PrioritySortKey>('expectedRate')
  const [sortDir, setSortDir] = useState<PrioritySortDir>('desc')

  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleSort = (key: PrioritySortKey) => {
    if (sortKey === key) {
      setSortDir(nextDir(sortDir))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const baseItems = useMemo(() => {
    if (currentMode === 'route') return routes
    if (currentMode === 'airport') return airports
    return allAggregates ?? [...routes, ...airports]
  }, [currentMode, routes, airports, allAggregates])

  const filteredItems = useMemo(() => {
    const list = searchQuery
      ? baseItems.filter((item) => matchesTerms(buildSearchIndex(item), searchQuery))
      : baseItems

    if (sortDir === 'none') return list

    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'entity') {
        cmp = a.entity.localeCompare(b.entity, 'vi')
      } else if (sortKey === 'expectedRate') {
        cmp = a.expectedRate - b.expectedRate
      } else if (sortKey === 'highRiskShare') {
        cmp = a.highRiskShare - b.highRiskShare
      } else if (sortKey === 'historicalRate') {
        cmp = a.historicalRate - b.historicalRate
      } else if (sortKey === 'historicalGap') {
        cmp = a.historicalGap - b.historicalGap
      } else if (sortKey === 'sampleFlag') {
        cmp = a.sampleFlag.localeCompare(b.sampleFlag, 'vi')
      } else if (sortKey === 'priority') {
        cmp = a.priority.localeCompare(b.priority, 'vi')
      }
      if (cmp === 0) cmp = a.id.localeCompare(b.id, 'vi')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [baseItems, searchQuery, sortKey, sortDir])

  const SortHeader = ({ colKey, label }: { colKey: PrioritySortKey; label: string }) => (
    <th
      scope="col"
      aria-sort={
        sortKey === colKey
          ? sortDir === 'asc'
            ? 'ascending'
            : sortDir === 'desc'
            ? 'descending'
            : 'none'
          : 'none'
      }
    >
      <button className="table-sort-button" type="button" onClick={() => handleSort(colKey)}>
        {label}
        <span className="sort-icon">{sortIndicator(colKey, sortKey, sortDir) || ' ↕'}</span>
      </button>
    </th>
  )

  const renderMetricsRow = (item: RiskAggregate, isChild = false, childLabel?: string) => {
    const isSelected =
      selectedEntity === item.entity ||
      selectedEntity === item.id ||
      (item.code && selectedEntity === item.code)

    const isExpanded = expandedIds.has(item.id)

    const routeOrigin = item.origin ?? item.entity.split(/\s*→\s*/)[0]?.trim()
    const routeDest = item.destination ?? item.entity.split(/\s*→\s*/)[1]?.trim()
    const originAirport = item.type === 'Route' ? airports.find((a) => a.code === routeOrigin || a.id === routeOrigin) : undefined
    const destAirport = item.type === 'Route' ? airports.find((a) => a.code === routeDest || a.id === routeDest) : undefined

    const subRoutes = item.type === 'Airport'
      ? (routesByAirport[item.code ?? item.id] ?? routes.filter((r) => r.origin === (item.code ?? item.id) || r.destination === (item.code ?? item.id)))
      : []

    const tooltipBundle = [
      `Phân đoạn: ${item.entity}`,
      `• Tỷ lệ chuyến đến trễ lịch sử: ${formatPercent(item.historicalRate)}`,
      `• Số chuyến đến trễ: ${formatNumber(item.historicalDelayed)} / ${formatNumber(item.historicalEligible)} chuyến`,
      `• Độ trễ đến trung bình: ${formatMinutes(item.historicalAverageDelay)}`,
      `• Cỡ mẫu lịch sử: ${formatNumber(item.historicalN)} chuyến`,
      `• Tỷ lệ trễ dự kiến: ${formatPercent(item.expectedRate)} (n đã chấm điểm = ${formatNumber(item.scoredN)})`,
      `• Chênh lệch so với chuẩn: ${item.historicalGap >= 0 ? '+' : ''}${formatPercent(item.historicalGap)}`,
    ].join('\n')

    return (
      <Fragment key={item.id}>
        <tr
          data-analysis-unit={`priority-${item.id}`}
          className={`${isChild ? 'route-child-row' : ''} selectable${isSelected ? ' selected' : ''}`}
          onClick={() => onSelectEntity(item)}
          onContextMenu={(event) => onRowContextMenu?.(event, item)}
        >
          <td className="route-name" style={isChild ? { paddingLeft: '1.75rem' } : undefined}>
            <div className="table-entity-with-actions">
              <span>
                <span className={isChild ? 'route-name route-name--small' : 'route-name'}>{item.entity}</span>
                <span className="subcell">{childLabel ?? formatEntityType(item.type)}</span>
              </span>
              <span className="table-inline-actions">
                {!isChild && (
                  <button
                    type="button"
                    className="btn btn-ghost btn--xs expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(item.id)
                    }}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Thu gọn phân đoạn ${item.entity}` : `Mở rộng phân đoạn ${item.entity}`}
                    data-tooltip={isExpanded ? `Thu gọn phân đoạn ${item.entity}` : `Xem chi tiết phân đoạn ${item.entity}`}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                )}
                {isChild && (
                  <button
                    type="button"
                    className="btn btn-ghost btn--xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEntity(item)
                    }}
                    aria-label={`Chọn phân đoạn ${item.entity}`}
                  >
                    Chọn
                  </button>
                )}
              </span>
            </div>
          </td>

          <td
            data-tooltip-multiline
            data-tooltip={`Tỷ lệ trễ dự kiến: ${formatPercent(item.expectedRate)}\nSố chuyến đã chấm điểm n = ${formatNumber(item.scoredN)}`}
          >
            <strong>{formatPercent(item.expectedRate)}</strong>
            <span className="subcell">n={formatNumber(item.scoredN)}</span>
          </td>

          <td
            data-tooltip={`Tỷ trọng chuyến bay thuộc nhóm rủi ro cao: ${formatPercent(item.highRiskShare)}`}
          >
            {formatPercent(item.highRiskShare)}
          </td>

          <td data-tooltip-multiline data-tooltip={tooltipBundle}>
            <strong>{formatPercent(item.historicalRate)}</strong>
            <span className="subcell">
              Trễ {formatNumber(item.historicalDelayed)} / {formatNumber(item.historicalEligible)} · TB {formatMinutes(item.historicalAverageDelay)}
            </span>
          </td>

          <td
            data-tooltip={`Chênh lệch so với mức chuẩn mạng bay: ${item.historicalGap >= 0 ? '+' : ''}${formatPercent(item.historicalGap)}`}
          >
            <span className={item.historicalGap > 0 ? 'diff-higher' : 'diff-lower'}>
              {item.historicalGap >= 0 ? '+' : ''}{formatPercent(item.historicalGap)}
            </span>
          </td>

          <td>
            <SampleBadge flag={item.sampleFlag} />
          </td>

          <td>
            <span
              className="pill uncalibrated"
              tabIndex={0}
              data-tooltip="Quy tắc ưu tiên chưa được phê duyệt nên kết quả bị khóa."
            >
              Đã khóa
            </span>
          </td>
        </tr>

        {!isChild && isExpanded && item.type === 'Route' && (
          <>
            {originAirport ? (
              renderMetricsRow(originAirport, true, `Sân bay đi (${routeOrigin})`)
            ) : (
              <tr className="route-child-row">
                <td colSpan={7} style={{ paddingLeft: '2rem', color: 'var(--ink-secondary)' }}>
                  Sân bay đi: {routeOrigin} (Chưa có dữ liệu tổng hợp riêng)
                </td>
              </tr>
            )}
            {destAirport ? (
              renderMetricsRow(destAirport, true, `Sân bay đến (${routeDest})`)
            ) : (
              <tr className="route-child-row">
                <td colSpan={7} style={{ paddingLeft: '2rem', color: 'var(--ink-secondary)' }}>
                  Sân bay đến: {routeDest} (Chưa có dữ liệu tổng hợp riêng)
                </td>
              </tr>
            )}
          </>
        )}

        {!isChild && isExpanded && item.type === 'Airport' && (
          <>
            {subRoutes.length === 0 ? (
              <tr className="route-child-row">
                <td colSpan={7} style={{ paddingLeft: '2rem', fontStyle: 'italic', color: 'var(--ink-secondary)' }}>
                  Không có đường bay kết nối nào trong bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              subRoutes.map((subRoute) => renderMetricsRow(subRoute, true, 'Đường bay kết nối'))
            )}
          </>
        )}
      </Fragment>
    )
  }

  return (
    <Card
      id={id}
      title={title}
      subtitle={subtitle}
      onContextMenu={onCardContextMenu}
      action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {extraAction}
          <div className="segmented-control segmented-control--compact" role="group" aria-label="Chế độ hiển thị phân đoạn">
            <button
              type="button"
              className={currentMode === 'route' ? 'active' : ''}
              onClick={() => handleSetMode('route')}
            >
              Theo tuyến bay
            </button>
            <button
              type="button"
              className={currentMode === 'airport' ? 'active' : ''}
              onClick={() => handleSetMode('airport')}
            >
              Theo sân bay
            </button>
            <button
              type="button"
              className={currentMode === 'all' ? 'active' : ''}
              onClick={() => handleSetMode('all')}
            >
              Tất cả
            </button>
          </div>
        </div>
      }
    >
      <div className="table-toolbar">
        <input
          className="table-search"
          type="search"
          placeholder="Tìm phân đoạn (tuyến bay, sân bay, chỉ số dự báo, bằng chứng...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Tìm kiếm toàn bảng phân đoạn"
        />
        {searchQuery && (
          <button className="btn btn-ghost btn--xs" type="button" onClick={() => setSearchQuery('')}>
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="Không có kết quả"
          detail={
            searchQuery
              ? `Không tìm thấy phân đoạn khớp "${searchQuery}".`
              : 'Không có phân đoạn nào theo bộ lọc hiện tại.'
          }
          action={
            searchQuery ? (
              <button className="btn btn-ghost" type="button" onClick={() => setSearchQuery('')}>
                Xóa tìm kiếm
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-wrap table-scroll">
          <table className="spatial-table">
            <thead>
              <tr>
                <SortHeader colKey="entity" label="Đối tượng" />
                <SortHeader colKey="expectedRate" label="Tỷ lệ dự kiến" />
                <SortHeader colKey="highRiskShare" label="Tỷ trọng rủi ro cao" />
                <SortHeader colKey="historicalRate" label="Bộ ba bằng chứng lịch sử" />
                <SortHeader colKey="historicalGap" label="Chênh lệch lịch sử" />
                <SortHeader colKey="sampleFlag" label="Bằng chứng mẫu" />
                <SortHeader colKey="priority" label="Mức ưu tiên" />
              </tr>
            </thead>
            <tbody>{filteredItems.map((item) => renderMetricsRow(item))}</tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
