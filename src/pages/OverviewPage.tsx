import { useState } from 'react'
import type { EvidenceRecord, GlobalFilters, GranularTrendSeries, PageId, WnAnalysisContext } from '../domain/types'
import { bundleFromEvidence, createAnalysisContext, filtersForTrendPeriod } from '../domain/analysisContext'
import { formatEntityType } from '../domain/formatters'
import { useOverview } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { Tooltip } from '../components/atoms/Tooltip/Tooltip'
import { ComponentHelpButton } from '../components/ui/ComponentHelpButton'
import { AnalysisActions } from '../components/ui/AnalysisActions'
import { useAnalysisContextMenu } from '../components/ui/useAnalysisContextMenu'
import type { Granularity } from '../components/charts/UnifiedTrendChart'

interface OverviewPageProps {
  filters: GlobalFilters
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
  onOpenComparison: (context: WnAnalysisContext) => void
  onOpenInvestigation: (context: WnAnalysisContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenMethodology: () => void
  onToast: (message: string) => void
}

const KPI_BUSINESS_DEFINITIONS: Record<string, string> = {
  'P1-C02': 'Tổng số chuyến bay thương mại theo kế hoạch đã hoàn thành hành trình (không hủy chuyến, không chuyển hướng) và có đầy đủ dữ liệu ghi nhận giờ đến.',
  'P1-C03': 'Tổng số chuyến bay có thời gian đến thực tế trễ từ 15 phút trở lên so với lịch bay công bố ban đầu.',
  'P1-C04': 'Tỷ lệ phần trăm số chuyến bay đến trễ (từ 15 phút trở lên) trên tổng số chuyến bay đủ điều kiện vận hành.',
  'P1-C05': 'Độ trễ đến trung bình tính bằng phút trên toàn bộ các chuyến bay đủ điều kiện trong kỳ phân tích.',
}

function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return 'Đang cập nhật'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút (~${minutes} phút)`
}

export function OverviewPage({
  filters,
  onSelectEntity,
  onOpenComparison,
  onOpenInvestigation,
  onOpenEvidence,
  onOpenMethodology,
  onToast,
}: OverviewPageProps) {
  const query = useOverview(filters)
  const [selectedAirportCodes, setSelectedAirportCodes] = useState<string[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>()
  const { analysisContextMenu, openAnalysisContextMenu } = useAnalysisContextMenu(onOpenComparison, onOpenInvestigation)

  if (query.isError) return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />

  const handleSelectCandidate = (candidate: EvidenceRecord) => {
    setSelectedCandidateId(candidate.id)
    onSelectEntity(candidate.entity)
    if (candidate.entity.includes('→')) {
      const parts = candidate.entity.split('→').map((s) => s.trim())
      if (parts.length === 2) {
        setSelectedAirportCodes([parts[0], parts[1]])
        onToast(`Đã làm nổi bật tuyến ${parts[0]} ↔ ${parts[1]} trên bản đồ điểm nóng.`)
        return
      }
    }
    if (candidate.code) {
      setSelectedAirportCodes([candidate.code])
      onToast(`Đã làm nổi bật sân bay ${candidate.code} trên bản đồ điểm nóng.`)
      return
    }
    onToast(`Đã chọn đối tượng ${candidate.entity}.`)
  }

  if (query.isLoading || !query.data) {
    return (
      <section className="view active" aria-labelledby="overview-title">
        <div className="page-heading">
          <div>
            <div className="eyebrow">P1 · Tổng quan mạng lưới</div>
            <h1 id="overview-title">Từ tín hiệu mạng lưới đến nhánh cần điều tra</h1>
            <p className="page-subtitle">
              Theo dõi chỉ số KPI lịch sử, đối chiếu xu hướng đa hãng cùng mô hình dự báo và chọn phân đoạn sân bay, đường bay để kiểm chứng sâu hơn.
            </p>
          </div>
          <div className="page-actions">
            <IllustrativeLabel />
            <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>
              Xem định nghĩa KPI
            </button>
          </div>
        </div>
        <div className="grid cols-4">
          <LoadingState />
          <LoadingState />
          <LoadingState />
          <LoadingState />
        </div>
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
  const airportContext = (airport: typeof overview.destinations[number]) => createAnalysisContext({
    sourceComponentId: 'P1-C08',
    sourceUnitId: airport.id,
    sourceLabelVi: `Sân bay đến ${airport.code}`,
    grain: 'airport',
    comparisonIntent: 'airport',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: airport.eligibleCount ?? airport.n, delayed: airport.delayedCount, rate: airport.rate, averageDelay: airport.averageDelay }),
    filters: { airport: airport.code, airportRole: 'destination' },
  })
  const candidateContext = (candidate: EvidenceRecord) => createAnalysisContext({
    sourceComponentId: 'P1-C09',
    sourceUnitId: candidate.id,
    sourceLabelVi: candidate.entity,
    grain: candidate.entity.includes('→') ? 'route' : 'airport',
    comparisonIntent: candidate.entity.includes('→') ? 'rate' : 'airport',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: candidate.eligibleCount ?? candidate.n, delayed: candidate.delayedCount, rate: candidate.rate, averageDelay: candidate.averageDelay }),
    filters: candidate.entity.includes('→') ? { route: candidate.entity } : { airport: candidate.code, airportRole: 'either' },
  })
  const trendPointContext = (point: GranularTrendSeries, granularity: Granularity) => createAnalysisContext({
    sourceComponentId: point.isFuture ? 'P1-C07' : 'P1-C06',
    sourceUnitId: point.period,
    sourceLabelVi: `${point.isFuture ? 'Lịch sử hỗ trợ dự báo' : 'Xu hướng WN'} · ${point.label}`,
    grain: 'time_period',
    comparisonIntent: point.isFuture ? 'future_history' : 'trend',
    globalFilters: filters,
    metrics: bundleFromEvidence({ eligible: point.eligibleCount ?? point.wnN, delayed: point.delayedCount, rate: point.wn, averageDelay: point.averageDelay }),
    filters: point.isFuture ? undefined : filtersForTrendPeriod(point.period, granularity),
  })
  const selectedCandidate = overview.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? overview.candidates[0]
  const eligibleKpi = overview.kpis.find((k) => k.id === 'P1-C02')?.value ?? '83.936'
  const delayedKpi = overview.kpis.find((k) => k.id === 'P1-C03')?.value ?? '15.444'
  const rateKpi = overview.kpis.find((k) => k.id === 'P1-C04')?.value ?? '18,4%'
  const avgDelayKpi = overview.kpis.find((k) => k.id === 'P1-C05')?.value ?? '12,3 phút'

  return (
    <section className="view active" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P1 · Tổng quan mạng lưới</div>
          <h1 id="overview-title">Từ tín hiệu mạng lưới đến nhánh cần điều tra</h1>
          <p className="page-subtitle">
            Theo dõi chỉ số KPI lịch sử, đối chiếu xu hướng đa hãng cùng mô hình dự báo và chọn phân đoạn sân bay, đường bay để kiểm chứng sâu hơn.
          </p>
        </div>
        <div className="page-actions">
          <IllustrativeLabel />
          <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>
            Xem định nghĩa KPI
          </button>
        </div>
      </div>

      <div className="grid cols-4">
        {overview.kpis.map((kpi) => {
          const businessDef = KPI_BUSINESS_DEFINITIONS[kpi.id] ?? kpi.context ?? kpi.label

          const tooltipContent = (
            <div className="kpi-business-tooltip-content">
              <div className="kpi-tooltip-title">
                {kpi.label} ({kpi.id})
              </div>
              <div className="kpi-tooltip-body">{businessDef}</div>
              <div className="kpi-tooltip-bundle">
                <span className="tooltip-bundle-heading">Bộ ba chỉ số trễ mạng lưới đồng bộ:</span>
                <div className="tooltip-bundle-row">
                  <span>• Tỷ lệ trễ: <strong>{rateKpi}</strong></span>
                  <span>• Số chuyến trễ: <strong>{delayedKpi} / {eligibleKpi}</strong> chuyến</span>
                  <span>• Độ trễ TB: <strong>{avgDelayKpi}</strong></span>
                </div>
              </div>
            </div>
          )

          return (
            <div className="card kpi-card kpi-card-clean kpi-tooltip-wrapper" data-component-id={kpi.id} key={kpi.id} onContextMenu={(event) => openAnalysisContextMenu(event, networkContext(kpi.id, kpi.label), { entitySubtitle: 'KPI mạng lưới' })}>
              <div className="kpi-label card-title-group">
                <span>{kpi.label}</span>
                <ComponentHelpButton componentId={kpi.id} title={kpi.label} />
                <span className="component-id">{kpi.id}</span>
              </div>
              <Tooltip content={tooltipContent} side="bottom" className="kpi-business-tooltip">
                <button
                  className="kpi-button kpi-value-button"
                  type="button"
                  onClick={onOpenMethodology}
                  aria-label={`${kpi.label}: ${kpi.value}`}
                >
                  <div className="kpi-value">{kpi.value}</div>
                </button>
              </Tooltip>
              <AnalysisActions context={networkContext(kpi.id, kpi.label)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact />
            </div>
          )
        })}
      </div>

      {overview.unifiedTrends && (
        <Card
          id="P1-C06"
          title="Xu hướng trễ chuyến mạng lưới & Dự báo mô hình"
          subtitle="Tích hợp xu hướng tỷ lệ trễ đa hãng (đường) cùng độ trễ đến trung bình mỗi chuyến (cột) và mô hình dự báo tương lai"
          action={<><IllustrativeLabel compact /><AnalysisActions context={networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /></>}
          onContextMenu={(event) => openAnalysisContextMenu(event, networkContext('P1-C06', 'Xu hướng trễ chuyến mạng lưới', 'trend'), { entitySubtitle: 'Xu hướng mạng lưới' })}
        >
          <UnifiedTrendChart
            data={overview.unifiedTrends}
            onSelectPeriod={(period) =>
              onToast(`Đã chọn chu kỳ ${period}; ngữ cảnh sẵn sàng chuyển tiếp sang P2/P3.`)
            }
            onToast={onToast}
            onPointContextMenu={(event, point, granularity) => openAnalysisContextMenu(event, trendPointContext(point, granularity), { entitySubtitle: point.isFuture ? 'Mốc dự báo' : 'Mốc thời gian' })}
          />
          <div className="prediction-trend-callout" data-component-id="P1-C07" onContextMenu={(event) => openAnalysisContextMenu(event, networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history'), { entitySubtitle: 'Lịch sử hỗ trợ dự báo' })}>
            <div>
              <div className="card-title-group"><h3>Xu hướng ước tính của mô hình</h3><ComponentHelpButton componentId="P1-C07" title="Xu hướng ước tính của mô hình" /></div>
              <p>Đường dự báo minh họa được tách khỏi tỷ lệ trễ lịch sử; khi mở phân tích, hệ thống chỉ dùng tập lịch sử hỗ trợ.</p>
            </div>
            <AnalysisActions context={networkContext('P1-C07', 'Xu hướng ước tính của mô hình', 'future_history')} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact predictive />
          </div>
        </Card>
      )}

      <div className="grid split-7-5">
        <Card
          id="P1-C08"
          title="Bản đồ điểm nóng sân bay & Thống kê tuyến bay"
          subtitle="Rà chuột lên sân bay để xem tooltip chỉ số · Chọn 2 sân bay để xem thống kê tuyến theo bộ lọc hiện tại"
          action={<><IllustrativeLabel compact /><AnalysisActions context={createAnalysisContext({ sourceComponentId: 'P1-C08', sourceUnitId: selectedAirportCodes[0] ?? 'network', sourceLabelVi: selectedAirportCodes[0] ? `Sân bay ${selectedAirportCodes[0]}` : 'Bản đồ điểm nóng sân bay đến', grain: selectedAirportCodes[0] ? 'airport' : 'network', comparisonIntent: 'airport', globalFilters: filters, metrics: selectedAirportCodes[0] ? bundleFromEvidence({ eligible: overview.destinations.find((item) => item.code === selectedAirportCodes[0])?.eligibleCount, delayed: overview.destinations.find((item) => item.code === selectedAirportCodes[0])?.delayedCount, rate: overview.destinations.find((item) => item.code === selectedAirportCodes[0])?.rate, averageDelay: overview.destinations.find((item) => item.code === selectedAirportCodes[0])?.averageDelay }) : networkMetrics, filters: selectedAirportCodes[0] ? { airport: selectedAirportCodes[0], airportRole: 'destination' } : undefined })} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /></>}
          onContextMenu={(event) => {
            const airport = overview.destinations.find((item) => item.code === selectedAirportCodes[0])
            openAnalysisContextMenu(event, airport ? airportContext(airport) : networkContext('P1-C08', 'Bản đồ điểm nóng sân bay đến', 'airport'), { entitySubtitle: airport ? 'Sân bay đến' : 'Bản đồ sân bay' })
          }}
        >
          <AirportMap
            airports={overview.destinations}
            routes={overview.routes ?? overview.candidates}
            networkBaselineRate={overview.unifiedTrends?.baseline}
            selectedCodes={selectedAirportCodes}
            onSelectPair={(pair) => {
              setSelectedAirportCodes(pair)
              if (pair.length === 1) {
                onToast(`Đã chọn sân bay thứ nhất: ${pair[0]}. Nhấp thêm một sân bay nữa để xem thống kê tuyến.`)
              } else if (pair.length === 2) {
                onToast(`Đã chọn cặp tuyến ${pair[0]} ↔ ${pair[1]}. Thống kê tuyến hiển thị bên dưới.`)
              }
            }}
            onClearPair={() => {
              setSelectedAirportCodes([])
              onToast('Đã xóa tuyến đo.')
            }}
            onAirportContextMenu={(event, airport) => openAnalysisContextMenu(event, airportContext(airport), { entitySubtitle: 'Sân bay đến' })}
          />
        </Card>

        <Card
          id="P1-C09"
          title="Đối tượng cần kiểm tra"
          subtitle="Xếp hạng các tuyến bay trọng yếu có chênh lệch tỷ lệ trễ so với mức chuẩn mạng lưới"
          action={selectedCandidate ? <AnalysisActions context={candidateContext(selectedCandidate)} onOpenComparison={onOpenComparison} onOpenInvestigation={onOpenInvestigation} compact /> : undefined}
          onContextMenu={selectedCandidate ? (event) => openAnalysisContextMenu(event, candidateContext(selectedCandidate), { entitySubtitle: 'Đối tượng đang chọn' }) : undefined}
        >
          {overview.candidates.length === 0 ? (
            <EmptyState title="Không có đối tượng phù hợp" detail="Hãy đặt lại bộ lọc để mở rộng phạm vi dữ liệu." />
          ) : (
            <div className="candidate-list">
              {overview.candidates.map((candidate, index) => {
                const isRoute = candidate.entityType === 'Route' || candidate.entity.includes('→')
                const gap = candidate.gap ?? 0
                const gapClass = gap > 0 ? 'candidate-gap-higher' : gap < 0 ? 'candidate-gap-lower' : ''
                const isSelectedRoute =
                  isRoute &&
                  candidate.origin &&
                  candidate.destination &&
                  selectedAirportCodes.includes(candidate.origin) &&
                  selectedAirportCodes.includes(candidate.destination)

                const delayedCountText = candidate.delayedCount?.toLocaleString('vi-VN') ?? '0'
                const eligibleCountText = candidate.eligibleCount?.toLocaleString('vi-VN') ?? candidate.n.toLocaleString('vi-VN')

                return (
                  <button
                    type="button"
                    className={`candidate-row-full ${isSelectedRoute ? 'active-candidate' : ''}`}
                    key={candidate.id}
                    onClick={() => handleSelectCandidate(candidate)}
                    onContextMenu={(event) => openAnalysisContextMenu(event, candidateContext(candidate), { entitySubtitle: isRoute ? 'Đường bay' : 'Sân bay' })}
                    aria-label={`Chọn tuyến ${candidate.entity}: Tỷ lệ trễ ${candidate.rate.toFixed(1).replace('.', ',')}%, Số chuyến trễ ${delayedCountText}/${eligibleCountText}, Độ trễ TB ${candidate.averageDelay.toFixed(1).replace('.', ',')} phút, Chênh lệch ${gap > 0 ? '+' : ''}${gap.toFixed(1).replace('.', ',')}%`}
                  >
                    <div className="candidate-main-header">
                      <span className="candidate-rank">{String(index + 1).padStart(2, '0')}</span>
                      <span className="candidate-name">
                        <strong>{candidate.entity}</strong>
                        <small>
                          {formatEntityType(candidate.entityType)} · Trễ {delayedCountText} / {eligibleCountText} chuyến
                        </small>
                      </span>
                      <span className="candidate-metric">
                        <strong>{candidate.rate.toFixed(1).replace('.', ',')}%</strong>
                        <small className={gapClass}>
                          {candidate.gap === null
                            ? 'Chênh lệch N/A'
                            : `${candidate.gap > 0 ? '+' : ''}${candidate.gap.toFixed(1).replace('.', ',')}%`}
                        </small>
                      </span>
                    </div>

                    {isRoute && (
                      <div className="candidate-extra-grid">
                        <div className="candidate-extra-item">
                          <span className="extra-label">TB trễ chuyến</span>
                          <span className="extra-val">
                            {candidate.averageDelay.toFixed(1).replace('.', ',')} phút
                          </span>
                        </div>
                        <div className="candidate-extra-item">
                          <span className="extra-label">Quãng đường</span>
                          <span className="extra-val">
                            {candidate.distance
                              ? `${candidate.distance.toLocaleString('vi-VN')} dặm (~${Math.round(candidate.distance * 1.60934).toLocaleString('vi-VN')} km)`
                              : 'Đang cập nhật'}
                          </span>
                        </div>
                        <div className="candidate-extra-item">
                          <span className="extra-label">Thời gian ước tính</span>
                          <span className="extra-val">
                            {formatDuration(candidate.estimatedTime)}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          <button
            className="btn btn-secondary full-width"
            type="button"
            style={{ marginTop: '12px' }}
            onClick={() => onOpenEvidence(overview.candidates[0]?.entity ?? 'DAL → ATL')}
          >
            Mở bằng chứng phân đoạn
          </button>
        </Card>
      </div>
      {analysisContextMenu}
    </section>
  )
}
