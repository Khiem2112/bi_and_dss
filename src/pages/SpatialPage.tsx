import { useEffect, useMemo, useState } from 'react'
import type {
  EvidenceRecord,
  EntityTrendFilters,
  GlobalFilters,
  GranularTrendSeries,
  PageId,
  SpatialState,
  WnAnalysisContext,
} from '../domain/types'
import { bundleFromEvidence, createAnalysisContext, filtersForTrendPeriod } from '../domain/analysisContext'
import { formatRole } from '../domain/formatters'
import { useAirportHotspots, useEntityTrend } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { UnifiedTrendChart, type Granularity } from '../components/charts/UnifiedTrendChart'
import { RouteAirportEvidenceTable } from '../components/tables/RouteAirportEvidenceTable'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { AnalysisActions } from '../components/ui/AnalysisActions'
import { useAnalysisContextMenu } from '../components/ui/useAnalysisContextMenu'

import { useFilterStore } from '../stores/filterStore'
import { useOverlayStore } from '../stores/overlayStore'

interface SpatialPageProps {
  filters?: GlobalFilters
  initialEntity?: string
  onNavigate: (page: PageId) => void
  onOpenComparison?: (context: WnAnalysisContext) => void
  onOpenInvestigation?: (context: WnAnalysisContext) => void
  onOpenEvidence?: (entity: string) => void
  onOpenCause?: (entity: string) => void
  onSelectEntity: (entity: string) => void
  onToast: (message: string) => void
}

export function SpatialPage({ filters: propFilters, onNavigate, onOpenComparison, onOpenInvestigation, onOpenCause, onSelectEntity, onToast }: SpatialPageProps) {
  const globalFilters = useFilterStore((state) => state.filters)
  const filters = propFilters ?? globalFilters
  const storeOpenCause = useOverlayStore((state) => state.openCause)
  const handleOpenCause = onOpenCause ?? storeOpenCause
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

  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

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
    const sourceId = entityType === 'Route' ? 'P2-C04' : 'P2-C03'
    const intent = entityType === 'Route' ? 'rate' : 'airport'
    const context = contextFor(entity, sourceId, intent, role)
    openAnalysisContextMenu(e, context, {
      entitySubtitle: entityType === 'Route' ? 'Đường bay' : 'Sân bay',
      extraItems: [
        {
          label: 'Xem xu hướng chi tiết',
          onClick: () => {
            if (entityType === 'Route') selectRoute(entity)
            else if (code) {
              if (role) setLocalState((current) => ({ ...current, grain: role === 'Origin' ? 'origin' : 'destination' }))
              selectAirport(code)
            }
          },
        },
        {
          label: 'Phân tích quy luật thời gian',
          onClick: () => { onSelectEntity(entity); onNavigate('temporal') },
        },
        {
          label: 'Bối cảnh nguyên nhân ghi nhận',
          onClick: () => handleOpenCause(entity),
        },
      ],
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

  function contextFor(entity: string, sourceComponentId: string, intent: WnAnalysisContext['comparisonIntent'], role?: 'Origin' | 'Destination', periodFilters: Partial<WnAnalysisContext['filters']> = {}): WnAnalysisContext {
    const route = allRoutes.find((item) => item.entity === entity)
    const airportCode = entity.length === 3 ? entity : airportsQuery.data?.airports.find((item) => item.entity === entity)?.code
    const airport = airportsQuery.data?.airports.find((item) => item.code === airportCode)
    const airportGrain = role ? (role === 'Origin' ? 'origin' : 'destination') : localState.grain
    const airportMetrics = airport && (airportGrain === 'origin' ? airport.originMetrics : airport.destMetrics)
    const evidence = route ?? airportMetrics ?? airport
    return createAnalysisContext({
      sourceComponentId,
      sourceUnitId: route?.id ?? airport?.id ?? entity,
      sourceLabelVi: route?.entity ?? airport?.entity ?? entity,
      grain: route ? 'route' : airport ? 'airport' : 'network',
      comparisonIntent: intent,
      globalFilters: filters,
      metrics: bundleFromEvidence({ eligible: evidence?.eligibleCount ?? evidence?.n, delayed: evidence?.delayedCount, rate: evidence?.rate, averageDelay: evidence?.averageDelay }),
      filters: { ...(route ? { route: route.entity } : airport ? { airport: airport.code, airportRole: airportGrain } : {}), ...periodFilters },
    })
  }

  const trendPointContext = (point: GranularTrendSeries, granularity: Granularity) => {
    const entity = selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN'
    const base = contextFor(entity, 'P2-C05', point.isFuture ? 'future_history' : 'trend', undefined, point.isFuture ? {} : filtersForTrendPeriod(point.period, granularity))
    return {
      ...base,
      sourceUnitId: `${base.sourceUnitId}-${point.period}`,
      sourceLabelVi: `${base.sourceLabelVi} · ${point.label}`,
      metricSnapshot: bundleFromEvidence({ eligible: point.eligibleCount ?? point.wnN, delayed: point.delayedCount, rate: point.wn, averageDelay: point.averageDelay }),
    }
  }

  if (airportsQuery.isError) {
    return <ErrorState message={airportsQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => airportsQuery.refetch()} />
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
              <AnalysisActions context={contextFor(selectedAirportCode ?? 'Mạng lưới WN', 'P2-C02', 'airport')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
            </div>
          }
          onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(selectedAirportCode ?? 'Mạng lưới WN', 'P2-C02', 'airport'), { entitySubtitle: 'Bản đồ sân bay' })}
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
              onAirportContextMenu={(e, airport) => openContextMenu(e, airport.entity, 'Airport', airport.code, localState.grain === 'origin' ? 'Origin' : 'Destination')}
            />
          )}
        </Card>

        {airportsQuery.isLoading || !airportsQuery.data ? (
          <LoadingState rows={6} />
        ) : (
          <RouteAirportEvidenceTable
            id={routeOnlyMode ? 'P2-C04' : 'P2-C03'}
            title={routeOnlyMode ? 'Bằng chứng tuyến bay' : 'Bằng chứng sân bay'}
            subtitle={routeOnlyMode ? 'Tất cả tuyến theo bộ lọc · sắp theo chênh lệch' : 'Hiển thị đồng thời điểm đi và đến · đưa con trỏ vào để xem chi tiết đầy đủ'}
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
            onCardContextMenu={(event) => openAnalysisContextMenu(event, contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', routeOnlyMode ? 'P2-C04' : 'P2-C03', routeOnlyMode ? 'rate' : 'airport'), { entitySubtitle: routeOnlyMode ? 'Bảng tuyến bay' : 'Bảng sân bay' })}
            onOpenContextMenu={openContextMenu}
            extraAction={(selectedRoute || selectedAirportCode) ? <AnalysisActions context={contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', routeOnlyMode ? 'P2-C04' : 'P2-C03', routeOnlyMode ? 'rate' : 'airport')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined}
          />
        )}
      </div>

      {entityTrendFilters && (
        <>
          <Card
            id="P2-C05"
            title={trendTitle}
            subtitle="Xu hướng tháng/tuần/ngày · WN so với DL, AA · Dự báo tháng tiếp theo"
            action={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedAirportCode && (
                  <div className="segmented-control segmented-control--compact" aria-label="Vai trò hiển thị xu hướng">
                    <button type="button" className={localState.grain === 'origin' ? 'active' : ''} onClick={() => setLocalState((s) => ({ ...s, grain: 'origin' }))}>Sân bay đi</button>
                    <button type="button" className={localState.grain === 'destination' ? 'active' : ''} onClick={() => setLocalState((s) => ({ ...s, grain: 'destination' }))}>Sân bay đến</button>
                  </div>
                )}
                <AnalysisActions context={contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', 'P2-C05', 'trend')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
              </div>
            }
            onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', 'P2-C05', 'trend'), { entitySubtitle: 'Xu hướng thực thể' })}
          >
            {trendQuery.isLoading || !trendQuery.data ? <LoadingState rows={4} /> : trendQuery.isError ? <EmptyState title="Không thể tải xu hướng" detail={trendQuery.error?.message ?? 'Lỗi dữ liệu'} /> : <UnifiedTrendChart data={trendQuery.data} onToast={onToast} onPointContextMenu={(event, point, granularity) => openAnalysisContextMenu(event, trendPointContext(point, granularity), { entitySubtitle: point.isFuture ? 'Mốc dự báo' : 'Mốc thời gian' })} />}
          </Card>
          <Card id="P2-C06" title="Hành động theo ngữ cảnh" subtitle="Giữ nguyên sân bay hoặc tuyến đang chọn khi chuyển sang đối sánh và điều tra chuyến" action={<AnalysisActions context={contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', 'P2-C06', selectedRoute ? 'rate' : 'airport')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} />} onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN', 'P2-C06', selectedRoute ? 'rate' : 'airport'), { entitySubtitle: 'Ngữ cảnh đã chọn' })}>
            <p className="microcopy">Ngữ cảnh hiện tại: <strong>{selectedRoute ?? selectedAirportCode}</strong>. Hai hành động sử dụng cùng ảnh chụp bộ lọc và bộ chỉ số tại thời điểm mở.</p>
          </Card>
        </>
      )}

      {analysisContextMenu}
    </section>
  )
}
