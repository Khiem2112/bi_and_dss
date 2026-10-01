import { useState } from 'react'
import type { ComparisonContext } from '../domain/types'
import { useCarrierComparison } from '../hooks/dashboardHooks'
import { MiniSparkline } from '../components/charts/MiniSparkline'
import { Card, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

interface CarrierComparisonModalProps {
  context: ComparisonContext
  onClose: () => void
  onOpenEvidence: (entity: string) => void
  onToast: (message: string) => void
}

export function CarrierComparisonModal({ context, onClose, onOpenEvidence, onToast }: CarrierComparisonModalProps) {
  const [peer1, setPeer1] = useState('DL')
  const [peer2, setPeer2] = useState('AA')
  const query = useCarrierComparison(context, [peer1, peer2].filter(Boolean))

  return (
    <OverlayFrame
      mode="modal"
      wide
      componentId={context.variant}
      title="So sánh carrier trong comparable context"
      subtitle={`${context.entity} · WN vs tối đa hai peer · shared route–time cells only`}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" type="button" onClick={onClose}>Đóng</button><button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(context.entity)}>Mở Segment Evidence</button><button className="btn btn-primary" type="button" onClick={() => onToast('Đã sao chép comparison context minh họa.')}>Sao chép context</button></>}
    >
      <div className="comparison-toolbar">
        <label><span>Peer 1</span><select value={peer1} onChange={(event) => setPeer1(event.target.value)}><option value="DL">DL · Delta Air Lines</option><option value="AA">AA · American Airlines</option></select></label>
        <label><span>Peer 2</span><select value={peer2} onChange={(event) => setPeer2(event.target.value)}><option value="AA">AA · American Airlines</option><option value="DL">DL · Delta Air Lines</option><option value="">Không chọn</option></select></label>
        <label className="locked-toggle"><input type="checkbox" checked readOnly /> Comparable-only <small>Luôn bật</small></label>
        <IllustrativeLabel />
      </div>

      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi comparison'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={8} /> : (
        <>
          <div className="comparison-banner" data-component-id="CM-C01">
            <div><span>CM-C01 · Context & Comparability</span><strong>{query.data.entity} · {query.data.baselineId}</strong><small>2018-01-01 → 2018-12-31 · shared cells = {query.data.sharedCells} · WN focus</small></div>
            <div className="coverage-ring" style={{ '--coverage': `${query.data.coverage * 3.6}deg` } as React.CSSProperties}><strong>{query.data.coverage.toFixed(1)}%</strong><span>coverage</span></div>
          </div>

          <Card id="CM-C02" title="KPI Comparison Strip" subtitle="Eligibility và comparable cells giống nhau cho WN/peers">
            <div className="carrier-kpi-grid">
              {query.data.carriers.map((carrier) => (
                <div className={`carrier-kpi${carrier.carrier === 'WN' ? ' focus' : ''}`} key={carrier.carrier}>
                  <span>{carrier.carrier} · {carrier.name}</span><strong>{carrier.rate.toFixed(1)}%</strong>
                  <small>{carrier.delayed.toLocaleString('vi-VN')} / {carrier.eligible.toLocaleString('vi-VN')} delayed/eligible</small>
                  <small>Avg {carrier.averageDelay.toFixed(1)} min · Gap vs WN {carrier.gapVsWn === null ? '—' : `${carrier.gapVsWn.toFixed(1)} pp`}</small>
                  <SampleBadge flag={carrier.flag} />
                </div>
              ))}
            </div>
          </Card>

          <div className="grid cols-2 page-section-gap">
            <Card id="CM-C03" title="Controlled Rate Comparison" subtitle="Ordered by Delay Rate · observed association only">
              <div className="bar-list large-bars">
                {[...query.data.carriers].sort((a, b) => b.rate - a.rate).map((carrier) => (
                  <div className="bar-row carrier-bar" key={carrier.carrier}><span>{carrier.carrier}</span><span className="bar-track"><span className="bar-fill" style={{ width: `${carrier.rate * 2.4}%`, background: carrier.carrier === 'WN' ? '#e11d48' : '#64748b' }} /></span><strong>{carrier.rate.toFixed(1)}%</strong><small>n={carrier.eligible.toLocaleString('vi-VN')}</small></div>
                ))}
              </div>
            </Card>
            <Card id="CM-C04" title="Comparison Over Time" subtitle="Comparable periods only · Month → Week → Date">
              <div className="carrier-sparklines">
                {Object.entries(query.data.trend).filter(([carrier]) => query.data?.carriers.some((item) => item.carrier === carrier)).map(([carrier, points]) => (
                  <div key={carrier}><strong>{carrier}</strong><MiniSparkline values={points.map((point) => point.value)} /><span>{points[0]?.value.toFixed(1)}% → {points[points.length - 1]?.value.toFixed(1)}%</span></div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid split-7-5 page-section-gap">
            <Card id="CM-C06" title="Route–Time Breakdown" subtitle="Shared cells · CM-A dùng view này làm primary">
              <div className="table-wrap">
                <table><thead><tr><th>Comparable cell</th><th>WN Rate / n</th><th>Peer Rate / n</th><th>Gap</th></tr></thead><tbody>
                  {query.data.breakdown.map((row) => <tr key={row.cell}><td className="route-name">{row.cell}</td><td>{row.wnRate.toFixed(1)}% / {row.wnN}</td><td>{row.peerRate.toFixed(1)}% / {row.peerN}</td><td><strong>+{(row.wnRate - row.peerRate).toFixed(1)} pp</strong></td></tr>)}
                </tbody></table>
              </div>
            </Card>
            <div className="stacked-cards">
              <Card id="CM-C05" title="Comparable Coverage" subtitle="Included / excluded evidence">
                <div className="evidence-grid"><div className="evidence-item"><span>Included</span><strong>{query.data.includedFlights.toLocaleString('vi-VN')}</strong></div><div className="evidence-item"><span>Excluded</span><strong>{query.data.excludedFlights.toLocaleString('vi-VN')}</strong></div></div>
                <p className="microcopy">Loại các flights ngoài shared route–time cells; aggregate luôn gắn coverage.</p>
              </Card>
              <Card id="CM-C07" title="Baseline & Sample Details" subtitle="Rule metadata">
                <div className="rule-checklist"><div className="rule-row"><span className="rule-status">ID</span>{query.data.baselineId} · shared route–time context</div><div className="rule-row"><span className="rule-status no">UC</span>Sample threshold chưa hiệu chỉnh</div></div>
              </Card>
            </div>
          </div>
          <div className="notice" data-component-id="CM-C08"><strong>CM-C08 · Interpretation:</strong> Đây là observed association trong comparable cells, không phải bằng chứng carrier gây ra delay. N/A không được thay bằng network average hoặc 0.</div>
        </>
      )}
    </OverlayFrame>
  )
}
