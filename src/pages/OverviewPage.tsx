import { useEffect, useMemo, useState } from 'react'
import type { AirportHotspot, DelaySeverityBand, GlobalFilters, GranularTrendSeries, PageId, SeasonSummary, TimeBlockDelaySummary, WnAnalysisContext, YearMonthDelayPoint } from '../domain/types'
import { bundleFromEvidence, createAnalysisContext, filtersForTrendPeriod } from '../domain/analysisContext'
import { formatMonth, formatSeason } from '../domain/formatters'
import { useAirportHotspots, useOverview } from '../hooks/dashboardHooks'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import type { Granularity } from '../components/charts/UnifiedTrendChart'
import { DelaySeverityDistribution } from '../components/charts/DelaySeverityDistribution'
import { TimeBlockDelayChart } from '../components/charts/TimeBlockDelayChart'
import { SeasonalBarChart } from '../components/charts/SeasonalBarChart'
import { AirportMap } from '../components/charts/AirportMap'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { Tooltip } from '../components/atoms/Tooltip/Tooltip'
import { ComponentHelpButton } from '../components/ui/ComponentHelpButton'
import { AnalysisActions } from '../components/ui/AnalysisActions'
import { useAnalysisContextMenu } from '../components/ui/useAnalysisContextMenu'
import { useFilterStore } from '../stores/filterStore'

interface OverviewPageProps {
  filters?: GlobalFilters
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
  onOpenComparison?: (context: WnAnalysisContext) => void
  onOpenInvestigation?: (context: WnAnalysisContext) => void
  onOpenEvidence?: (entity: string) => void
  onOpenMethodology?: () => void
  onToast: (message: string) => void
}

const KPI_BUSINESS_DEFINITIONS: Record<string, string> = {
  'P1-C02': 'Tổng số chuyến bay thương mại theo kế hoạch đã hoàn thành hành trình, không hủy, không chuyển hướng và có dữ liệu giờ đến.',
  'P1-C03': 'Tổng số chuyến bay có thời gian đến thực tế trễ từ 15 phút trở lên so với lịch bay công bố.',
  'P1-C04': 'Tỷ lệ số chuyến bay đến trễ trên tổng số chuyến bay đủ điều kiện trong phạm vi phân tích.',
  'P1-C05': 'Độ trễ đến trung bình trên toàn bộ chuyến bay đủ điều kiện, gồm cả chuyến đến sớm.',
}

const OVERVIEW_KPI_TITLES = [
  ['P1-C02', 'Chuyến bay đủ điều kiện'],
  ['P1-C03', 'Chuyến bay đến trễ'],
  ['P1-C04', 'Tỷ lệ đến trễ thực tế'],
  ['P1-C05', 'Độ trễ đến trung bình'],
] as const

interface OverviewQueryStateProps {
  kind: 'loading' | 'error'
  message?: string
  onRetry?: () => void
}

function OverviewQueryState({ kind, message, onRetry }: OverviewQueryStateProps) {
  const stateContent = (rows: number) => kind === 'loading'
    ? <LoadingState rows={rows} />
    : <ErrorState message={message ?? 'Lỗi không xác định'} onRetry={onRetry ?? (() => undefined)} />

  return (
    <section className={`view active overview-page overview-page--${kind}`} aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P1 · Tổng quan mạng lưới</div>
          <h1 id="overview-title">Từ sức khỏe mạng lưới đến nhánh cần điều tra</h1>
          <p className="page-subtitle">Đánh giá mức phổ biến, mức độ và biến động của trễ trước khi chuyển sang phân tích không gian, thời gian hoặc dự báo.</p>
        </div>
      </div>

      <div className="grid cols-4">
        {OVERVIEW_KPI_TITLES.map(([id, title]) => (
          <div className={`card kpi-card kpi-card-clean${id === 'P1-C04' ? ' kpi-card--primary' : ''}`} data-component-id={id} key={id}>
            <div className="kpi-label card-title-group"><span>{title}</span><ComponentHelpButton componentId={id} title={title} /></div>
            {kind === 'loading' ? <LoadingState rows={1} /> : <div className="overview-kpi-error" role="alert"><span aria-hidden="true">!</span><span>Không thể tải</span></div>}
          </div>
        ))}
      </div>

      <div className="overview-main-grid">
        <Card id="P1-C06" title="Xu hướng trễ chuyến mạng lưới và dự báo" className="overview-state-card overview-state-card--main">
          {stateContent(5)}
        </Card>
      </div>

      <div className="overview-map-severity-grid">
        <Card id="P1-C08" title="Bản đồ điểm nóng sân bay" className="overview-map-card overview-state-card overview-state-card--main">
          {stateContent(5)}
        </Card>
        <div className="overview-map-side-rail">
          <Card id="P1-C11" title="Phân phối mức độ trễ đến" className="overview-state-card overview-state-card--secondary">
            {stateContent(3)}
          </Card>
          <Card id="P1-C14" title="Tỷ lệ trễ theo khung giờ" className="overview-time-block-card overview-state-card overview-state-card--secondary">
            {stateContent(3)}
          </Card>
        </div>
      </div>

      <div className="overview-secondary-grid overview-secondary-grid--seasonal">
        <Card id="P1-C15" title="Tỷ lệ trễ theo mùa và tháng" className="overview-state-card overview-state-card--secondary">
          {stateContent(3)}
        </Card>
      </div>
    </section>
  )
}

export function OverviewPage({
  filters: propFilters,
  onNavigate,
  onSelectEntity,
  onOpenComparison,
  onOpenInvestigation,
  onOpenMethodology,
  onToast,
}: OverviewPageProps) {
  const globalFilters = useFilterStore((state) => state.filters)
  const filters = propFilters ?? globalFilters
  const query = useOverview(filters)
  const airportsQuery = useAirportHotspots(filters, { grain: 'destination', metric: 'gap' })
  const [selectedAirportCodes, setSelectedAirportCodes] = useState<string[]>([])
  const [activeGranularity, setActiveGranularity] = useState<Granularity>('month')
  const [selectedSeverityId, setSelectedSeverityId] = useState<string>()
  const [selectedYearMonthPeriod, setSelectedYearMonthPeriod] = useState<string>()
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<string>()
  const [selectedSeason, setSelectedSeason] = useState<string>()
  const [selectedMonth, setSelectedMonth] = useState<string>()
  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

  useEffect(() => {
    setSelectedAirportCodes([])
    setSelectedSeverityId(undefined)
    setSelectedYearMonthPeriod(undefined)
    setSelectedTimeBlock(undefined)
    setSelectedSeason(undefined)
    setSelectedMonth(undefined)
  }, [filters])

  const mapRoutes = useMemo(
    () => (airportsQuery.data?.routesByAirport ? Object.values(airportsQuery.data.routesByAirport).flat() : []),
    [airportsQuery.data],
  )
  const selectedAirport = useMemo(() => {
    if (selectedAirportCodes.length > 0) {
      return airportsQuery.data?.airports?.find((airport) => selectedAirportCodes.includes(airport.code))
    }
    return airportsQuery.data?.airports?.[0]
  }, [airportsQuery.data?.airports, selectedAirportCodes])

  if (query.isError) {
    const message = query.error?.message?.startsWith('Không')
      ? query.error.message
      : 'Không thể kết nối nguồn dữ liệu. Vui lòng thử lại.'
    return <OverviewQueryState kind="error" message={message} onRetry={query.refetch} />
  }

  if (query.isLoading || !query.data) {
    return <OverviewQueryState kind="loading" />
  }

  const overview = query.data
  const networkMetrics = overview.kpis[0]?.metrics ?? bundleFromEvidence({ unavailableReason: 'Không có chuyến bay đủ điều kiện' })
  const networkContext = (sourceComponentId: string, sourceLabelVi: string, intent: WnAnalysisContext['comparisonIntent'] = 'rate') => createAnalysisContext({
    sourceComponentId,
    sourceUnitId: sourceComponentId,
    sourceLabelVi,
    grain: 'network',
    comparisonIntent: intent,
    globalFilters: filters,
    metrics: networkMetrics,
  })
  const trendPointContext = (point: GranularTrendSeries, granularity: Granularity, sourceComponentId = point.isFuture ? 'P1-C07' : 'P1-C06') => createAnalysisContext({
    sourceComponentId,
    sourceUnitId: point.period,
    sourceLabelVi: `${point.isFuture ? 'Lịch sử hỗ trợ dự báo' : 'Kỳ phân tích'} · ${point.label}`,
    grain: 'time_period',
    comparisonIntent: point.isFuture ? 'future_history' : 'trend',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: point.eligibleCount ?? point.wnN, delayed: point.delayedCount, rate: point.wn, averageDelay: point.averageDelay }),
    filters: point.isFuture ? undefined : filtersForTrendPeriod(point.period, granularity),
  })
  const severityContext = (band: DelaySeverityBand) => createAnalysisContext({
    sourceComponentId: 'P1-C11',
    sourceUnitId: band.id,
    sourceLabelVi: `${band.label} · ${band.shortLabel}`,
    grain: 'segment',
    comparisonIntent: 'rate',
    globalFilters: filters,
    metrics: band.metrics,
    filters: { minimumArrivalDelay: band.minArrivalDelay, maximumArrivalDelay: band.maxArrivalDelay },
  })
  const airportContext = (airport: AirportHotspot) => createAnalysisContext({
    sourceComponentId: 'P1-C08',
    sourceUnitId: airport.code,
    sourceLabelVi: `Sân bay ${airport.code} · mọi vai trò`,
    grain: 'airport',
    comparisonIntent: 'airport',
    globalFilters: filters,
    metrics: bundleFromEvidence({
      eligible: airport.eligibleCount ?? airport.n,
      delayed: airport.delayedCount,
      rate: airport.rate,
      averageDelay: airport.averageDelay,
    }),
    filters: { airport: airport.code, airportRole: 'either' },
  })
  const yearMonthContext = (point: YearMonthDelayPoint) => createAnalysisContext({
    sourceComponentId: 'P1-C06-V04',
    sourceUnitId: point.period,
    sourceLabelVi: `Tháng ${point.period} · Theo năm`,
    grain: 'time_period',
    comparisonIntent: 'trend',
    globalFilters: filters,
    metrics: point.metrics,
    filters: filtersForTrendPeriod(point.period, 'month'),
  })
  const timeBlockContext = (block: TimeBlockDelaySummary) => createAnalysisContext({
    sourceComponentId: 'P1-C14',
    sourceUnitId: block.block,
    sourceLabelVi: `Khung giờ kế hoạch · ${block.label}`,
    grain: 'time_period',
    comparisonIntent: 'time_pattern',
    globalFilters: filters,
    metrics: block.metrics,
    filters: { scheduledTimeBlocks: [block.block] },
  })
  const seasonContext = (season: SeasonSummary) => createAnalysisContext({
    sourceComponentId: 'P1-C15',
    sourceUnitId: season.season,
    sourceLabelVi: `Mùa phân tích · ${formatSeason(season.season)}`,
    grain: 'time_period',
    comparisonIntent: 'time_pattern',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: season.n, delayed: season.delayedCount, rate: season.rate, averageDelay: season.averageDelay }),
    filters: { seasons: [season.season] },
  })
  const monthContext = (season: SeasonSummary, month: SeasonSummary['months'][number]) => createAnalysisContext({
    sourceComponentId: 'P1-C15',
    sourceUnitId: `${season.season}-${month.month}`,
    sourceLabelVi: `${formatMonth(month.month)} · ${formatSeason(season.season)}`,
    grain: 'time_period',
    comparisonIntent: 'time_pattern',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: month.n, delayed: month.delayedCount, rate: month.rate, averageDelay: month.averageDelay }),
    filters: { seasons: [season.season], months: [{ Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }[month.month] ?? 1] },
  })

  const selectedSeverity = overview.severityBands?.find((band) => band.id === selectedSeverityId) ?? overview.severityBands?.[0]
  const selectedYearMonth = overview.yearMonthComparison?.find((point) => point.period === selectedYearMonthPeriod) ?? overview.yearMonthComparison?.[overview.yearMonthComparison?.length - 1]
  const selectedBlock = overview.timeBlocks?.find((block) => block.block === selectedTimeBlock) ?? overview.timeBlocks?.[0]
  const selectedSeasonSummary = overview.seasons?.find((season) => season.season === selectedSeason) ?? overview.seasons?.[0]
  const selectedMonthSummary = selectedSeasonSummary?.months.find((month) => month.month === selectedMonth)
  const selectedSeasonalContext = selectedSeasonSummary
    ? selectedMonthSummary ? monthContext(selectedSeasonSummary, selectedMonthSummary) : seasonContext(selectedSeasonSummary)
    : undefined

  const routeMeasurementContext = (ap1Code: string, ap2Code: string) => {
    const matching = mapRoutes.find(
      (r) => (r.origin === ap1Code && r.destination === ap2Code) || (r.origin === ap2Code && r.destination === ap1Code),
    )
    return createAnalysisContext({
      sourceComponentId: 'P1-C08',
      sourceUnitId: `${ap1Code}-${ap2Code}`,
      sourceLabelVi: `Tuyến ${ap1Code} ↔ ${ap2Code}`,
      grain: 'route',
      comparisonIntent: 'rate',
      globalFilters: filters,
      metrics: matching
        ? bundleFromEvidence({
            eligible: matching.eligibleCount ?? matching.n,
            delayed: matching.delayedCount,
            rate: matching.rate,
            averageDelay: matching.averageDelay,
          })
        : bundleFromEvidence({ unavailableReason: 'Chưa có chuyến bay theo bộ lọc' }),
      filters: {
        airportClauses: [
          { id: `route-${ap1Code}-${ap2Code}`, mode: 'route', origin: ap1Code, destination: ap2Code },
          { id: `route-${ap2Code}-${ap1Code}`, mode: 'route', origin: ap2Code, destination: ap1Code },
        ],
      },
    })
  }

  const handleMapSelectPair = (pair: string[]) => {
    setSelectedAirportCodes(pair)
    if (pair.length === 1) {
      onToast(`Đã chọn sân bay thứ nhất: ${pair[0]}. Nhấp thêm một sân bay nữa để xem thống kê tuyến.`)
    } else if (pair.length === 2) {
      onToast(`Đã chọn cặp tuyến ${pair[0]} ↔ ${pair[1]}. Thống kê tuyến hiển thị bên dưới bản đồ.`)
    }
  }

  const handleClearPair = () => {
    setSelectedAirportCodes([])
    onToast('Đã xóa tuyến đo.')
  }
  const eligibleKpi = overview.kpis.find((kpi) => kpi.id === 'P1-C02')?.value ?? '—'
  const delayedKpi = overview.kpis.find((kpi) => kpi.id === 'P1-C03')?.value ?? '—'
  const rateKpi = overview.kpis.find((kpi) => kpi.id === 'P1-C04')?.value ?? '—'
  const avgDelayKpi = overview.kpis.find((kpi) => kpi.id === 'P1-C05')?.value ?? '—'
  const hasTrendEvidence = Boolean(
    overview.unifiedTrends?.month.some((point) => !point.isFuture)
    || overview.unifiedTrends?.week.some((point) => !point.isFuture)
    || overview.unifiedTrends?.day.some((point) => !point.isFuture)
    || overview.yearMonthComparison.length,
  )

  return (
    <section className="view active overview-page" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P1 · Tổng quan mạng lưới</div>
          <h1 id="overview-title">Từ sức khỏe mạng lưới đến nhánh cần điều tra</h1>
          <p className="page-subtitle">Đánh giá mức phổ biến, mức độ và biến động của trễ trước khi chuyển sang phân tích không gian, thời gian hoặc dự báo.</p>
        </div>
        <div className="page-actions">
          <IllustrativeLabel />
          <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Xem định nghĩa KPI</button>
        </div>
      </div>

      <div className="grid cols-4">
        {overview.kpis.map((kpi) => {
          const tooltipContent = (
            <div className="kpi-business-tooltip-content">
              <div className="kpi-tooltip-title">{kpi.label} ({kpi.id})</div>
              <div className="kpi-tooltip-body">{KPI_BUSINESS_DEFINITIONS[kpi.id] ?? kpi.context}</div>
              <div className="kpi-tooltip-bundle">
                <span className="tooltip-bundle-heading">Bộ ba chỉ số trễ mạng lưới đồng bộ:</span>
                <div className="tooltip-bundle-row">
                  <span>• Tỷ lệ trễ: <strong>{rateKpi}</strong></span>
                  <span>• Số chuyến trễ: <strong>{delayedKpi} / {eligibleKpi}</strong></span>
                  <span>• Độ trễ TB: <strong>{avgDelayKpi}</strong></span>
                </div>
              </div>
            </div>
          )
          const context = networkContext(kpi.id, kpi.label)
          return (
            <div className={`card kpi-card kpi-card-clean kpi-tooltip-wrapper${kpi.id === 'P1-C04' ? ' kpi-card--primary' : ''}`} data-component-id={kpi.id} key={kpi.id} onContextMenu={(event) => openAnalysisContextMenu(event, context, { entitySubtitle: 'KPI mạng lưới' })}>
              <div className="kpi-label card-title-group"><span>{kpi.label}</span><ComponentHelpButton componentId={kpi.id} title={kpi.label} /></div>
              <Tooltip content={tooltipContent} side="bottom" className="kpi-business-tooltip">
                <button className="kpi-button kpi-value-button" type="button" onClick={onOpenMethodology} aria-label={`${kpi.label}: ${kpi.value}`}><div className="kpi-value">{kpi.value}</div></button>
              </Tooltip>
              <AnalysisActions context={context} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
            </div>
          )
        })}
      </div>

      <div className="overview-main-grid">
        {overview.unifiedTrends && (
          <Card
            id="P1-C06"
            title="Xu hướng trễ chuyến mạng lưới và dự báo"
            subtitle={activeGranularity === 'year' ? 'So sánh tỷ lệ trễ giữa các năm theo từng tháng lịch sử' : 'Đường lịch sử, độ trễ đến trung bình và tín hiệu dự báo được phân biệt rõ'}
            action={
              <div className="overview-card-actions">
                <IllustrativeLabel compact />
                {activeGranularity === 'year' && selectedYearMonth ? (
                  <AnalysisActions
                    context={yearMonthContext(selectedYearMonth)}
                    onOpenComparison={onOpenComparison}
                    onOpenInvestigation={onOpenInvestigation}
                    compact
                  />
                ) : (
                  <AnalysisActions
                    context={networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend')}
                    onOpenComparison={onOpenComparison}
                    onOpenInvestigation={onOpenInvestigation}
                    compact
                  />
                )}
              </div>
            }
            onContextMenu={(event) => {
              if (activeGranularity === 'year' && selectedYearMonth) {
                openAnalysisContextMenu(event, yearMonthContext(selectedYearMonth), { entitySubtitle: 'Tháng và năm đang chọn' })
              } else {
                openAnalysisContextMenu(event, networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend'), { entitySubtitle: 'Xu hướng mạng lưới' })
              }
            }}
          >
            {hasTrendEvidence ? (
              <>
                <UnifiedTrendChart
                  data={overview.unifiedTrends}
                  yearMonthData={overview.yearMonthComparison}
                  selectedYearMonthPeriod={selectedYearMonthPeriod}
                  onSelectYearMonth={(point) => setSelectedYearMonthPeriod(point.period)}
                  onYearMonthPointContextMenu={(event, point) => openAnalysisContextMenu(event, yearMonthContext(point), { entitySubtitle: 'Tháng và năm lịch sử' })}
                  onSelectPeriod={(period) => onToast(`Đã chọn chu kỳ ${period}; ngữ cảnh sẵn sàng cho phân tích tiếp theo.`)}
                  onGranularityChange={(gran) => {
                    setActiveGranularity(gran)
                    if (gran !== 'year') setSelectedYearMonthPeriod(undefined)
                  }}
                  onToast={onToast}
                  onPointContextMenu={(event, point, granularity) => openAnalysisContextMenu(event, trendPointContext(point, granularity), { entitySubtitle: point.isFuture ? 'Mốc dự báo' : 'Mốc thời gian' })}
                  compact
                />
                {activeGranularity !== 'year' && (
                  <div className="prediction-trend-callout" data-component-id="P1-C07" onContextMenu={(event) => openAnalysisContextMenu(event, networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history'), { entitySubtitle: 'Lịch sử hỗ trợ dự báo' })}>
                    <div><div className="card-title-group"><h3>Xu hướng ước tính của mô hình</h3><ComponentHelpButton componentId="P1-C07" title="Xu hướng ước tính của mô hình" /></div><p>Điểm dự báo được ngoại suy từ mô hình; hành động phân tích mở tập lịch sử hỗ trợ.</p></div>
                    <AnalysisActions context={networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive />
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Không có dữ liệu xu hướng" detail="Không có chuyến bay đủ điều kiện trong phạm vi phân tích hiện tại." />
            )}
          </Card>
        )}
      </div>

      <div className="overview-map-severity-grid">
        <Card
          id="P1-C08"
          className="overview-map-card"
          title="Bản đồ điểm nóng sân bay"
          subtitle="Điểm nóng trễ theo vị trí không gian mạng lưới · Sắp xếp theo chênh lệch chuẩn"
          action={
            <div className="overview-card-actions">
              <IllustrativeLabel compact />
              {selectedAirportCodes.length === 2 ? (
                <AnalysisActions
                  context={routeMeasurementContext(selectedAirportCodes[0], selectedAirportCodes[1])}
                  onOpenComparison={onOpenComparison}
                  onOpenInvestigation={onOpenInvestigation}
                  compact
                />
              ) : selectedAirport ? (
                <AnalysisActions
                  context={airportContext(selectedAirport)}
                  onOpenComparison={onOpenComparison}
                  onOpenInvestigation={onOpenInvestigation}
                  compact
                />
              ) : null}
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  if (selectedAirport) onSelectEntity(selectedAirport.code)
                  onNavigate('spatial')
                }}
              >
                Mở trang P2
              </button>
            </div>
          }
          onContextMenu={(event) => {
            if (selectedAirportCodes.length === 2) {
              openAnalysisContextMenu(event, routeMeasurementContext(selectedAirportCodes[0], selectedAirportCodes[1]), { entitySubtitle: 'Tuyến đang đo' })
            } else if (selectedAirport) {
              openAnalysisContextMenu(event, airportContext(selectedAirport), { entitySubtitle: 'Sân bay đang chọn' })
            }
          }}
        >
          {airportsQuery.isError ? (
            <ErrorState
              message={airportsQuery.error?.message?.startsWith('Không') ? airportsQuery.error.message : 'Không thể kết nối dữ liệu sân bay. Vui lòng thử lại.'}
              onRetry={airportsQuery.refetch}
            />
          ) : airportsQuery.isLoading || !airportsQuery.data ? (
            <LoadingState rows={5} />
          ) : airportsQuery.data.airports.length === 0 ? (
            <EmptyState title="Không có điểm nóng sân bay" detail="Không có chuyến bay đủ điều kiện để tổng hợp sân bay trong phạm vi hiện tại." />
          ) : (
            <AirportMap
              airports={airportsQuery.data.airports}
              routes={mapRoutes}
              networkBaselineRate={airportsQuery.data.networkBaselineRate}
              selectedCodes={selectedAirportCodes}
              enableMeasurement
              onSelectPair={handleMapSelectPair}
              onClearPair={handleClearPair}
              onAirportContextMenu={(event, airport) => openAnalysisContextMenu(event, airportContext(airport), { entitySubtitle: 'Điểm sân bay' })}
            />
          )}
        </Card>
        <div className="overview-map-side-rail">
          <Card id="P1-C11" title="Phân phối mức độ trễ đến" action={selectedSeverity ? <AnalysisActions context={severityContext(selectedSeverity)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedSeverity ? (event) => openAnalysisContextMenu(event, severityContext(selectedSeverity), { entitySubtitle: 'Nhóm mức độ trễ' }) : undefined}>
            <DelaySeverityDistribution bands={overview.severityBands} selectedId={selectedSeverity?.id} onSelect={(band) => setSelectedSeverityId(band.id)} onBandContextMenu={(event, band) => openAnalysisContextMenu(event, severityContext(band), { entitySubtitle: 'Nhóm mức độ trễ' })} />
          </Card>

          <Card
            id="P1-C14"
            className="overview-time-block-card"
            title="Tỷ lệ trễ theo khung giờ"
            action={
              <div className="overview-card-actions">
                {selectedBlock ? <AnalysisActions context={timeBlockContext(selectedBlock)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : null}
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => onNavigate('temporal')}>Mở trang P3</button>
              </div>
            }
            onContextMenu={selectedBlock ? (event) => openAnalysisContextMenu(event, timeBlockContext(selectedBlock), { entitySubtitle: 'Khung giờ đang chọn' }) : undefined}
          >
            <TimeBlockDelayChart blocks={overview.timeBlocks} selectedBlock={selectedBlock?.block} onSelect={(block) => setSelectedTimeBlock(block.block)} onBlockContextMenu={(event, block) => openAnalysisContextMenu(event, timeBlockContext(block), { entitySubtitle: 'Khung giờ kế hoạch' })} />
          </Card>
        </div>
      </div>

      <div className="overview-secondary-grid overview-secondary-grid--seasonal">
        <Card
          id="P1-C15"
          className="overview-seasonal-card"
          title="Tỷ lệ trễ theo mùa và tháng"
          action={
            <div className="overview-card-actions">
              {selectedSeasonalContext ? <AnalysisActions context={selectedSeasonalContext} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : null}
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => onNavigate('temporal')}
              >
                Mở trang P3
              </button>
            </div>
          }
          onContextMenu={selectedSeasonalContext ? (event) => openAnalysisContextMenu(event, selectedSeasonalContext, { entitySubtitle: selectedMonthSummary ? 'Tháng đang chọn' : 'Mùa đang chọn' }) : undefined}
        >
          <SeasonalBarChart
            seasons={overview.seasons}
            selectedSeason={selectedSeasonSummary?.season}
            selectedMonth={selectedMonth}
            onSelectSeason={(season) => { setSelectedSeason(season); setSelectedMonth(undefined) }}
            onSelectMonth={(month) => {
              const season = overview.seasons.find((item) => item.months.some((candidate) => candidate.month === month))
              setSelectedSeason(season?.season)
              setSelectedMonth(month)
            }}
            onClearSelection={() => { setSelectedSeason(undefined); setSelectedMonth(undefined) }}
            onSeasonContextMenu={(event, season) => openAnalysisContextMenu(event, seasonContext(season), { entitySubtitle: 'Mùa phân tích' })}
            onMonthContextMenu={(event, season, month) => openAnalysisContextMenu(event, monthContext(season, month), { entitySubtitle: 'Tháng trong mùa' })}
          />
        </Card>
      </div>
      {analysisContextMenu}
    </section>
  )
}
