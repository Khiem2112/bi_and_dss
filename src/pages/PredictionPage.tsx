import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { defaultFilters, type FutureFlight, type GlobalFilters, type PredictionFilters, type RiskAggregate, type WnAnalysisContext } from '../domain/types'
import { bundleFromEvidence, createAnalysisContext } from '../domain/analysisContext'
import { formatDecision, formatRiskLabel, formatTimeBlock } from '../domain/formatters'
import { useFutureFlights, useRiskAggregates } from '../hooks/dashboardHooks'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { SearchableSortableTable, type DashboardTableColumn } from '../components/tables/SearchableSortableTable'
import { SegmentPriorityTable } from '../components/tables/SegmentPriorityTable'
import { ComponentHelpButton } from '../components/ui/ComponentHelpButton'
import { AnalysisActions } from '../components/ui/AnalysisActions'
import { useAnalysisContextMenu } from '../components/ui/useAnalysisContextMenu'

const formatScheduledLocal = (value: string) => {
  const [date, timeWithZone] = value.split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} · ${timeWithZone.slice(0, 5)} (giờ địa phương)`
}

const formatNumber = (value: number) => value.toLocaleString('vi-VN')
const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

const futureFlightColumns: readonly DashboardTableColumn<FutureFlight>[] = [
  {
    id: 'flight', header: 'Chuyến bay',
    cell: (flight) => <span className="route-name">{flight.flightNumber}<span className="subcell">{flight.modelVersion}</span></span>,
    searchValue: (flight) => [flight.flightNumber, flight.modelVersion], sortValue: (flight) => flight.flightNumber,
  },
  {
    id: 'schedule', header: 'Giờ kế hoạch', cell: (flight) => formatScheduledLocal(flight.departureAt),
    searchValue: (flight) => [formatScheduledLocal(flight.departureAt), flight.departureAt], sortValue: (flight) => new Date(flight.departureAt),
  },
  {
    id: 'route', header: 'Đường bay', cell: (flight) => flight.route,
    searchValue: (flight) => [flight.route], sortValue: (flight) => flight.route,
  },
  {
    id: 'probability', header: 'Xác suất minh họa',
    cell: (flight) => <strong>{(flight.probability * 100).toFixed(0)}%</strong>,
    searchValue: (flight) => [flight.probability, `${(flight.probability * 100).toFixed(0)}%`, 'Minh họa'], sortValue: (flight) => flight.probability,
  },
  {
    id: 'risk', header: 'Mức rủi ro',
    cell: (flight) => <span className={`risk-chip ${flight.riskLabel.toLowerCase()}`} tabIndex={0} data-tooltip="Phân loại rủi ro minh họa của mô hình; không phải quyết định vận hành.">{formatRiskLabel(flight.riskLabel)}</span>,
    searchValue: (flight) => [formatRiskLabel(flight.riskLabel)], sortValue: (flight) => ({ High: 3, Elevated: 2, Monitor: 1 })[flight.riskLabel],
  },
  {
    id: 'historical', header: 'Bằng chứng lịch sử cùng đường bay',
    cell: (flight) => flight.historicalRate === null
      ? <span>—<span className="subcell">{flight.historicalUnavailableReason}</span></span>
      : <span><strong>{formatPercent(flight.historicalRate)}</strong><span className="subcell">Trễ {formatNumber(flight.historicalDelayed)} / {formatNumber(flight.historicalEligible)} · TB {formatMinutes(flight.historicalAverageDelay)}</span></span>,
    searchValue: (flight) => [formatPercent(flight.historicalRate), flight.historicalDelayed, flight.historicalEligible, formatMinutes(flight.historicalAverageDelay), flight.historicalUnavailableReason ?? ''],
    sortValue: (flight) => flight.historicalRate,
  },
]

import { useFilterStore } from '../stores/filterStore'
import { useOverlayStore } from '../stores/overlayStore'

interface PredictionPageProps {
  selectedEntity: string
  globalFilters?: GlobalFilters
  onOpenComparison?: (context: WnAnalysisContext) => void
  onOpenInvestigation?: (context: WnAnalysisContext) => void
  onOpenEvidence?: (entity: string) => void
  onOpenExplanation?: (id: string) => void
  onSelectEntity: (entity: string) => void
  onOpenMethodology?: () => void
  onToast: (message: string) => void
}

export function PredictionPage({ selectedEntity, globalFilters: propGlobalFilters, onOpenComparison, onOpenInvestigation, onOpenExplanation, onSelectEntity, onOpenMethodology, onToast }: PredictionPageProps) {
  const storeFilters = useFilterStore((state) => state.filters)
  const globalFilters = propGlobalFilters ?? storeFilters
  const storeOpenExplanation = useOverlayStore((state) => state.openExplanation)
  const storeOpenInvestigation = useOverlayStore((state) => state.openInvestigation)
  const handleOpenExplanation = onOpenExplanation ?? storeOpenExplanation
  const handleOpenInvestigation = onOpenInvestigation ?? storeOpenInvestigation
  const [filters, setFilters] = useState<PredictionFilters>({ window: '2019-01-01 → 2019-01-07' })
  const [selectedFlight, setSelectedFlight] = useState('WN1842-20190102')
  const [selectedAggregate, setSelectedAggregate] = useState(selectedEntity.includes('→') ? selectedEntity : 'DAL → ATL')
  const [decision, setDecision] = useState<string>()
  const flightsQuery = useFutureFlights(filters, globalFilters)
  const risksQuery = useRiskAggregates(filters, globalFilters)
  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

  const selectedFlightRecord = useMemo(() => flightsQuery.data?.flights.find((flight) => flight.id === selectedFlight), [flightsQuery.data, selectedFlight])
  const selectedRisk = useMemo(() => {
    if (!risksQuery.data?.aggregates) return undefined
    return (
      risksQuery.data.aggregates.find(
        (item) => item.entity === selectedAggregate || item.id === selectedAggregate || (item.code && item.code === selectedAggregate)
      ) ?? risksQuery.data.aggregates[0]
    )
  }, [risksQuery.data, selectedAggregate])
  const selectedAirportRisk = useMemo(() => {
    const airports = risksQuery.data?.airports ?? risksQuery.data?.aggregates.filter((item) => item.type === 'Airport') ?? []
    return airports.find((item) => item.entity === selectedAggregate || item.code === selectedAggregate) ?? airports[0]
  }, [risksQuery.data, selectedAggregate])

  useEffect(() => {
    if (!flightsQuery.data?.flights.length || selectedFlightRecord) return
    const first = flightsQuery.data.flights[0]
    setSelectedFlight(first.id)
    setSelectedAggregate(first.route)
  }, [flightsQuery.data, selectedFlightRecord])

  const contextForFlight = (flight: FutureFlight): WnAnalysisContext => createAnalysisContext({
    sourceComponentId: 'P4-C02', sourceUnitId: flight.id, sourceLabelVi: `${flight.flightNumber} · ${flight.route}`,
    grain: 'future_flight', comparisonIntent: 'future_history', globalFilters: globalFilters ?? defaultFilters,
    metrics: bundleFromEvidence({ eligible: flight.historicalEligible, delayed: flight.historicalDelayed, rate: flight.historicalRate, averageDelay: flight.historicalAverageDelay, unavailableReason: flight.historicalUnavailableReason }),
    filters: { route: flight.route },
  })
  const contextForRisk = (risk: RiskAggregate, sourceComponentId = 'P4-C05'): WnAnalysisContext => createAnalysisContext({
    sourceComponentId, sourceUnitId: risk.id, sourceLabelVi: risk.entity,
    grain: risk.type === 'Route' ? 'route' : risk.type === 'Airport' ? 'airport' : 'time_period',
    comparisonIntent: 'future_history', globalFilters: globalFilters ?? defaultFilters,
    metrics: bundleFromEvidence({ eligible: risk.historicalEligible, delayed: risk.historicalDelayed, rate: risk.historicalRate, averageDelay: risk.historicalAverageDelay }),
    filters: risk.type === 'Route' ? { route: risk.entity } : risk.type === 'Airport' ? { airport: risk.code ?? risk.entity, airportRole: 'either' } : undefined,
  })
  const contextForTime = (item: NonNullable<typeof risksQuery.data>['byTime'][number]): WnAnalysisContext => createAnalysisContext({
    sourceComponentId: 'P4-C04', sourceUnitId: item.label, sourceLabelVi: formatTimeBlock(item.label),
    grain: 'time_period', comparisonIntent: 'future_history', globalFilters: globalFilters ?? defaultFilters,
    metrics: bundleFromEvidence({ eligible: item.historicalEligible, delayed: item.historicalDelayed, rate: item.historicalRate, averageDelay: item.historicalAverageDelay, unavailableReason: item.unavailableReason }),
    filters: { scheduledTimeBlocks: [item.label] },
  })

  if (flightsQuery.isError || risksQuery.isError) {
    return <ErrorState message={flightsQuery.error?.message ?? risksQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => { flightsQuery.refetch(); risksQuery.refetch() }} />
  }

  return (
    <section className="view active" aria-labelledby="prediction-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P4 · Đánh giá DSS</div>
          <h1 id="prediction-title">Dự báo & ưu tiên rà soát</h1>
          <p className="page-subtitle">Xác suất là tín hiệu rủi ro minh họa, không phải khẳng định chắc chắn và không tự động đưa ra quyết định lịch bay.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <Card id="P4-C01" title="Bối cảnh dự báo" subtitle="Mô hình, thời điểm chốt, tầm dự báo, phạm vi đặc trưng và trạng thái hiệu chỉnh" action={<button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Phương pháp mô hình</button>}>
        <div className="model-context-grid">
          <div><span>Phiên bản mô hình</span><strong>DEMO-RISK-v0</strong><small>Không dùng cho quyết định thật</small></div>
          <div><span>Khung thời gian dự báo</span><select value={filters.window} onChange={(event) => setFilters({ ...filters, window: event.target.value })}><option>2019-01-01 → 2019-01-07</option><option>2019-01-08 → 2019-01-14</option></select></div>
          <div><span>Thời điểm chốt tính điểm</span><strong>2018-12-31 23:59 CST</strong><small>Chỉ dùng dữ liệu trước chuyến bay</small></div>
          <div><span>Kiểm định / Hiệu chỉnh</span><strong className="text-amber">Chưa hiệu chỉnh</strong><small>Quy tắc ưu tiên bị khóa</small></div>
        </div>
        <div className="notice compact-notice"><strong>Chỉ dành cho demo:</strong> xác suất và dữ liệu tổng hợp dưới đây dùng để kiểm thử bố cục/tương tác; không phải bằng chứng triển khai cho M-07, M-08 hoặc M-09.</div>
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P4-C02" title="Danh sách chuyến bay tương lai" subtitle="Chuyến bay tương lai của WN · Xác suất minh họa" action={selectedFlightRecord ? <AnalysisActions context={contextForFlight(selectedFlightRecord)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive /> : undefined} onContextMenu={selectedFlightRecord ? (event) => openAnalysisContextMenu(event, contextForFlight(selectedFlightRecord), { entitySubtitle: 'Chuyến bay tương lai · bằng chứng lịch sử' }) : undefined}>
          {flightsQuery.isLoading || !flightsQuery.data ? <LoadingState rows={6} /> : flightsQuery.data.flights.length === 0 ? <EmptyState title="Không có chuyến bay đã chấm điểm" detail="Hãy xóa bộ lọc đường bay hoặc đổi khung thời gian dự báo." /> : (
            <SearchableSortableTable
              tableLabel="danh sách chuyến bay tương lai"
              rows={flightsQuery.data.flights}
              columns={futureFlightColumns}
              rowId={(flight) => flight.id}
              selectedRowId={selectedFlight}
              initialSortBy="probability"
              initialSortDirection="desc"
              onSelectRow={(flight) => { setSelectedFlight(flight.id); setSelectedAggregate(flight.route); onSelectEntity(flight.route) }}
              onRowContextMenu={(event, flight) => openAnalysisContextMenu(event, contextForFlight(flight), { entitySubtitle: 'Chuyến bay tương lai · bằng chứng lịch sử' })}
              searchPlaceholder="Tìm chuyến bay, giờ, đường bay, rủi ro hoặc bằng chứng lịch sử"
            />
          )}
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && handleOpenExplanation(selectedFlightRecord.id)}>Giải thích dự báo</button>
            <button className="btn btn-secondary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && handleOpenInvestigation(contextForFlight(selectedFlightRecord))}>Điều tra lịch sử hỗ trợ</button>
          </div>
        </Card>

        <Card id="P4-C04" title="Rủi ro theo khung giờ kế hoạch" subtitle="Xác suất trung bình · không phải tỷ lệ đến trễ thực tế" action={risksQuery.data?.byTime[0] ? <AnalysisActions context={contextForTime(risksQuery.data.byTime.find((item) => item.label === filters.timeBlock) ?? risksQuery.data.byTime[0])} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive /> : undefined} onContextMenu={risksQuery.data?.byTime[0] ? (event) => openAnalysisContextMenu(event, contextForTime(risksQuery.data!.byTime.find((item) => item.label === filters.timeBlock) ?? risksQuery.data!.byTime[0]), { entitySubtitle: 'Khung giờ kế hoạch' }) : undefined}>
          {risksQuery.isLoading || !risksQuery.data ? <LoadingState /> : (
            <div className="bar-list large-bars">
              {risksQuery.data.byTime.map((item) => (
                <button
                  className="bar-row button-bar"
                  type="button"
                  key={item.label}
                  data-analysis-unit={`time-${item.label}`}
                  data-tooltip-multiline
                  data-tooltip={item.historicalRate === null
                    ? `${formatTimeBlock(item.label)}\n${item.unavailableReason}`
                    : `${formatTimeBlock(item.label)}\n• Tỷ lệ chuyến đến trễ lịch sử: ${formatPercent(item.historicalRate)}\n• Số chuyến đến trễ: ${formatNumber(item.historicalDelayed)} / ${formatNumber(item.historicalEligible)}\n• Độ trễ đến trung bình: ${formatMinutes(item.historicalAverageDelay)}`}
                  onClick={() => { setFilters({ ...filters, timeBlock: item.label }); onToast(`Bộ lọc thời gian dự báo: ${formatTimeBlock(item.label)}.`) }}
                  onContextMenu={(event) => openAnalysisContextMenu(event, contextForTime(item), { entitySubtitle: 'Khung giờ kế hoạch' })}
                >
                  <span>{formatTimeBlock(item.label)}</span><span className="bar-track"><span className="bar-fill blue-fill" style={{ width: `${item.expectedRate * 2.2}%` }} /></span><strong>{item.expectedRate.toFixed(1)}%</strong><small>n={item.n}</small>
                </button>
              ))}
            </div>
          )}
          <div className="notice compact-notice"><strong>Lưu ý về ngưỡng:</strong> Tỷ trọng chuyến có rủi ro cao và tỷ lệ trễ dự kiến là hai đầu ra khác nhau.</div>
        </Card>
      </div>

      {!risksQuery.isLoading && risksQuery.data && (
        <div className="grid cols-2 page-section-gap">
          <Card id="P4-C03" title="Rủi ro theo địa lý" subtitle="Tín hiệu dự báo theo sân bay; bộ ba chỉ số lịch sử luôn được tách riêng" action={selectedAirportRisk ? <AnalysisActions context={contextForRisk(selectedAirportRisk, 'P4-C03')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive /> : undefined} onContextMenu={selectedAirportRisk ? (event) => openAnalysisContextMenu(event, contextForRisk(selectedAirportRisk, 'P4-C03'), { entitySubtitle: 'Rủi ro theo sân bay' }) : undefined}>
            <div className="geographic-risk-list">
              {(risksQuery.data.airports ?? risksQuery.data.aggregates.filter((item) => item.type === 'Airport')).slice(0, 6).map((item) => (
                <button key={item.id} data-analysis-unit={`airport-risk-${item.id}`} className={selectedAirportRisk?.id === item.id ? 'selected' : ''} type="button" onClick={() => { setSelectedAggregate(item.entity); onSelectEntity(item.code ?? item.entity) }} onContextMenu={(event) => openAnalysisContextMenu(event, contextForRisk(item, 'P4-C03'), { entitySubtitle: 'Rủi ro theo sân bay' })} data-tooltip={`${item.entity}\n• Tỷ lệ dự kiến minh họa: ${formatPercent(item.expectedRate)}\n• Tỷ lệ chuyến đến trễ lịch sử: ${formatPercent(item.historicalRate)}\n• Số chuyến đến trễ: ${formatNumber(item.historicalDelayed)} / ${formatNumber(item.historicalEligible)}\n• Độ trễ đến trung bình: ${formatMinutes(item.historicalAverageDelay)}`}>
                  <span>{item.entity}</span><span className="bar-track"><i style={{ width: `${Math.min(100, item.expectedRate * 2.5)}%` }} /></span><strong>{formatPercent(item.expectedRate)}</strong>
                </button>
              ))}
            </div>
          </Card>

          <Card id="P4-C06" title="Rủi ro × Bằng chứng" subtitle="Trục ngang: tỷ lệ dự kiến minh họa · Trục dọc: chênh lệch lịch sử" action={selectedRisk ? <AnalysisActions context={contextForRisk(selectedRisk, 'P4-C06')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive /> : undefined} onContextMenu={selectedRisk ? (event) => openAnalysisContextMenu(event, contextForRisk(selectedRisk, 'P4-C06'), { entitySubtitle: 'Điểm rủi ro × bằng chứng' }) : undefined}>
            <div className="risk-evidence-plot" role="group" aria-label="Biểu đồ rủi ro và bằng chứng lịch sử">
              {risksQuery.data.aggregates.slice(0, 14).map((item) => {
                const x = Math.min(94, Math.max(6, item.expectedRate * 2.5))
                const y = Math.min(88, Math.max(8, 45 + item.historicalGap * 4))
                return <button key={item.id} data-analysis-unit={`risk-evidence-${item.id}`} className={selectedRisk?.id === item.id ? 'selected' : ''} type="button" style={{ '--plot-x': `${x}%`, '--plot-y': `${y}%` } as CSSProperties} aria-label={`${item.entity}: rủi ro dự kiến ${formatPercent(item.expectedRate)}, chênh lệch lịch sử ${item.historicalGap >= 0 ? '+' : ''}${formatPercent(item.historicalGap)}`} data-tooltip={`${item.entity}\n• Tỷ lệ dự kiến minh họa: ${formatPercent(item.expectedRate)}\n• Tỷ lệ trễ lịch sử: ${formatPercent(item.historicalRate)}\n• Số chuyến đến trễ: ${formatNumber(item.historicalDelayed)} / ${formatNumber(item.historicalEligible)}\n• Độ trễ đến trung bình: ${formatMinutes(item.historicalAverageDelay)}`} onClick={() => { setSelectedAggregate(item.entity); onSelectEntity(item.code ?? item.entity) }} onContextMenu={(event) => openAnalysisContextMenu(event, contextForRisk(item, 'P4-C06'), { entitySubtitle: 'Điểm rủi ro × bằng chứng' })}>{item.type === 'Route' ? 'T' : item.type === 'Airport' ? 'S' : 'G'}</button>
              })}
              <span className="plot-axis x">Tỷ lệ dự kiến →</span><span className="plot-axis y">Chênh lệch lịch sử ↑</span>
            </div>
          </Card>
        </div>
      )}

      {risksQuery.isLoading || !risksQuery.data ? (
        <Card id="P4-C05" title="Bảng ưu tiên phân đoạn" subtitle="Rủi ro + bằng chứng lịch sử + giải trình · Chỉ số ưu tiên vẫn ở trạng thái Chưa hiệu chỉnh">
          <LoadingState rows={6} />
        </Card>
      ) : (
        <SegmentPriorityTable
          routes={risksQuery.data.routes ?? risksQuery.data.aggregates.filter((item) => item.type === 'Route')}
          airports={risksQuery.data.airports ?? risksQuery.data.aggregates.filter((item) => item.type === 'Airport')}
          routesByAirport={risksQuery.data.routesByAirport ?? {}}
          allAggregates={risksQuery.data.aggregates}
          selectedEntity={selectedAggregate}
          defaultMode={selectedAggregate.includes('→') ? 'route' : 'airport'}
          onSelectEntity={(risk) => {
            setSelectedAggregate(risk.entity)
            onSelectEntity(risk.code ?? risk.entity)
            onToast(`Đã chọn phân đoạn: ${risk.entity}.`)
          }}
          onCardContextMenu={selectedRisk ? (event) => openAnalysisContextMenu(event, contextForRisk(selectedRisk), { entitySubtitle: 'Phân đoạn ưu tiên' }) : undefined}
          onRowContextMenu={(event, risk) => openAnalysisContextMenu(event, contextForRisk(risk), { entitySubtitle: 'Phân đoạn ưu tiên' })}
          extraAction={
            <div className="inline-actions">
              {selectedRisk && <AnalysisActions context={contextForRisk(selectedRisk)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive />}
              <button className="btn btn-secondary" type="button" disabled={!selectedRisk} onClick={() => selectedRisk && handleOpenExplanation(selectedRisk.id)}>Giải thích phân đoạn</button>
            </div>
          }
        />
      )}

      <div className="decision-box page-section-gap" data-component-id="P4-C07" onContextMenu={selectedRisk ? (event) => openAnalysisContextMenu(event, contextForRisk(selectedRisk, 'P4-C07'), { entitySubtitle: 'Đánh giá của con người' }) : undefined}>
        <div>
          <span className="component-id inverted">P4-C07</span>
          <div className="card-title-group"><h2>Đánh giá bởi con người là bước kết thúc bắt buộc</h2><ComponentHelpButton componentId="P4-C07" title="Đánh giá bởi con người" /></div>
          <p>{selectedRisk?.rationale ?? 'Chọn một phân đoạn để xem giải trình cơ sở.'}</p>
        </div>
        <div className="decision-actions">
          {['Review first', 'Monitor', 'Insufficient evidence'].map((value) => (
            <button
              className={`btn decision-button${decision === value ? ' active' : ''}`}
              type="button"
              key={value}
              onClick={() => {
                setDecision(value)
                onToast(`Đã lưu ghi chú minh họa: ${formatDecision(value)}. Không có lệnh vận hành nào được phát đi.`)
              }}
            >
              {formatDecision(value)}
            </button>
          ))}
        </div>
      </div>
      {analysisContextMenu}
    </section>
  )
}
