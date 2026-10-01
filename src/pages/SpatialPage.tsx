import { useMemo, useState } from 'react'
import type { ComparisonContext, GlobalFilters, PageId, SpatialState } from '../domain/types'
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
    onToast(`Đã chọn directional route ${route}.`)
  }

  if (airportsQuery.isError || routesQuery.isError) {
    return <ErrorState message={airportsQuery.error?.message ?? routesQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => { airportsQuery.refetch(); routesQuery.refetch() }} />
  }

  return (
    <section className="view active" aria-labelledby="spatial-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P2 · Place evidence</div>
          <h1 id="spatial-title">Sân bay & tuyến bay cần xem trước</h1>
          <p className="page-subtitle">Table là nguồn xếp hạng chính xác; map chỉ giúp định vị pattern. Directional route luôn giữ đúng chiều.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <Card id="P2-C01" title="Local Spatial Controls" subtitle="Global context được giữ nguyên; reset chỉ tác động selection cục bộ">
        <div className="control-row">
          <div className="segmented-control" aria-label="Chọn spatial grain">
            {(['destination', 'origin', 'route'] as const).map((grain) => (
              <button className={localState.grain === grain ? 'active' : ''} type="button" key={grain} onClick={() => setLocalState((state) => ({ ...state, grain }))}>
                {grain === 'destination' ? 'Destination airport' : grain === 'origin' ? 'Origin airport' : 'Directional route'}
              </button>
            ))}
          </div>
          <div className="segmented-control" aria-label="Chọn metric">
            {(['gap', 'rate'] as const).map((metric) => <button className={localState.metric === metric ? 'active' : ''} type="button" key={metric} onClick={() => setLocalState((state) => ({ ...state, metric }))}>{metric === 'gap' ? 'Baseline Gap' : 'Delay Rate'}</button>)}
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => { setSelectedAirport(undefined); setSelectedRoute('DAL → ATL') }}>Xóa local selection</button>
        </div>
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P2-C02" title="Airport Hotspot Map" subtitle={`Role: ${localState.grain === 'origin' ? 'Origin' : 'Destination'} · color = ${localState.metric === 'gap' ? 'BL-AR Gap' : 'Delay Rate'}`} action={<IllustrativeLabel compact />}>
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : (
            <AirportMap
              airports={airportsQuery.data.airports}
              selectedId={selectedAirport}
              onSelect={(airport) => {
                setSelectedAirport(airport.id)
                onSelectEntity(airport.entity)
                onToast(`${airport.entity} đã cross-filter P2-C03.`)
              }}
            />
          )}
        </Card>
        <Card id="P2-C03" title="Airport Evidence Table" subtitle="Exact comparison · BL-AR · n/Flag luôn hiển thị">
          {airportsQuery.isLoading || !airportsQuery.data ? <LoadingState rows={6} /> : airportsQuery.data.airports.length === 0 ? (
            <EmptyState title="Không có airport" detail="Không có airport phù hợp với context hiện tại." />
          ) : (
            <div className="table-wrap table-scroll">
              <table>
                <thead><tr><th>Airport / role</th><th>Rate</th><th>Gap</th><th>n</th></tr></thead>
                <tbody>
                  {airportsQuery.data.airports.map((airport) => (
                    <tr className={`selectable${selectedAirport === airport.id ? ' selected' : ''}`} key={airport.id} onClick={() => { setSelectedAirport(airport.id); onSelectEntity(airport.entity) }}>
                      <td><span className="route-name">{airport.code}</span><span className="subcell">{airport.role}</span></td>
                      <td>{airport.rate.toFixed(1)}%<span className="subcell">Avg {airport.averageDelay.toFixed(1)} min</span></td>
                      <td>{airport.gap === null ? 'N/A' : `+${airport.gap.toFixed(1)} pp`}<span className="subcell">BL {airport.baseline?.toFixed(1)}%</span></td>
                      <td>{airport.n.toLocaleString('vi-VN')}<span className="subcell">Uncalibrated</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" disabled={!selectedAirportRecord} onClick={() => selectedAirportRecord && onOpenEvidence(selectedAirportRecord.entity)}>Evidence</button>
            <button className="btn btn-secondary" type="button" disabled={!selectedAirportRecord} onClick={() => selectedAirportRecord && onOpenCause(selectedAirportRecord.entity)}>Cause context</button>
          </div>
        </Card>
      </div>

      <Card
        id="P2-C04"
        title="Route Candidate Table"
        subtitle="Directional Route · BL-AR · chưa gọi Confirmed Hotspot"
        action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-R' })}>So sánh đối thủ</button>}
      >
        {routesQuery.isLoading || !routesQuery.data ? <LoadingState rows={6} /> : routesQuery.data.routes.length === 0 ? (
          <EmptyState title="Không có route" detail="Origin/Destination filter hiện tại không có directional route trong mock response." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Directional route</th><th>Delay Rate</th><th>BL-AR / Gap</th><th>Avg Delay</th><th>Sample</th><th>6 kỳ</th></tr></thead>
              <tbody>
                {routesQuery.data.routes.map((route) => (
                  <tr className={`selectable${selectedRoute === route.route ? ' selected' : ''}`} key={route.id} onClick={() => setRoute(route.route)}>
                    <td className="route-name">{route.route}</td>
                    <td><strong>{route.rate.toFixed(1)}%</strong></td>
                    <td>{route.baseline?.toFixed(1)}% / <strong>+{route.gap?.toFixed(1)} pp</strong></td>
                    <td>{route.averageDelay.toFixed(1)} min</td>
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
        <Card id="P2-C05" title="Selected Segment History" subtitle={`${selectedRoute} · Segment vs BL-AR · Month → Week → Date`} action={<button className="btn btn-secondary" type="button" onClick={() => onOpenComparison({ entity: selectedRoute, variant: 'CM-R' })}>So sánh đối thủ</button>}>
          {routesQuery.data ? <LineChart data={routesQuery.data.selectedHistory} onSelect={(point) => onToast(`Drill ${selectedRoute} tại ${point.period}; n=${point.n}.`)} /> : <LoadingState />}
          <div className="legend"><span className="legend-item"><span className="legend-dot" />Segment</span><span className="legend-item"><span className="legend-dot gray" />BL-AR</span></div>
        </Card>
        <Card id="P2-C06" title="Context Actions" subtitle="Tiếp tục kiểm chứng, giữ spatial selection">
          <div className="selected-context">
            <span>Selected directional route</span><strong>{selectedRoute}</strong>
            <small>Airport selection: {selectedAirportRecord?.entity ?? 'Chưa chọn'}</small>
          </div>
          <div className="stacked-actions">
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('temporal')}>Phân tích quy luật thời gian</button>
            <button className="btn btn-secondary" type="button" onClick={() => onNavigate('prediction')}>Mở dự báo & ưu tiên</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(selectedRoute)}>Mở Segment Evidence</button>
            <button className="btn btn-secondary" type="button" onClick={() => onOpenCause(selectedRoute)}>Recorded cause context</button>
          </div>
        </Card>
      </div>
    </section>
  )
}
