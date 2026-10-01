import { useState } from 'react'
import type { ComparisonContext, GlobalFilters, PageId } from '../domain/types'
import { useTemporalPatterns } from '../hooks/dashboardHooks'
import { LineChart } from '../components/charts/LineChart'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

interface TemporalPageProps {
  filters: GlobalFilters
  selectedEntity: string
  onNavigate: (page: PageId) => void
  onSelectEntity: (entity: string) => void
  onOpenComparison: (context: ComparisonContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenCause: (entity: string) => void
  onOpenMethodology: () => void
  onToast: (message: string) => void
}

const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const blocks = ['Early Morning', 'Morning', 'Afternoon', 'Evening']

const heatLevel = (gap: number | null) => {
  if (gap === null || gap < 0) return 1
  if (gap < 2) return 2
  if (gap < 4) return 3
  if (gap < 6) return 4
  return 5
}

export function TemporalPage({ filters, selectedEntity, onNavigate, onSelectEntity, onOpenComparison, onOpenEvidence, onOpenCause, onOpenMethodology, onToast }: TemporalPageProps) {
  const routeContext = selectedEntity.includes('→') ? selectedEntity : 'DAL → ATL'
  const [selectedCell, setSelectedCell] = useState('Thứ Sáu · Evening')
  const [selectedSeason, setSelectedSeason] = useState<string>()
  const [selectedRoute, setSelectedRoute] = useState(routeContext)
  const query = useTemporalPatterns(filters, { route: selectedRoute, selectedCell, selectedSeason })

  if (query.isError) return <ErrorState message={query.error?.message ?? 'Lỗi không xác định'} onRetry={query.refetch} />

  return (
    <section className="view active" aria-labelledby="temporal-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P3 · Time evidence</div>
          <h1 id="temporal-title">Khi nào delay tập trung?</h1>
          <p className="page-subtitle">Scheduled Time Block luôn được dẫn xuất từ CRS_DEP_TIME. Day/Time là local controls, không thay đổi global filter.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <div className="context-banner" data-component-id="P3-C01">
        <div>
          <h2>{selectedRoute} · Temporal context</h2>
          <div className="context-list">
            <span className="context-chip">BL-T</span>
            <span className="context-chip">{selectedCell}</span>
            <span className="context-chip">{selectedSeason ?? 'All project seasons'}</span>
            <span className="context-chip">WN fixed</span>
          </div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Xem định nghĩa BL-T</button>
      </div>

      <div className="grid split-7-5">
        <Card id="P3-C02" title="Day × Scheduled Time Block" subtitle="Cell color = BL-T Gap · label = Actual Delay Rate">
          {query.isLoading || !query.data ? <LoadingState rows={7} /> : (
            <div className="heatmap-v2">
              <div className="heat-label" />
              {blocks.map((block) => <div className="heat-label" key={block}>{block.replace('Early Morning', 'Early')}</div>)}
              {days.flatMap((day) => [
                <div className="heat-label" key={`${day}-label`}>{day.replace('Thứ ', 'T').replace('Chủ Nhật', 'CN')}</div>,
                ...blocks.map((block) => {
                  const cell = query.data?.heatmap.find((item) => item.day === day && item.block === block)
                  const id = `${day} · ${block}`
                  return (
                    <button
                      className={`heat-cell heat-${heatLevel(cell?.gap ?? null)}${selectedCell === id ? ' selected' : ''}`}
                      type="button"
                      key={id}
                      aria-label={`${id}, rate ${cell?.rate ?? 0}%, gap ${cell?.gap ?? 'N/A'} pp, n ${cell?.n ?? 0}`}
                      onClick={() => { setSelectedCell(id); onToast(`Đã chọn ${id}; route table được contextualize.`) }}
                    >
                      <strong>{cell?.rate.toFixed(1)}%</strong>
                      <small>n={cell?.n.toLocaleString('vi-VN')}</small>
                    </button>
                  )
                }),
              ])}
            </div>
          )}
          <div className="legend"><span className="legend-item"><span className="legend-dot gray" />Dưới baseline</span><span className="legend-item"><span className="legend-dot amber" />Gap trung bình</span><span className="legend-item"><span className="legend-dot" />Gap ≥ 5 pp</span></div>
        </Card>

        <Card id="P3-C03" title="Four Project Seasons" subtitle="Project season · mỗi card gồm 3 tháng">
          {query.isLoading || !query.data ? <LoadingState rows={6} /> : (
            <div className="season-grid">
              {query.data.seasons.map((season) => (
                <button
                  className={`season-card${selectedSeason === season.season ? ' selected' : ''}`}
                  type="button"
                  key={season.season}
                  onClick={() => { setSelectedSeason(season.season); onToast(`Local season: ${season.season}.`) }}
                >
                  <span className="season-title"><strong>{season.season}</strong><b>{season.rate.toFixed(1)}%</b></span>
                  {season.months.map((month) => <span className="season-month" key={month.month}><span>{month.month}</span><span>{month.rate.toFixed(1)}%</span><small>{month.gap >= 0 ? '+' : ''}{month.gap.toFixed(1)} pp · n={month.n.toLocaleString('vi-VN')}</small></span>)}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card id="P3-C04" title="Monthly History" subtitle="Chronological evidence · Month → Week → Date">
        {query.data ? <LineChart data={query.data.monthlyTrend} onSelect={(point) => onToast(`Drill time tại ${point.period}; n=${point.n}.`)} /> : <LoadingState />}
        <div className="legend"><span className="legend-item"><span className="legend-dot" />Selected context</span><span className="legend-item"><span className="legend-dot gray" />BL-T</span></div>
      </Card>

      <div className="grid split-8-4 page-section-gap">
        <Card id="P3-C05" title="Routes in Selected Time" subtitle={`${selectedCell} · ${selectedSeason ?? 'All seasons'} · directional routes`} action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-T' })}>So sánh đối thủ</button>}>
          {query.isLoading || !query.data ? <LoadingState rows={4} /> : query.data.routes.length === 0 ? <EmptyState title="Không có route" detail="Hãy xóa local time selection." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Directional route</th><th>Rate</th><th>BL-T / Gap</th><th>Avg Delay</th><th>Sample</th></tr></thead>
                <tbody>
                  {query.data.routes.map((route) => (
                    <tr className={`selectable${selectedRoute === route.route ? ' selected' : ''}`} key={route.id} onClick={() => { setSelectedRoute(route.route); onSelectEntity(route.route) }}>
                      <td className="route-name">{route.route}</td>
                      <td>{route.rate.toFixed(1)}%</td>
                      <td>{route.baseline?.toFixed(1)}% / <strong>+{route.gap?.toFixed(1)} pp</strong></td>
                      <td>{route.averageDelay.toFixed(1)} min</td>
                      <td>{route.n.toLocaleString('vi-VN')}<span className="subcell"><SampleBadge flag={route.flag} /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card id="P3-C06" title="Context Actions" subtitle="Giữ route/time selection khi chuyển trang">
          <div className="selected-context">
            <span>Selected route × time</span><strong>{selectedRoute}</strong><small>{selectedCell} · {selectedSeason ?? 'All seasons'}</small>
          </div>
          <div className="stacked-actions">
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('prediction')}>Mở future risk</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-T' })}>Carrier comparison</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(selectedRoute)}>Segment evidence</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenCause(selectedRoute)}>Cause context</button>
          </div>
        </Card>
      </div>
    </section>
  )
}
