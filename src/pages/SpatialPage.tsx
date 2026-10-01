import { useMemo, useState } from 'react'
import type { ComparisonContext, GlobalFilters, PageId, SpatialState } from '../domain/types'
import { formatRole } from '../domain/formatters'
import { useAirportHotspots, useRouteCandidates } from '../hooks/dashboardHooks'
import { AirportMap } from '../components/charts/AirportMap'
import { LineChart } from '../components/charts/LineChart'
import { MiniSparkline } from '../components/charts/MiniSparkline'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

interface SpatialPageProps {
  filters: GlobalFilters
  initialEntity: string
  onNavigate: (page: PageId) => void
  onOpenComparison: (context: ComparisonContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenCause: (entity: string) => void
  onSelectEntity: (entity: string) => void
  onToast: (message: string) => void
}

export function SpatialPage({ filters, initialEntity, onNavigate, onOpenComparison, onOpenEvidence, onOpenCause, onSelectEntity, onToast }: SpatialPageProps) {
  const [localState, setLocalState] = useState<SpatialState>({ grain: 'destination', metric: 'gap' })
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>()
  const [selectedRoute, setSelectedRoute] = useState(initialEntity.includes('→') ? initialEntity : 'DAL → ATL')
  const airportsQuery = useAirportHotspots(filters, localState)
  const routesQuery = useRouteCandidates(filters, localState)

  const selectedAirportRecord = useMemo(
    () => airportsQuery.data?.airports.find((airport) => airport.id === selectedAirport),
    [airportsQuery.data, selectedAirport],
  )

  const setRoute = (route: string) => {
    setSelectedRoute(route)
    onSelectEntity(route)
    onToast(`Đã chọn đường bay theo chiều ${route}.`)
  }

  if (airportsQuery.isError || routesQuery.isError) {
    return <ErrorState message={airportsQuery.error?.message ?? routesQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => { airportsQuery.refetch(); routesQuery.refetch() }} />
  }

  return (
    <section className="view active" aria-labelledby="spatial-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P2 · Bằng chứng không gian</div>
          <h1 id="spatial-title">Sân bay & tuyến bay cần xem trước</h1>
          <p className="page-subtitle">Bảng số liệu là nguồn xếp hạng chính xác; bản đồ giúp định vị trực quan. Đường bay theo chiều luôn giữ đúng hướng bay.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <Card id="P2-C01" title="Bộ điều khiển không gian cục bộ" subtitle="Phạm vi phân tích toàn cục được giữ nguyên; đặt lại chỉ tác động lựa chọn cục bộ">
        <div className="control-row">
          <div className="segmented-control" aria-label="Chọn cấp độ không gian">
            {(['destination', 'origin', 'route'] as const).map((grain) => (
              <button className={localState.grain === grain ? 'active' : ''} type="button" key={grain} onClick={() => setLocalState((state) => ({ ...state, grain }))}>
                {grain === 'destination' ? 'Sân bay đến' : grain === 'origin' ? 'Sân bay đi' : 'Đường bay theo chiều'}
              </button>
            ))}
          </div>
          <div className="segmented-control" aria-label="Chọn chỉ số">
            {(['gap', 'rate'] as const).map((metric) => <button className={localState.metric === metric ? 'active' : ''} type="button" key={metric} onClick={() => setLocalState((state) => ({ ...state, metric }))}>{metric === 'gap' ? 'Chênh lệch mức tham chiếu' : 'Tỷ lệ đến trễ'}</button>)}
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => { setSelectedAirport(undefined); setSelectedRoute('DAL → ATL') }}>Bỏ chọn cục bộ</button>
        </div>
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P2-C02" title="Bản đồ điểm nóng sân bay" subtitle={`Vai trò: ${localState.grain === 'origin' ? 'Sân bay đi' : 'Sân bay đến'} · màu sắc = ${localState.metric === 'gap' ? 'Chênh lệch BL-AR' : 'Tỷ lệ đến trễ'}`} action={<IllustrativeLabel compact />}>
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : (
            <AirportMap
              airports={airportsQuery.data.airports}
              selectedId={selectedAirport}
              onSelect={(airport) => {
                setSelectedAirport(airport.id)
                onSelectEntity(airport.entity)
                onToast(`${airport.entity} đã lọc chéo bảng P2-C03.`)
              }}
            />
          )}
        </Card>
        <Card id="P2-C03" title="Bảng bằng chứng sân bay" subtitle="So sánh chi tiết · BL-AR · Cỡ mẫu/Nhãn luôn hiển thị">
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : airportsQuery.data.airports.length === 0 ? (
            <EmptyState title="Không có dữ liệu sân bay" detail="Không có sân bay nào phù hợp với phạm vi phân tích hiện tại." />
          ) : (
            <div className="table-wrap table-scroll">
              <table>
                <thead><tr><th>Sân bay / vai trò</th><th>Tỷ lệ trễ</th><th>Chênh lệch</th><th>Cỡ mẫu n</th></tr></thead>
                <tbody>
                  {airportsQuery.data.airports.map((airport) => (
                    <tr className={`selectable${selectedAirport === airport.id ? ' selected' : ''}`} key={airport.id} onClick={() => { setSelectedAirport(airport.id); onSelectEntity(airport.entity) }}>
                      <td><span className="route-name">{airport.code}</span><span className="subcell">{formatRole(airport.role)}</span></td>
                      <td>{airport.rate.toFixed(1)}%<span className="subcell">TB {airport.averageDelay.toFixed(1)} phút</span></td>
                      <td>{airport.gap === null ? 'N/A' : `+${airport.gap.toFixed(1)}%`}<span className="subcell">Tham chiếu {airport.baseline?.toFixed(1)}%</span></td>
                      <td>{airport.n.toLocaleString('vi-VN')}<span className="subcell">Chưa hiệu chỉnh</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" disabled={!selectedAirportRecord} onClick={() => selectedAirportRecord && onOpenEvidence(selectedAirportRecord.entity)}>Xem bằng chứng</button>
            <button className="btn btn-secondary" type="button" disabled={!selectedAirportRecord} onClick={() => selectedAirportRecord && onOpenCause(selectedAirportRecord.entity)}>Bối cảnh nguyên nhân</button>
          </div>
        </Card>
      </div>

      <Card
        id="P2-C04"
        title="Bảng ứng viên đường bay"
        subtitle="Đường bay theo chiều · BL-AR · Chưa gắn nhãn Điểm nóng xác nhận"
        action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-R' })}>So sánh hãng bay</button>}
      >
        {routesQuery.isLoading || !routesQuery.data ? <LoadingState rows={6} /> : routesQuery.data.routes.length === 0 ? (
          <EmptyState title="Không có dữ liệu đường bay" detail="Bộ lọc Sân bay đi / Sân bay đến hiện tại không có đường bay theo chiều nào trong phản hồi minh họa." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Đường bay theo chiều</th><th>Tỷ lệ đến trễ</th><th>BL-AR / Chênh lệch</th><th>Độ trễ trung bình</th><th>Cỡ mẫu</th><th>6 kỳ</th></tr></thead>
              <tbody>
                {routesQuery.data.routes.map((route) => (
                  <tr className={`selectable${selectedRoute === route.route ? ' selected' : ''}`} key={route.id} onClick={() => setRoute(route.route)}>
                    <td className="route-name">{route.route}</td>
                    <td><strong>{route.rate.toFixed(1)}%</strong></td>
                    <td>{route.baseline?.toFixed(1)}% / <strong>+{route.gap?.toFixed(1)}%</strong></td>
                    <td>{route.averageDelay.toFixed(1)} phút</td>
                    <td>{route.n.toLocaleString('vi-VN')}<span className="subcell"><SampleBadge flag={route.flag} /></span></td>
                    <td><MiniSparkline values={route.sparkline} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid split-8-4 page-section-gap">
        <Card id="P2-C05" title="Lịch sử phân đoạn đã chọn" subtitle={`${selectedRoute} · Phân đoạn so với BL-AR · Tháng → Tuần → Ngày`} action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-R' })}>So sánh hãng bay</button>}>
          {routesQuery.data ? <LineChart data={routesQuery.data.selectedHistory} onSelect={(point) => onToast(`Xem chi tiết ${selectedRoute} tại ${point.period}; n=${point.n}.`)} /> : <LoadingState />}
          <div className="legend"><span className="legend-item"><span className="legend-dot" />Phân đoạn</span><span className="legend-item"><span className="legend-dot gray" />BL-AR (Tham chiếu)</span></div>
        </Card>
        <Card id="P2-C06" title="Thao tác theo ngữ cảnh" subtitle="Tiếp tục kiểm chứng, giữ nguyên lựa chọn không gian">
          <div className="selected-context">
            <span>Đường bay theo chiều đã chọn</span><strong>{selectedRoute}</strong>
            <small>Sân bay đã chọn: {selectedAirportRecord?.entity ?? 'Chưa chọn'}</small>
          </div>
          <div className="stacked-actions">
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('temporal')}>Phân tích quy luật thời gian</button>
            <button className="btn btn-secondary" type="button" onClick={() => onNavigate('prediction')}>Mở dự báo & ưu tiên</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(selectedRoute)}>Mở bằng chứng phân đoạn</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenCause(selectedRoute)}>Bối cảnh nguyên nhân ghi nhận</button>
          </div>
        </Card>
      </div>
    </section>
  )
}
