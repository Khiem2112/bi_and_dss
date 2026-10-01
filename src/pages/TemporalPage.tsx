import { useState } from 'react'
import type { ComparisonContext, GlobalFilters, PageId } from '../domain/types'
import { formatMonth, formatSeason, formatTemporalCell, formatTimeBlock } from '../domain/formatters'
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
          <div className="eyebrow">P3 · Bằng chứng thời gian</div>
          <h1 id="temporal-title">Khi nào trễ chuyến tập trung nhiều nhất?</h1>
          <p className="page-subtitle">Khung giờ bay theo kế hoạch luôn được dẫn xuất từ CRS_DEP_TIME. Thứ/Khung giờ là điều khiển cục bộ, không thay đổi bộ lọc toàn cục.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <div className="context-banner" data-component-id="P3-C01">
        <div>
          <h2>{selectedRoute} · Ngữ cảnh thời gian</h2>
          <div className="context-list">
            <span className="context-chip">BL-T</span>
            <span className="context-chip">{formatTemporalCell(selectedCell)}</span>
            <span className="context-chip">{selectedSeason ? formatSeason(selectedSeason) : 'Tất cả các mùa'}</span>
            <span className="context-chip">Cố định hãng WN</span>
          </div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Xem định nghĩa BL-T</button>
      </div>

      <div className="grid split-7-5">
        <Card id="P3-C02" title="Thứ trong tuần × Khung giờ kế hoạch" subtitle="Màu ô = Chênh lệch BL-T · Số liệu = Tỷ lệ đến trễ thực tế">
          {query.isLoading || !query.data ? <LoadingState rows={7} /> : (
            <div className="heatmap-v2">
              <div className="heat-label" />
              {blocks.map((block) => <div className="heat-label" key={block}>{formatTimeBlock(block)}</div>)}
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
                      aria-label={`${formatTemporalCell(id)}, tỷ lệ ${cell?.rate ?? 0}%, chênh lệch ${cell?.gap ?? 'N/A'} điểm %, cỡ mẫu ${cell?.n ?? 0}`}
                      onClick={() => { setSelectedCell(id); onToast(`Đã chọn ${formatTemporalCell(id)}; bảng đường bay đã được cập nhật theo ngữ cảnh.`) }}
                    >
                      <strong>{cell?.rate.toFixed(1)}%</strong>
                      <small>n={cell?.n.toLocaleString('vi-VN')}</small>
                    </button>
                  )
                }),
              ])}
            </div>
          )}
          <div className="legend"><span className="legend-item"><span className="legend-dot gray" />Dưới mức tham chiếu</span><span className="legend-item"><span className="legend-dot amber" />Chênh lệch trung bình</span><span className="legend-item"><span className="legend-dot" />Chênh lệch ≥ 5 điểm %</span></div>
        </Card>

        <Card id="P3-C03" title="Bốn mùa phân tích" subtitle="Mùa phân tích · Mỗi thẻ gồm 3 tháng">
          {query.isLoading || !query.data ? <LoadingState rows={6} /> : (
            <div className="season-grid">
              {query.data.seasons.map((season) => (
                <button
                  className={`season-card${selectedSeason === season.season ? ' selected' : ''}`}
                  type="button"
                  key={season.season}
                  onClick={() => { setSelectedSeason(season.season); onToast(`Mùa cục bộ: ${formatSeason(season.season)}.`) }}
                >
                  <span className="season-title"><strong>{formatSeason(season.season)}</strong><b>{season.rate.toFixed(1)}%</b></span>
                  {season.months.map((month) => <span className="season-month" key={month.month}><span>{formatMonth(month.month)}</span><span>{month.rate.toFixed(1)}%</span><small>{month.gap >= 0 ? '+' : ''}{month.gap.toFixed(1)} điểm % · n={month.n.toLocaleString('vi-VN')}</small></span>)}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card id="P3-C04" title="Lịch sử theo tháng" subtitle="Bằng chứng theo trình tự thời gian · Tháng → Tuần → Ngày">
        {query.data ? <LineChart data={query.data.monthlyTrend} onSelect={(point) => onToast(`Xem chi tiết thời gian tại ${point.period}; n=${point.n}.`)} /> : <LoadingState />}
        <div className="legend"><span className="legend-item"><span className="legend-dot" />Ngữ cảnh đã chọn</span><span className="legend-item"><span className="legend-dot gray" />BL-T (Tham chiếu)</span></div>
      </Card>

      <div className="grid split-8-4 page-section-gap">
        <Card id="P3-C05" title="Đường bay trong khung thời gian đã chọn" subtitle={`${formatTemporalCell(selectedCell)} · ${selectedSeason ? formatSeason(selectedSeason) : 'Tất cả các mùa'} · Đường bay theo chiều`} action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-T' })}>So sánh hãng bay</button>}>
          {query.isLoading || !query.data ? <LoadingState rows={4} /> : query.data.routes.length === 0 ? <EmptyState title="Không có đường bay phù hợp" detail="Hãy xóa lựa chọn thời gian cục bộ để xem toàn bộ danh sách." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Đường bay theo chiều</th><th>Tỷ lệ trễ</th><th>BL-T / Chênh lệch</th><th>Độ trễ TB</th><th>Cỡ mẫu</th></tr></thead>
                <tbody>
                  {query.data.routes.map((route) => (
                    <tr className={`selectable${selectedRoute === route.route ? ' selected' : ''}`} key={route.id} onClick={() => { setSelectedRoute(route.route); onSelectEntity(route.route) }}>
                      <td className="route-name">{route.route}</td>
                      <td>{route.rate.toFixed(1)}%</td>
                      <td>{route.baseline?.toFixed(1)}% / <strong>+{route.gap?.toFixed(1)} điểm %</strong></td>
                      <td>{route.averageDelay.toFixed(1)} phút</td>
                      <td>{route.n.toLocaleString('vi-VN')}<span className="subcell"><SampleBadge flag={route.flag} /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card id="P3-C06" title="Thao tác theo ngữ cảnh" subtitle="Giữ nguyên lựa chọn đường bay/thời gian khi chuyển trang">
          <div className="selected-context">
            <span>Đường bay × thời gian đã chọn</span><strong>{selectedRoute}</strong><small>{formatTemporalCell(selectedCell)} · {selectedSeason ? formatSeason(selectedSeason) : 'Tất cả các mùa'}</small>
          </div>
          <div className="stacked-actions">
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('prediction')}>Mở rủi ro tương lai</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-T' })}>So sánh hãng bay</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(selectedRoute)}>Bằng chứng phân đoạn</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenCause(selectedRoute)}>Bối cảnh nguyên nhân</button>
          </div>
        </Card>
      </div>
    </section>
  )
}
