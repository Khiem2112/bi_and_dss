import { useMemo, useState } from 'react'
import type { AirportHotspot, DelaySeverityBand, GlobalFilters, GranularTrendSeries, PageId, SeasonSummary, TimeBlockDelaySummary, WnAnalysisContext, YearMonthDelayPoint } from '../domain/types'
import { bundleFromEvidence, createAnalysisContext, filtersForTrendPeriod } from '../domain/analysisContext'
import { formatMonth, formatSeason } from '../domain/formatters'
import { useAirportHotspots, useOverview } from '../hooks/dashboardHooks'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import type { Granularity } from '../components/charts/UnifiedTrendChart'
import { NetworkPerformanceMatrix } from '../components/charts/NetworkPerformanceMatrix'
import { DelaySeverityDistribution } from '../components/charts/DelaySeverityDistribution'
import { YearMonthComparisonChart } from '../components/charts/YearMonthComparisonChart'
import { TimeBlockDelayChart } from '../components/charts/TimeBlockDelayChart'
import { SeasonalBarChart } from '../components/charts/SeasonalBarChart'
import { AirportMap } from '../components/charts/AirportMap'
import { Card, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
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

export function OverviewPage({
  filters: propFilters,
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
  const [selectedMatrixPeriod, setSelectedMatrixPeriod] = useState<string>()
  const [selectedSeverityId, setSelectedSeverityId] = useState<string>()
  const [selectedYearMonthPeriod, setSelectedYearMonthPeriod] = useState<string>()
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<string>()
  const [selectedSeason, setSelectedSeason] = useState<string>()
  const [selectedMonth, setSelectedMonth] = useState<string>()
  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

  const mapRoutes = useMemo(
    () => (airportsQuery.data ? Object.values(airportsQuery.data.routesByAirport).flat() : []),
    [airportsQuery.data],
  )
  const selectedAirport = useMemo(() => {
    if (selectedAirportCodes.length > 0) {
      return airportsQuery.data?.airports.find((airport) => selectedAirportCodes.includes(airport.code))
    }
    return airportsQuery.data?.airports[0]
  }, [airportsQuery.data?.airports, selectedAirportCodes])

  if (query.isError) return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />

  if (query.isLoading || !query.data) {
    return (
      <section className="view active" aria-labelledby="overview-title">
        <div className="page-heading">
          <div>
            <div className="eyebrow">P1 · Tổng quan mạng lưới</div>
            <h1 id="overview-title">Từ sức khỏe mạng lưới đến nhánh cần điều tra</h1>
            <p className="page-subtitle">Theo dõi KPI lịch sử, mức độ trễ và các tín hiệu thời gian chính của mạng WN.</p>
          </div>
        </div>
        <div className="grid cols-4"><LoadingState /><LoadingState /><LoadingState /><LoadingState /></div>
      </section>
    )
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
    sourceComponentId: 'P1-C13',
    sourceUnitId: point.period,
    sourceLabelVi: point.label,
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

  const historicalMonths = overview.unifiedTrends?.month.filter((point) => !point.isFuture) ?? []
  const selectedMatrixPoint = historicalMonths.find((point) => point.period === selectedMatrixPeriod) ?? historicalMonths[historicalMonths.length - 1]
  const selectedSeverity = overview.severityBands.find((band) => band.id === selectedSeverityId) ?? overview.severityBands[0]
  const selectedYearMonth = overview.yearMonthComparison.find((point) => point.period === selectedYearMonthPeriod) ?? overview.yearMonthComparison[overview.yearMonthComparison.length - 1]
  const selectedBlock = overview.timeBlocks.find((block) => block.block === selectedTimeBlock) ?? overview.timeBlocks[0]
  const selectedSeasonSummary = overview.seasons.find((season) => season.season === selectedSeason) ?? overview.seasons[0]
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

  return (
    <section className="view active" aria-labelledby="overview-title">
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
            <div className="card kpi-card kpi-card-clean kpi-tooltip-wrapper" data-component-id={kpi.id} key={kpi.id} onContextMenu={(event) => openAnalysisContextMenu(event, context, { entitySubtitle: 'KPI mạng lưới' })}>
              <div className="kpi-label card-title-group"><span>{kpi.label}</span><ComponentHelpButton componentId={kpi.id} title={kpi.label} /><span className="component-id">{kpi.id}</span></div>
              <Tooltip content={tooltipContent} side="bottom" className="kpi-business-tooltip">
                <button className="kpi-button kpi-value-button" type="button" onClick={onOpenMethodology} aria-label={`${kpi.label}: ${kpi.value}`}><div className="kpi-value">{kpi.value}</div></button>
              </Tooltip>
              <AnalysisActions context={context} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
            </div>
          )
        })}
      </div>

      {overview.unifiedTrends && (
        <Card id="P1-C06" title="Xu hướng trễ chuyến mạng lưới và dự báo minh họa" subtitle="Đường lịch sử, độ trễ đến trung bình và tín hiệu dự báo được phân biệt rõ" action={<><IllustrativeLabel compact /><AnalysisActions context={networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /></>} onContextMenu={(event) => openAnalysisContextMenu(event, networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend'), { entitySubtitle: 'Xu hướng mạng lưới' })}>
          <UnifiedTrendChart data={overview.unifiedTrends} onSelectPeriod={(period) => onToast(`Đã chọn chu kỳ ${period}; ngữ cảnh sẵn sàng cho phân tích tiếp theo.`)} onToast={onToast} onPointContextMenu={(event, point, granularity) => openAnalysisContextMenu(event, trendPointContext(point, granularity), { entitySubtitle: point.isFuture ? 'Mốc dự báo' : 'Mốc thời gian' })} />
          <div className="prediction-trend-callout" data-component-id="P1-C07" onContextMenu={(event) => openAnalysisContextMenu(event, networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history'), { entitySubtitle: 'Lịch sử hỗ trợ dự báo' })}>
            <div><div className="card-title-group"><h3>Xu hướng ước tính của mô hình</h3><ComponentHelpButton componentId="P1-C07" title="Xu hướng ước tính của mô hình" /></div><p>Điểm dự báo chỉ là tín hiệu minh họa; hành động phân tích mở tập lịch sử hỗ trợ.</p></div>
            <AnalysisActions context={networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive />
          </div>
        </Card>
      )}

      <Card
        id="P1-C08"
        className="overview-map-card"
        title="Bản đồ điểm nóng sân bay"
        subtitle="Rà chuột lên sân bay để xem tooltip chỉ số · Chọn 2 sân bay để xem thống kê tuyến theo bộ lọc hiện tại"
        action={
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
          <ErrorState message={airportsQuery.error?.message ?? 'Không thể tải bản đồ sân bay'} onRetry={airportsQuery.refetch} />
        ) : airportsQuery.isLoading || !airportsQuery.data ? (
          <LoadingState rows={5} />
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

      <div className="grid overview-insight-grid">
        <Card id="P1-C10" title="Ma trận tần suất × mức độ trễ" subtitle="Mỗi bong bóng là một tháng; kích thước biểu thị số chuyến đủ điều kiện" action={selectedMatrixPoint ? <AnalysisActions context={trendPointContext(selectedMatrixPoint, 'month', 'P1-C10')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedMatrixPoint ? (event) => openAnalysisContextMenu(event, trendPointContext(selectedMatrixPoint, 'month', 'P1-C10'), { entitySubtitle: 'Tháng đang chọn' }) : undefined}>
          <NetworkPerformanceMatrix points={historicalMonths} selectedPeriod={selectedMatrixPoint?.period} onSelect={(point) => setSelectedMatrixPeriod(point.period)} onPointContextMenu={(event, point) => openAnalysisContextMenu(event, trendPointContext(point, 'month', 'P1-C10'), { entitySubtitle: 'Tháng lịch sử' })} />
        </Card>

        <Card id="P1-C11" title="Phân phối mức độ trễ đến" subtitle="Biểu đồ tròn gồm các nhóm loại trừ nhau; ARR_DELAY chỉ dùng cho mô tả hậu nghiệm" action={selectedSeverity ? <AnalysisActions context={severityContext(selectedSeverity)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedSeverity ? (event) => openAnalysisContextMenu(event, severityContext(selectedSeverity), { entitySubtitle: 'Nhóm mức độ trễ' }) : undefined}>
          <DelaySeverityDistribution bands={overview.severityBands} selectedId={selectedSeverity?.id} onSelect={(band) => setSelectedSeverityId(band.id)} onBandContextMenu={(event, band) => openAnalysisContextMenu(event, severityContext(band), { entitySubtitle: 'Nhóm mức độ trễ' })} />
        </Card>
      </div>

      <Card id="P1-C13" title="Tỷ lệ trễ theo tháng giữa các năm" subtitle="Mỗi đường là một năm; rê chuột hoặc dùng bàn phím để xem đủ bộ ba chỉ số của từng tháng" action={selectedYearMonth ? <AnalysisActions context={yearMonthContext(selectedYearMonth)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedYearMonth ? (event) => openAnalysisContextMenu(event, yearMonthContext(selectedYearMonth), { entitySubtitle: 'Tháng và năm đang chọn' }) : undefined}>
        <YearMonthComparisonChart points={overview.yearMonthComparison} selectedPeriod={selectedYearMonth?.period} onSelect={(point) => setSelectedYearMonthPeriod(point.period)} onPointContextMenu={(event, point) => openAnalysisContextMenu(event, yearMonthContext(point), { entitySubtitle: 'Tháng và năm lịch sử' })} />
      </Card>

      <div className="grid overview-temporal-grid">
        <Card id="P1-C14" title="Tỷ lệ trễ theo khung giờ" subtitle="Khung giờ được xác định từ giờ khởi hành theo kế hoạch" action={selectedBlock ? <AnalysisActions context={timeBlockContext(selectedBlock)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedBlock ? (event) => openAnalysisContextMenu(event, timeBlockContext(selectedBlock), { entitySubtitle: 'Khung giờ đang chọn' }) : undefined}>
          <TimeBlockDelayChart blocks={overview.timeBlocks} selectedBlock={selectedBlock?.block} onSelect={(block) => setSelectedTimeBlock(block.block)} onBlockContextMenu={(event, block) => openAnalysisContextMenu(event, timeBlockContext(block), { entitySubtitle: 'Khung giờ kế hoạch' })} />
        </Card>

        <Card id="P1-C15" title="Tỷ lệ trễ theo mùa và tháng" subtitle="Cùng biểu đồ với trang Phân tích thời gian, dùng ở đây để phát hiện nhanh thời đoạn nổi bật" action={selectedSeasonalContext ? <AnalysisActions context={selectedSeasonalContext} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined} onContextMenu={selectedSeasonalContext ? (event) => openAnalysisContextMenu(event, selectedSeasonalContext, { entitySubtitle: selectedMonthSummary ? 'Tháng đang chọn' : 'Mùa đang chọn' }) : undefined}>
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
