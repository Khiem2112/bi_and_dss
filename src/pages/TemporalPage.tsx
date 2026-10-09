import { useState } from 'react'
import type { GlobalFilters, PageId, SeasonSummary, TrendPoint, WnAnalysisContext } from '../domain/types'
import { bundleFromEvidence, createAnalysisContext, filtersForTrendPeriod } from '../domain/analysisContext'
import { formatMonth, formatSeason, formatTemporalCell, formatTimeBlock } from '../domain/formatters'
import { useTemporalPatterns } from '../hooks/dashboardHooks'
import { LineChart } from '../components/charts/LineChart'
import { SeasonalBarChart } from '../components/charts/SeasonalBarChart'
import { RouteAirportEvidenceTable } from '../components/tables/RouteAirportEvidenceTable'
import { Card, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { ComponentHelpButton } from '../components/ui/ComponentHelpButton'
import { AnalysisActions } from '../components/ui/AnalysisActions'
import { useAnalysisContextMenu } from '../components/ui/useAnalysisContextMenu'

import { useFilterStore } from '../stores/filterStore'
import { useOverlayStore } from '../stores/overlayStore'

interface TemporalPageProps {
  filters?: GlobalFilters
  selectedEntity: string
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
  onOpenComparison?: (context: WnAnalysisContext) => void
  onOpenInvestigation?: (context: WnAnalysisContext) => void
  onOpenEvidence?: (entity: string) => void
  onOpenCause?: (entity: string) => void
  onOpenMethodology?: () => void
  onToast: (message: string) => void
}

const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const blocks = ['Early Morning', 'Morning', 'Afternoon', 'Evening']
const monthNumbers: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }
const seasonMonths: Record<string, number[]> = { Winter: [1, 2, 3], Spring: [4, 5, 6], Summer: [7, 8, 9], Autumn: [10, 11, 12] }

const heatLevel = (gap: number | null) => {
  if (gap === null || gap < 0) return 1
  if (gap < 2) return 2
  if (gap < 4) return 3
  if (gap < 6) return 4
  return 5
}

export function TemporalPage({
  filters: propFilters,
  selectedEntity,
  onNavigate,
  onSelectEntity,
  onOpenComparison,
  onOpenInvestigation,
  onOpenCause,
  onOpenMethodology,
  onToast,
}: TemporalPageProps) {
  const globalFilters = useFilterStore((state) => state.filters)
  const filters = propFilters ?? globalFilters
  const storeOpenCause = useOverlayStore((state) => state.openCause)
  const handleOpenCause = onOpenCause ?? storeOpenCause
  const initialRoute = selectedEntity.includes('→') ? selectedEntity : undefined
  const [selectedCell, setSelectedCell] = useState('Thứ Sáu · Evening')
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>()
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>()
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>()
  const [selectedRoute, setSelectedRoute] = useState<string | undefined>(initialRoute)
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | undefined>()
  const [seasonalViewMode, setSeasonalViewMode] = useState<'seasonal' | 'trend'>('seasonal')
  const [evidenceTableMode, setEvidenceTableMode] = useState<'route' | 'airport'>('route')
  const activeEntity = selectedRoute ?? selectedAirportCode ?? 'Mạng lưới WN'

  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

  const query = useTemporalPatterns(filters, {
    route: selectedRoute,
    selectedCell,
    selectedSeason,
    selectedMonth,
    selectedPeriod,
  })

  function openContextMenu(
    e: React.MouseEvent,
    entity: string,
    entityType: 'Airport' | 'Route',
    code?: string,
    role?: 'Origin' | 'Destination',
  ) {
    const targetEntity = entityType === 'Airport' && code ? code : entity
    const context = contextFor(targetEntity, 'P3-C04', 'time_pattern', selectedCell, role)
    openAnalysisContextMenu(e, context, {
      entitySubtitle: entityType === 'Route' ? 'Đường bay trong thời đoạn' : 'Sân bay trong thời đoạn',
      extraItems: [
        { label: 'Bối cảnh nguyên nhân ghi nhận', onClick: () => handleOpenCause(entity) },
        { label: 'Phân tích không gian & bản đồ', onClick: () => { onSelectEntity(entity); onNavigate('spatial') } },
      ],
    })
  }

  function resetLocalSelection() {
    setSelectedSeason(undefined)
    setSelectedMonth(undefined)
    setSelectedPeriod(undefined)
    setSelectedCell('Thứ Sáu · Evening')
    setSelectedRoute(initialRoute)
    setSelectedAirportCode(undefined)
    onToast('Đã đặt lại các lựa chọn thời gian cục bộ.')
  }

  if (query.isError) {
    return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />
  }

  const hasLocalFilter = Boolean(
    selectedSeason ||
      selectedMonth ||
      selectedPeriod ||
      (selectedRoute && selectedRoute !== initialRoute) ||
      selectedAirportCode ||
      selectedCell !== 'Thứ Sáu · Evening',
  )

  const activeTimeLabel = selectedPeriod
    ? `Tháng ${selectedPeriod.slice(5)}/${selectedPeriod.slice(0, 4)}`
    : selectedMonth
      ? formatMonth(selectedMonth)
      : selectedSeason
        ? formatSeason(selectedSeason)
        : 'Tất cả các mùa'

  const activeTimeFilters: Partial<WnAnalysisContext['filters']> = selectedPeriod
    ? filtersForTrendPeriod(selectedPeriod, 'month')
    : selectedMonth
      ? { months: [monthNumbers[selectedMonth] ?? Number(selectedMonth)] }
      : selectedSeason
        ? { months: seasonMonths[selectedSeason] }
        : {}

  function contextFor(entity: string, sourceComponentId: string, intent: WnAnalysisContext['comparisonIntent'], cellId?: string, role?: 'Origin' | 'Destination', overrideFilters: Partial<WnAnalysisContext['filters']> = {}): WnAnalysisContext {
    const route = query.data?.routes.find((item) => item.entity === entity)
    const airport = query.data?.airports.find((item) => item.code === entity || item.entity === entity)
    const cell = cellId ? query.data?.heatmap.find((item) => `${item.day} · ${item.block}` === cellId) : undefined
    const [day, block] = cellId?.split(' · ') ?? []
    return createAnalysisContext({
      sourceComponentId,
      sourceUnitId: cellId ?? route?.id ?? airport?.id ?? entity,
      sourceLabelVi: cellId ? `${entity} · ${formatTemporalCell(cellId)}` : entity,
      grain: cell ? 'time_cell' : route ? 'route' : airport ? 'airport' : 'time_period',
      comparisonIntent: intent,
      globalFilters: filters,
      metrics: bundleFromEvidence({
        eligible: cell?.n ?? route?.eligibleCount ?? route?.n ?? airport?.eligibleCount ?? airport?.n,
        delayed: cell?.delayedCount ?? route?.delayedCount ?? airport?.delayedCount,
        rate: cell?.rate ?? route?.rate ?? airport?.rate,
        averageDelay: cell?.averageDelay ?? route?.averageDelay ?? airport?.averageDelay,
      }),
      filters: {
        ...activeTimeFilters,
        route: route?.entity ?? (entity.includes('→') ? entity : undefined),
        airport: airport?.code,
        airportRole: airport ? (role ? (role === 'Origin' ? 'origin' : 'destination') : 'either') : undefined,
        dayOfWeeks: day ? [day] : undefined,
        scheduledTimeBlocks: block ? [block] : undefined,
        ...overrideFilters,
      },
    })
  }

  const contextForSeason = (season: SeasonSummary) => {
    const base = contextFor(activeEntity, 'P3-C02', 'trend', undefined, undefined, { months: seasonMonths[season.season] })
    return { ...base, sourceUnitId: season.season, sourceLabelVi: `${formatSeason(season.season)} · ${activeEntity}`, grain: 'time_period' as const, metricSnapshot: bundleFromEvidence({ eligible: season.n, delayed: season.delayedCount, rate: season.rate, averageDelay: season.averageDelay }) }
  }

  const contextForMonth = (season: SeasonSummary, month: SeasonSummary['months'][number]) => {
    const base = contextFor(activeEntity, 'P3-C02', 'trend', undefined, undefined, { months: [monthNumbers[month.month]] })
    return { ...base, sourceUnitId: month.month, sourceLabelVi: `${formatMonth(month.month)} · ${formatSeason(season.season)} · ${activeEntity}`, grain: 'time_period' as const, metricSnapshot: bundleFromEvidence({ eligible: month.n, delayed: month.delayedCount, rate: month.rate, averageDelay: month.averageDelay }) }
  }

  const contextForTrendPoint = (point: TrendPoint) => {
    const base = contextFor(activeEntity, 'P3-C02', 'trend', undefined, undefined, filtersForTrendPeriod(point.period, 'month'))
    return { ...base, sourceUnitId: point.period, sourceLabelVi: `Tháng ${point.period.slice(5)}/${point.period.slice(0, 4)} · ${activeEntity}`, grain: 'time_period' as const, metricSnapshot: bundleFromEvidence({ eligible: point.n, delayed: point.delayedCount, rate: point.value, averageDelay: point.averageDelay }) }
  }

  return (
    <section className="view active" aria-labelledby="temporal-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P3 · Bằng chứng thời gian</div>
          <h1 id="temporal-title">Khi nào trễ chuyến tập trung nhiều nhất?</h1>
          <p className="page-subtitle">
            Khung giờ bay theo kế hoạch luôn được dẫn xuất từ CRS_DEP_TIME. Lựa chọn thời gian là điều khiển cục bộ phục vụ phân tích đi sâu.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <IllustrativeLabel />
          {hasLocalFilter && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={resetLocalSelection} title="Đặt lại lựa chọn thời gian và thực thể cục bộ">
              Bỏ chọn cục bộ
            </button>
          )}
        </div>
      </div>

      <div className="context-banner" data-component-id="P3-C01">
        <div>
          <div className="card-title-group"><h2>{activeEntity} · Ngữ cảnh thời gian</h2><ComponentHelpButton componentId="P3-C01" title="Ngữ cảnh thời gian" /></div>
          <div className="context-list">
            <span className="context-chip" tabIndex={0} data-tooltip="Mức chuẩn theo ngữ cảnh thời gian đang chọn">BL-T</span>
            <span className="context-chip" tabIndex={0} data-tooltip="Ô ngày trong tuần – khung giờ đang chọn">{formatTemporalCell(selectedCell)}</span>
            <span className="context-chip" tabIndex={0} data-tooltip="Phạm vi thời gian phân tích hiện hành">{activeTimeLabel}</span>
            <span className="context-chip" tabIndex={0} data-tooltip="Phân tích chỉ áp dụng cho hãng Southwest (WN)">Cố định hãng WN</span>
          </div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>
          Xem định nghĩa BL-T
        </button>
      </div>

      <div className="page-section-gap">
        <Card
          id="P3-C02"
          title="Chu kỳ mùa vụ & Xu hướng theo thời gian"
          subtitle={
            seasonalViewMode === 'seasonal'
              ? `Mùa phân tích gộp 2015–2018 · Nhấp cột để lọc theo tháng hoặc nhấp mùa để lọc cả mùa · Đang chọn: ${activeTimeLabel}`
              : `Bằng chứng theo trình tự thời gian 2015–2018 · Nhấp điểm mốc để lọc ma trận thứ/giờ · Đang chọn: ${activeTimeLabel}`
          }
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AnalysisActions context={contextFor(activeEntity, 'P3-C02', 'trend')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
              {selectedPeriod && (
                <button
                  type="button"
                  className="btn btn-ghost btn--xs"
                  onClick={() => {
                    setSelectedPeriod(undefined)
                    onToast('Đã hủy lọc theo mốc thời gian.')
                  }}
                  title="Xóa lựa chọn mốc thời gian"
                >
                  Bỏ chọn mốc ({selectedPeriod})
                </button>
              )}
              <div className="segmented-control segmented-control--compact" role="group" aria-label="Chế độ hiển thị xu hướng thời gian">
                <button
                  type="button"
                  className={seasonalViewMode === 'seasonal' ? 'active' : ''}
                  onClick={() => setSeasonalViewMode('seasonal')}
                >
                  Chu kỳ 12 tháng theo mùa
                </button>
                <button
                  type="button"
                  className={seasonalViewMode === 'trend' ? 'active' : ''}
                  onClick={() => setSeasonalViewMode('trend')}
                >
                  Xu hướng liên tục 2015–2018
                </button>
              </div>
            </div>
          }
          onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(activeEntity, 'P3-C02', 'trend'), { entitySubtitle: 'Phân tích thời gian' })}
        >
          {query.isLoading || !query.data ? (
            <LoadingState rows={6} />
          ) : seasonalViewMode === 'seasonal' ? (
            <SeasonalBarChart
              seasons={query.data.seasons}
              selectedSeason={selectedSeason}
              selectedMonth={selectedMonth}
              onSelectSeason={(seasonName) => {
                setSelectedPeriod(undefined)
                if (selectedSeason === seasonName && !selectedMonth) {
                  setSelectedSeason(undefined)
                  onToast('Đã hủy lọc theo mùa.')
                } else {
                  setSelectedSeason(seasonName)
                  setSelectedMonth(undefined)
                  onToast(`Đã chọn ${formatSeason(seasonName)}; ma trận ngày/giờ và bảng bên dưới đã được cập nhật.`)
                }
              }}
              onSelectMonth={(monthName) => {
                setSelectedPeriod(undefined)
                if (selectedMonth === monthName) {
                  setSelectedMonth(undefined)
                  onToast('Đã hủy lọc theo tháng.')
                } else {
                  setSelectedMonth(monthName)
                  onToast(`Đã chọn ${formatMonth(monthName)}; ma trận ngày/giờ và bảng bên dưới đã được cập nhật.`)
                }
              }}
              onClearSelection={() => {
                setSelectedSeason(undefined)
                setSelectedMonth(undefined)
                setSelectedPeriod(undefined)
                onToast('Đã xóa lọc mùa/tháng.')
              }}
              onSeasonContextMenu={(event, season) => openAnalysisContextMenu(event, contextForSeason(season), { entitySubtitle: 'Mùa phân tích' })}
              onMonthContextMenu={(event, season, month) => openAnalysisContextMenu(event, contextForMonth(season, month), { entitySubtitle: 'Tháng phân tích' })}
            />
          ) : (
            <div>
              <LineChart
                data={query.data.monthlyTrend}
                selectedPeriod={selectedPeriod}
                onSelect={(point) => {
                  setSelectedMonth(undefined)
                  setSelectedSeason(undefined)
                  if (selectedPeriod === point.period) {
                    setSelectedPeriod(undefined)
                    onToast('Đã hủy lọc theo mốc thời gian.')
                  } else {
                    setSelectedPeriod(point.period)
                    onToast(`Đã chọn mốc thời gian ${point.period}; ma trận thứ/giờ và bảng bên dưới đã được cập nhật.`)
                  }
                }}
                onPointContextMenu={(event, point) => openAnalysisContextMenu(event, contextForTrendPoint(point), { entitySubtitle: 'Mốc thời gian' })}
              />
              <div className="legend" style={{ marginTop: '10px' }}>
                <span className="legend-item">
                  <span className="legend-dot" /> Tỷ lệ đến trễ thực tế
                </span>
                <span className="legend-item">
                  <span className="legend-dot gray" /> BL-T (Tham chiếu mạng lưới)
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="page-section-gap">
        <Card
          id="P3-C03"
          title="Thứ trong tuần × Khung giờ kế hoạch"
          subtitle={`Màu ô = Chênh lệch BL-T · Số liệu = Tỷ lệ đến trễ thực tế · Ngữ cảnh: ${activeTimeLabel}`}
          action={<AnalysisActions context={contextFor(activeEntity, 'P3-C03', 'time_pattern', selectedCell)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />}
          onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(activeEntity, 'P3-C03', 'time_pattern', selectedCell), { entitySubtitle: 'Ô thời gian đang chọn' })}
        >
          {query.isLoading || !query.data ? (
            <LoadingState rows={7} />
          ) : (
            <div className="heatmap-v2">
              <div className="heat-label" />
              {blocks.map((block) => (
                <div className="heat-label" key={block}>
                  {formatTimeBlock(block)}
                </div>
              ))}
              {days.flatMap((day) => [
                <div className="heat-label" key={`${day}-label`}>
                  {day.replace('Thứ ', 'T').replace('Chủ Nhật', 'CN')}
                </div>,
                ...blocks.map((block) => {
                  const cell = query.data?.heatmap.find((item) => item.day === day && item.block === block)
                  const id = `${day} · ${block}`
                  const isSelected = selectedCell === id
                  return (
                    <button
                      className={`heat-cell heat-${heatLevel(cell?.gap ?? null)}${isSelected ? ' selected' : ''}`}
                      type="button"
                      key={id}
                      data-analysis-unit={`heat-${id}`}
                      aria-label={cell && cell.n > 0
                        ? `${formatTemporalCell(id)}, tỷ lệ đến trễ ${cell.rate}%, số chuyến đến trễ ${cell.delayedCount} trên ${cell.n}, độ trễ đến trung bình ${cell.averageDelay} phút, chênh lệch ${cell.gap ?? 'không khả dụng'}%`
                        : `${formatTemporalCell(id)}, không có chuyến bay đủ điều kiện`}
                      data-tooltip-multiline
                      data-tooltip={cell && cell.n > 0
                        ? `${formatTemporalCell(id)}\n• Tỷ lệ chuyến đến trễ: ${cell.rate.toFixed(1).replace('.', ',')}%\n• Số chuyến đến trễ: ${cell.delayedCount.toLocaleString('vi-VN')} / ${cell.n.toLocaleString('vi-VN')}\n• Độ trễ đến trung bình: ${cell.averageDelay.toFixed(1).replace('.', ',')} phút`
                        : `${formatTemporalCell(id)}\nKhông có chuyến bay đủ điều kiện`}
                      onClick={() => {
                        setSelectedCell(id)
                        onToast(`Đã chọn ${formatTemporalCell(id)}; bảng số liệu bên dưới đã được cập nhật.`)
                      }}
                      onContextMenu={(event) => openAnalysisContextMenu(event, contextFor(activeEntity, 'P3-C03', 'time_pattern', id), { entitySubtitle: 'Ô thứ × khung giờ' })}
                    >
                      <strong>{cell && cell.n > 0 ? `${cell.rate.toFixed(1)}%` : '—'}</strong>
                      <small>{cell && cell.n > 0 ? `n=${cell.n.toLocaleString('vi-VN')}` : 'Không có dữ liệu'}</small>
                    </button>
                  )
                }),
              ])}
            </div>
          )}
          <div className="legend" style={{ marginTop: '12px' }}>
            <span className="legend-item">
              <span className="legend-dot gray" /> Dưới mức tham chiếu
            </span>
            <span className="legend-item">
              <span className="legend-dot amber" /> Chênh lệch trung bình
            </span>
            <span className="legend-item">
              <span className="legend-dot" /> Chênh lệch ≥ 5%
            </span>
          </div>
        </Card>
      </div>

      <div className="page-section-gap">
        {query.isLoading || !query.data ? (
          <LoadingState rows={6} />
        ) : (
          <RouteAirportEvidenceTable
            id="P3-C04"
            title={evidenceTableMode === 'route' ? 'Đường bay trong khung thời gian đã chọn' : 'Sân bay trong khung thời gian đã chọn'}
            subtitle={`${formatTemporalCell(selectedCell)} · ${activeTimeLabel} · Nhấp dòng để chọn hoặc chuột phải để mở thao tác`}
            routes={query.data.routes}
            airports={query.data.airports}
            routesByAirport={query.data.routesByAirport}
            selectedRoute={selectedRoute}
            selectedAirportCode={selectedAirportCode}
            defaultMode="route"
            mode={evidenceTableMode}
            onModeChange={setEvidenceTableMode}
            onSelectRoute={(route) => {
              setSelectedRoute(route)
              setSelectedAirportCode(undefined)
              onSelectEntity(route)
              onToast(`Đã chọn tuyến ${route}.`)
            }}
            onSelectAirport={(code) => {
              setSelectedAirportCode(code)
              setSelectedRoute(undefined)
              onSelectEntity(code)
              onToast(`Đã chọn sân bay ${code}.`)
            }}
            onCardContextMenu={(event) => openAnalysisContextMenu(event, contextFor(activeEntity, 'P3-C04', 'time_pattern', selectedCell), { entitySubtitle: evidenceTableMode === 'route' ? 'Bảng tuyến bay' : 'Bảng sân bay' })}
            onOpenContextMenu={openContextMenu}
            extraAction={
              selectedRoute ? (
                <AnalysisActions context={contextFor(selectedRoute, 'P3-C04', 'time_pattern', selectedCell)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
              ) : undefined
            }
          />
        )}
      </div>

      {analysisContextMenu}
    </section>
  )
}
