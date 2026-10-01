import type { GlobalFilters, PageId } from '../domain/types'
import { useOverview } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { LineChart } from '../components/charts/LineChart'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

interface OverviewPageProps {
  filters: GlobalFilters
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
  onOpenEvidence: (entity: string) => void
  onOpenMethodology: () => void
  onToast: (message: string) => void
}

export function OverviewPage({ filters, onNavigate, onSelectEntity, onOpenEvidence, onOpenMethodology, onToast }: OverviewPageProps) {
  const query = useOverview(filters)

  if (query.isError) return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />

  return (
    <section className="view active" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P1 · Network overview</div>
          <h1 id="overview-title">Từ tín hiệu mạng lưới đến nhánh cần điều tra</h1>
          <p className="page-subtitle">Theo dõi KPI lịch sử, đối chiếu xu hướng model minh họa và chọn airport/route/time segment để kiểm chứng sâu hơn.</p>
        </div>
        <div className="page-actions">
          <IllustrativeLabel />
          <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Xem định nghĩa KPI</button>
        </div>
      </div>

      {query.isLoading || !query.data ? (
        <div className="grid cols-4"><LoadingState /><LoadingState /><LoadingState /><LoadingState /></div>
      ) : (
        <>
          <div className="grid cols-4">
            {query.data.kpis.map((kpi) => (
              <button className="card kpi-card kpi-button" type="button" data-component-id={kpi.id} key={kpi.id} onClick={onOpenMethodology}>
                <div className="kpi-label"><span>{kpi.label}</span><span className="component-id">{kpi.id}</span></div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-context">{kpi.context}</div>
              </button>
            ))}
          </div>

          <div className="grid cols-2 synchronized-charts">
            <Card id="P1-C06" title="Actual Delay Trend" subtitle="Historical BI · Month → Week → Date">
              <LineChart data={query.data.actualTrend} onSelect={(point) => onToast(`Đã chọn ${point.period}; context sẵn sàng truyền sang P2/P3.`)} />
              <div className="legend"><span className="legend-item"><span className="legend-dot" />Actual Delay Rate</span><span className="legend-item">Tooltip gồm n từng tháng</span></div>
            </Card>
            <Card id="P1-C07" title="Model-estimated Trend" subtitle="Predicted Expected Delay Rate · validation/scoring demo">
              <LineChart data={query.data.predictedTrend} secondary onSelect={(point) => onToast(`Model-estimated ${point.period}: ${point.value.toFixed(1)}% · minh họa.`)} />
              <div className="legend"><span className="legend-item"><span className="legend-dot blue" />Mean probability</span><span className="legend-item"><SampleBadge flag="Uncalibrated" /></span></div>
            </Card>
          </div>

          <div className="grid split-7-5">
            <Card id="P1-C08" title="Destination Hotspot Map" subtitle="Color = BL-AR Gap · size = n" action={<IllustrativeLabel compact />}>
              <AirportMap
                airports={query.data.destinations}
                onSelect={(airport) => {
                  onSelectEntity(airport.entity)
                  onToast(`Đã chọn ${airport.entity}; mở P2 để xem exact ranking.`)
                  onNavigate('spatial')
                }}
              />
            </Card>
            <Card id="P1-C09" title="Investigation Candidates" subtitle="Không gắn nhãn Confirmed Hotspot khi sample rule chưa hiệu chỉnh">
              {query.data.candidates.length === 0 ? (
                <EmptyState title="Không có candidate" detail="Hãy đặt lại bộ lọc để mở rộng context." />
              ) : (
                <div className="candidate-list">
                  {query.data.candidates.map((candidate, index) => (
                    <button
                      type="button"
                      className="candidate-row"
                      key={candidate.id}
                      onClick={() => {
                        onSelectEntity(candidate.entity)
                        onNavigate(candidate.entityType === 'Time' ? 'temporal' : 'spatial')
                      }}
                    >
                      <span className="candidate-rank">{String(index + 1).padStart(2, '0')}</span>
                      <span className="candidate-name"><strong>{candidate.entity}</strong><small>{candidate.entityType} · n={candidate.n.toLocaleString('vi-VN')}</small></span>
                      <span className="candidate-metric"><strong>{candidate.rate.toFixed(1)}%</strong><small>{candidate.gap === null ? 'Gap N/A' : `${candidate.gap > 0 ? '+' : ''}${candidate.gap.toFixed(1)} pp`}</small></span>
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn-secondary full-width" type="button" onClick={() => onOpenEvidence(query.data?.candidates[0]?.entity ?? 'DAL → ATL')}>Mở Segment Evidence</button>
            </Card>
          </div>
        </>
      )}
    </section>
  )
}
