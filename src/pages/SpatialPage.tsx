import { useEffect, useMemo, useState } from 'react'
import type {
  ComparisonContext,
  EvidenceRecord,
  EntityTrendFilters,
  GlobalFilters,
  PageId,
  SpatialState,
} from '../domain/types'
import { formatRole } from '../domain/formatters'
import { useAirportHotspots, useEntityTrend } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import { RouteAirportEvidenceTable } from '../components/tables/RouteAirportEvidenceTable'
import { CustomContextMenu, type ContextMenuItem } from '../components/ui/CustomContextMenu'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entity: string
  entityType: 'Airport' | 'Route'
  code?: string
  role?: 'Origin' | 'Destination'
}

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

export function SpatialPage({ filters, onNavigate, onOpenComparison, onOpenEvidence, onOpenCause, onSelectEntity, onToast }: SpatialPageProps) {
  const [localState, setLocalState] = useState<SpatialState>({ grain: 'destination', metric: 'gap' })
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | undefined>()
  const [selectedAirportCodes, setSelectedAirportCodes] = useState<string[]>([])
  const [routeOnlyMode, setRouteOnlyMode] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | undefined>()

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
        if (!seen.has(r.entity)) {
          seen.add(r.entity)
          results.push(r)
        }
      }
    }
    return results.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
  }, [airportsQuery.data])

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (routeOnlyMode && selectedRoute) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`tr[data-route-entity="${selectedRoute}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [routeOnlyMode, selectedRoute])

  function openContextMenu(
    e: React.MouseEvent,
    entity: string,
    entityType: 'Airport' | 'Route',
    code?: string,
    role?: 'Origin' | 'Destination',
  ) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      entity,
      entityType,
      code,
      role,
    })
  }

  function selectAirport(code: string) {
    setSelectedAirportCode(code)
    setSelectedRoute(undefined)
    setSelectedAirportCodes([code])
    const ap = airportsQuery.data?.airports.find((a) => a.code === code)
    if (ap) onSelectEntity(ap.entity)
    onToast(`${code} đã được chọn. Xu hướng bên dưới đã cập nhật.`)
  }

  function selectRoute(route: string) {
    setSelectedRoute(route)
    setSelectedAirportCode(undefined)
    const parts = route.split(/\s*→\s*/)
    if (parts.length === 2) {
      setSelectedAirportCodes([parts[0].trim(), parts[1].trim()])
    }
    onSelectEntity(route)
    onToast(`Tuyến ${route} đã được chọn. Xu hướng bên dưới đã cập nhật.`)
  }

  function handleMapSelectPair(pair: string[]) {
    setSelectedAirportCodes(pair)
    if (pair.length === 0) {
      setSelectedAirportCode(undefined)
      setSelectedRoute(undefined)
      onToast('Đã xóa tuyến đo.')
      return
    }

    if (pair.length === 1) {
      const code = pair[0]
      setSelectedAirportCode(code)
      setSelectedRoute(undefined)
      const ap = airportsQuery.data?.airports.find((a) => a.code === code)
      if (ap) onSelectEntity(ap.entity)
      onToast(`Đã chọn sân bay thứ nhất: ${code}. Nhấp thêm một sân bay nữa để xem thống kê tuyến.`)
      return
    }

    if (pair.length === 2) {
      const [originCode, destCode] = pair
      const direct = `${originCode} → ${destCode}`
      const reverse = `${destCode} → ${originCode}`
      const matched = allRoutes.find((r) => r.entity === direct || r.entity === reverse)
      const routeEntity = matched ? matched.entity : direct

      setSelectedRoute(routeEntity)
      setSelectedAirportCode(undefined)
      setRouteOnlyMode(true)
      onSelectEntity(routeEntity)
      onToast(`Đã chọn cặp tuyến ${pair[0]} ↔ ${pair[1]}. Bằng chứng đã tự động chuyển sang tab Theo tuyến bay.`)
    }
  }

  function handleClearPair() {
    setSelectedAirportCodes([])
    setSelectedAirportCode(undefined)
    setSelectedRoute(undefined)
    onToast('Đã xóa tuyến đo.')
  }

  function resetLocal() {
    setSelectedAirportCode(undefined)
    setSelectedRoute(undefined)
    setSelectedAirportCodes([])
  }

  const trendTitle = selectedRoute
    ? `Xu hướng trễ — Tuyến ${selectedRoute}`
    : selectedAirportCode
      ? `Xu hướng trễ — ${selectedAirportCode} vai trò ${formatRole(localState.grain === 'origin' ? 'Origin' : 'Destination')}`
      : 'Xu hướng trễ'

  const mapRoutes = useMemo(() => (airportsQuery.data ? Object.values(airportsQuery.data.routesByAirport).flat() : []), [airportsQuery.data])

  if (airportsQuery.isError) {
    return <ErrorState message={airportsQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => airportsQuery.refetch()} />
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: 'Xem xu hướng chi tiết',
          onClick: () => {
            if (contextMenu.entityType === 'Route') {
              selectRoute(contextMenu.entity)
            } else if (contextMenu.code) {
              if (contextMenu.role) {
                setLocalState((s) => ({ ...s, grain: contextMenu.role === 'Origin' ? 'origin' : 'destination' }))
              }
              selectAirport(contextMenu.code)
            }
          },
        },
        {
          label: 'Phân tích quy luật thời gian',
          onClick: () => {
            onSelectEntity(contextMenu.entity)
            onNavigate('temporal')
          },
        },
        {
          label: 'Mở dự báo & ưu tiên',
          onClick: () => {
            onSelectEntity(contextMenu.entity)
            onNavigate('prediction')
          },
        },
        {
          label: 'div1',
          isDivider: true,
          onClick: () => {},
        },
        {
          label: 'Xem bằng chứng phân đoạn',
          onClick: () => onOpenEvidence(contextMenu.entity),
        },
        {
          label: 'Bối cảnh nguyên nhân ghi nhận',
          onClick: () => onOpenCause(contextMenu.entity),
        },
        ...(contextMenu.entityType === 'Route'
          ? [
              {
                label: 'So sánh hãng bay trên tuyến',
                onClick: () => onOpenComparison({ entity: contextMenu.entity, variant: 'CM-R' }),
              },
            ]
          : []),
      ]
    : []

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
          {(selectedAirportCode || selectedRoute || selectedAirportCodes.length > 0) && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={resetLocal} title="Bỏ chọn sân bay hoặc tuyến bay đang chọn">
              Bỏ chọn cục bộ
            </button>
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
          {airportsQuery.isLoading || !airportsQuery.data ? (
            <LoadingState rows={6} />
          ) : (
            <AirportMap
              airports={airportsQuery.data.airports}
              routes={mapRoutes}
              networkBaselineRate={airportsQuery.data.networkBaselineRate}
              selectedId={selectedAirport?.id}
              selectedCodes={selectedAirportCodes}
              enableMeasurement
              onSelectPair={handleMapSelectPair}
              onClearPair={handleClearPair}
              onAirportContextMenu={(e, airport) => openContextMenu(e, airport.entity, 'Airport', airport.code)}
            />
          )}
        </Card>

        {airportsQuery.isLoading || !airportsQuery.data ? (
          <LoadingState rows={6} />
        ) : (
          <RouteAirportEvidenceTable
            id="P2-C03"
            title={routeOnlyMode ? 'Bằng chứng tuyến bay' : 'Bằng chứng sân bay'}
            subtitle={routeOnlyMode ? 'Tất cả tuyến theo filter · sắp theo chênh lệch' : 'Hiển thị đồng thời điểm đi và đến · hover để xem chi tiết đầy đủ'}
            routes={allRoutes}
            airports={airportsQuery.data.airports}
            routesByAirport={airportsQuery.data.routesByAirport}
            selectedRoute={selectedRoute}
            selectedAirportCode={selectedAirportCode}
            selectedAirportCodes={selectedAirportCodes}
            defaultMode="airport"
            mode={routeOnlyMode ? 'route' : 'airport'}
            onModeChange={(m) => {
              setRouteOnlyMode(m === 'route')
              setSelectedRoute(undefined)
              setSelectedAirportCode(undefined)
              setSelectedAirportCodes([])
            }}
            onSelectRoute={selectRoute}
            onSelectAirport={selectAirport}
            onOpenContextMenu={openContextMenu}
          />
        )}
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
          {trendQuery.isLoading || !trendQuery.data ? (
            <LoadingState rows={4} />
          ) : trendQuery.isError ? (
            <EmptyState title="Không thể tải xu hướng" detail={trendQuery.error?.message ?? 'Lỗi dữ liệu'} />
          ) : (
            <UnifiedTrendChart data={trendQuery.data} onToast={onToast} />
          )}
        </Card>
      )}

      {contextMenu?.visible && (
        <CustomContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          entityTitle={contextMenu.code ?? contextMenu.entity}
          entitySubtitle={contextMenu.entityType === 'Route' ? 'Tuyến bay' : 'Sân bay'}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  )
}
