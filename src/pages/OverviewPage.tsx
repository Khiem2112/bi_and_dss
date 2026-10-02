import { useState } from 'react'
import type { EvidenceRecord, GlobalFilters, PageId } from '../domain/types'
import { formatEntityType } from '../domain/formatters'
import { useOverview } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { UnifiedTrendChart } from '../components/charts/UnifiedTrendChart'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { Tooltip } from '../components/atoms/Tooltip/Tooltip'
import { ComponentHelpButton } from '../components/ui/ComponentHelpButton'

interface OverviewPageProps {
  filters: GlobalFilters
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
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
  onOpenEvidence,
  onOpenMethodology,
  onToast,
}: OverviewPageProps) {
  const query = useOverview(filters)
  const [selectedAirportCodes, setSelectedAirportCodes] = useState<string[]>([])

  if (query.isError) return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />

  const handleSelectCandidate = (candidate: EvidenceRecord) => {
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
            <div className="card kpi-card kpi-card-clean kpi-tooltip-wrapper" data-component-id={kpi.id} key={kpi.id}>
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
            </div>
          )
        })}
      </div>

      {overview.unifiedTrends && (
        <Card
          id="P1-C06"
          title="Xu hướng trễ chuyến mạng lưới & Dự báo mô hình"
          subtitle="Tích hợp xu hướng tỷ lệ trễ đa hãng (đường) cùng độ trễ đến trung bình mỗi chuyến (cột) và mô hình dự báo tương lai"
          action={<IllustrativeLabel compact />}
        >
          <UnifiedTrendChart
            data={overview.unifiedTrends}
            onSelectPeriod={(period) =>
              onToast(`Đã chọn chu kỳ ${period}; ngữ cảnh sẵn sàng chuyển tiếp sang P2/P3.`)
            }
            onToast={onToast}
          />
        </Card>
      )}

      <div className="grid split-7-5">
        <Card
          id="P1-C08"
          title="Bản đồ điểm nóng sân bay & Thống kê tuyến bay"
          subtitle="Rà chuột lên sân bay để xem tooltip chỉ số · Chọn 2 sân bay để xem thống kê tuyến theo bộ lọc hiện tại"
          action={<IllustrativeLabel compact />}
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
          />
        </Card>

        <Card
          id="P1-C09"
          title="Đối tượng cần kiểm tra"
          subtitle="Xếp hạng các tuyến bay trọng yếu có chênh lệch tỷ lệ trễ so với mức chuẩn mạng lưới"
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
    </section>
  )
}
