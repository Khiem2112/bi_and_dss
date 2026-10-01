import { useMemo, useState } from 'react'
import type { ComparisonContext, PredictionFilters } from '../domain/types'
import { useFutureFlights, useRiskAggregates } from '../hooks/dashboardHooks'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

const formatScheduledLocal = (value: string) => {
  const [date, timeWithZone] = value.split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} · ${timeWithZone.slice(0, 5)} local`
}

interface PredictionPageProps {
  selectedEntity: string
  onOpenComparison: (context: ComparisonContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenExplanation: (id: string) => void
  onSelectEntity: (entity: string) => void
  onOpenMethodology: () => void
  onToast: (message: string) => void
}

export function PredictionPage({ selectedEntity, onOpenComparison, onOpenEvidence, onOpenExplanation, onSelectEntity, onOpenMethodology, onToast }: PredictionPageProps) {
  const [filters, setFilters] = useState<PredictionFilters>({ window: '2019-01-01 → 2019-01-07' })
  const [selectedFlight, setSelectedFlight] = useState('WN1842-20190102')
  const [selectedAggregate, setSelectedAggregate] = useState(selectedEntity.includes('→') ? selectedEntity : 'DAL → ATL')
  const [decision, setDecision] = useState<string>()
  const flightsQuery = useFutureFlights(filters)
  const risksQuery = useRiskAggregates(filters)

  const selectedFlightRecord = useMemo(() => flightsQuery.data?.flights.find((flight) => flight.id === selectedFlight), [flightsQuery.data, selectedFlight])
  const selectedRisk = useMemo(() => risksQuery.data?.aggregates.find((item) => item.entity === selectedAggregate) ?? risksQuery.data?.aggregates[0], [risksQuery.data, selectedAggregate])

  if (flightsQuery.isError || risksQuery.isError) {
    return <ErrorState message={flightsQuery.error?.message ?? risksQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => { flightsQuery.refetch(); risksQuery.refetch() }} />
  }

  return (
    <section className="view active" aria-labelledby="prediction-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P4 · DSS review</div>
          <h1 id="prediction-title">Dự báo & ưu tiên rà soát</h1>
          <p className="page-subtitle">Probability là risk signal minh họa, không phải sự chắc chắn và không tự động tạo quyết định lịch bay.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <Card id="P4-C01" title="Prediction Context" subtitle="Model, cutoff, horizon, feature scope và trạng thái hiệu chỉnh" action={<button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Model methodology</button>}>
        <div className="model-context-grid">
          <div><span>Model version</span><strong>DEMO-RISK-v0</strong><small>Không dùng cho quyết định thật</small></div>
          <div><span>Prediction window</span><select value={filters.window} onChange={(event) => setFilters({ ...filters, window: event.target.value })}><option>2019-01-01 → 2019-01-07</option><option>2019-01-08 → 2019-01-14</option></select></div>
          <div><span>Scoring cutoff</span><strong>2018-12-31 23:59 CST</strong><small>Pre-flight fields only</small></div>
          <div><span>Validation / calibration</span><strong className="text-amber">Uncalibrated</strong><small>Priority rule bị khóa</small></div>
        </div>
        <div className="notice compact-notice"><strong>Demo only:</strong> probability và aggregate dưới đây dùng để kiểm thử layout/interaction; không phải implementation evidence cho M-07, M-08 hoặc M-09.</div>
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P4-C02" title="Future Flight List" subtitle="Future WN flight · probability minh họa" action={<button className="btn btn-secondary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenComparison({ entity: selectedFlightRecord.route, variant: 'CM-F' })}>Historical peer context</button>}>
          {flightsQuery.isLoading || !flightsQuery.data ? <LoadingState rows={6} /> : flightsQuery.data.flights.length === 0 ? <EmptyState title="Không có scored flights" detail="Xóa route filter hoặc đổi prediction window." /> : (
            <div className="table-wrap table-scroll-lg">
              <table>
                <thead><tr><th>Flight</th><th>Scheduled</th><th>Route</th><th>Probability</th><th>State</th></tr></thead>
                <tbody>
                  {flightsQuery.data.flights.map((flight) => (
                    <tr className={`selectable${selectedFlight === flight.id ? ' selected' : ''}`} key={flight.id} onClick={() => { setSelectedFlight(flight.id); setSelectedAggregate(flight.route); onSelectEntity(flight.route) }}>
                      <td className="route-name">{flight.flightNumber}<span className="subcell">{flight.modelVersion}</span></td>
                      <td>{formatScheduledLocal(flight.departureAt)}</td>
                      <td>{flight.route}</td>
                      <td><strong>{(flight.probability * 100).toFixed(0)}%</strong><span className="subcell">Illustrative</span></td>
                      <td><span className={`risk-chip ${flight.riskLabel.toLowerCase()}`}>{flight.riskLabel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenExplanation(selectedFlightRecord.id)}>Giải thích prediction</button>
            <button className="btn btn-secondary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenEvidence(selectedFlightRecord.route)}>Historical evidence</button>
          </div>
        </Card>

        <Card id="P4-C04" title="Risk by Scheduled Time" subtitle="Mean probability · không phải Actual Delay Rate">
          {risksQuery.isLoading || !risksQuery.data ? <LoadingState /> : (
            <div className="bar-list large-bars">
              {risksQuery.data.byTime.map((item) => (
                <button className="bar-row button-bar" type="button" key={item.label} onClick={() => { setFilters({ ...filters, timeBlock: item.label }); onToast(`Prediction time filter: ${item.label}.`) }}>
                  <span>{item.label}</span><span className="bar-track"><span className="bar-fill blue-fill" style={{ width: `${item.expectedRate * 2.2}%` }} /></span><strong>{item.expectedRate.toFixed(1)}%</strong><small>n={item.n}</small>
                </button>
              ))}
            </div>
          )}
          <div className="notice compact-notice"><strong>Threshold note:</strong> High-risk Share và Expected Delay Rate là hai output khác nhau.</div>
        </Card>
      </div>

      <Card id="P4-C05" title="Segment Priority Table" subtitle="Risk + historical evidence + rationale · Priority Indicator vẫn Uncalibrated" action={<button className="btn btn-secondary" type="button" onClick={() => selectedRisk && onOpenExplanation(selectedRisk.id)}>Giải thích segment</button>}>
        {risksQuery.isLoading || !risksQuery.data ? <LoadingState rows={5} /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Entity</th><th>Expected rate</th><th>High-risk share</th><th>History / Gap</th><th>Evidence</th><th>Priority</th></tr></thead>
              <tbody>
                {risksQuery.data.aggregates.map((risk) => (
                  <tr className={`selectable${selectedRisk?.id === risk.id ? ' selected' : ''}`} key={risk.id} onClick={() => { setSelectedAggregate(risk.entity); onSelectEntity(risk.entity) }}>
                    <td className="route-name">{risk.entity}<span className="subcell">{risk.type}</span></td>
                    <td>{risk.expectedRate.toFixed(1)}%<span className="subcell">scored n={risk.scoredN}</span></td>
                    <td>{risk.highRiskShare.toFixed(1)}%</td>
                    <td>{risk.historicalRate.toFixed(1)}% / +{risk.historicalGap.toFixed(1)} pp<span className="subcell">historical n={risk.historicalN.toLocaleString('vi-VN')}</span></td>
                    <td><SampleBadge flag={risk.sampleFlag} /></td>
                    <td><span className="pill uncalibrated">Locked</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P4-C06" title="Risk × Evidence" subtitle="x = Historical Gap · y = Predicted Expected Delay Rate · size = n">
          {risksQuery.data ? (
            <div className="risk-evidence-plot">
              <span className="plot-y-label">Expected risk</span><span className="plot-x-label">Historical Gap →</span>
              {risksQuery.data.aggregates.map((risk) => (
                <button
                  className={`risk-bubble${selectedRisk?.id === risk.id ? ' selected' : ''}`}
                  type="button"
                  key={risk.id}
                  style={{ left: `${Math.min(86, 10 + risk.historicalGap * 9)}%`, bottom: `${Math.min(82, 8 + (risk.expectedRate - 18) * 3.1)}%`, width: `${28 + Math.sqrt(risk.historicalN) / 5}px`, height: `${28 + Math.sqrt(risk.historicalN) / 5}px` }}
                  onClick={() => setSelectedAggregate(risk.entity)}
                  aria-label={`${risk.entity}: historical gap ${risk.historicalGap} pp, expected rate ${risk.expectedRate}%`}
                >{risk.entity.split(' ')[0]}</button>
              ))}
              <span className="plot-lock">Không tự sinh priority từ quadrant</span>
            </div>
          ) : <LoadingState />}
        </Card>
        <Card id="P4-C03" title="Risk by Geography" subtitle="Map/Table toggle · airport geography chưa xác minh" action={<IllustrativeLabel compact />}>
          <div className="geo-risk-placeholder">
            <span className="geo-orbit one" /><span className="geo-orbit two" />
            <strong>MCO · Destination</strong><b>33,8%</b><small>Expected Delay Rate · scored n=246</small>
          </div>
          <div className="notice compact-notice">Region view bị khóa tới khi DATA-GEO-01 hoàn tất. Airport table vẫn khả dụng.</div>
        </Card>
      </div>

      <div className="decision-box" data-component-id="P4-C07">
        <div>
          <span className="component-id inverted">P4-C07</span>
          <h2>Human review là bước kết thúc bắt buộc</h2>
          <p>{selectedRisk?.rationale ?? 'Chọn một segment để xem rationale.'}</p>
        </div>
        <div className="decision-actions">
          {['Review first', 'Monitor', 'Insufficient evidence'].map((value) => <button className={`btn decision-button${decision === value ? ' active' : ''}`} type="button" key={value} onClick={() => { setDecision(value); onToast(`Đã lưu note minh họa: ${value}. Không có operational action.`) }}>{value}</button>)}
        </div>
      </div>
    </section>
  )
}
