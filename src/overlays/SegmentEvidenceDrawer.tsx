import { useSegmentEvidence } from '../hooks/dashboardHooks'
import { ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

interface SegmentEvidenceDrawerProps {
  entity: string
  onClose: () => void
  onOpenComparison: () => void
  onOpenCause: () => void
  onToast: (message: string) => void
}

export function SegmentEvidenceDrawer({ entity, onClose, onOpenComparison, onOpenCause, onToast }: SegmentEvidenceDrawerProps) {
  const query = useSegmentEvidence(entity)
  return (
    <OverlayFrame
      mode="drawer"
      componentId="SD"
      title="Segment Evidence"
      subtitle={`${entity} · historical, baseline, sample, risk và decision checklist`}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" type="button" onClick={onOpenComparison}>Carrier comparison</button><button className="btn btn-secondary" type="button" onClick={onOpenCause}>Cause context</button><button className="btn btn-primary" type="button" onClick={() => onToast('Đã lưu evidence note minh họa.')}>Lưu note</button></>}
    >
      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi evidence'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={8} /> : (
        <>
          <div className="drawer-hero"><IllustrativeLabel /><span>Directional route / selected entity</span><h3>{query.data.entity}</h3><p>Human review boundary · không phát lệnh vận hành</p></div>
          <div className="evidence-grid drawer-evidence">
            <div className="evidence-item"><span>Actual Delay Rate</span><strong>{query.data.historicalRate.toFixed(1)}%</strong><small>{query.data.delayed} / {query.data.eligible} delayed/eligible</small></div>
            <div className="evidence-item"><span>BL-AR / Gap</span><strong>{query.data.baselineRate.toFixed(1)}% / +{query.data.gap.toFixed(1)} pp</strong><small>Materiality ≠ significance</small></div>
            <div className="evidence-item"><span>Average Arrival Delay</span><strong>{query.data.averageDelay.toFixed(1)} min</strong><small>Eligible population only</small></div>
            <div className="evidence-item"><span>Predicted Expected Rate</span><strong>{query.data.predictedRisk?.toFixed(1) ?? 'N/A'}%</strong><small>Illustrative / uncalibrated</small></div>
          </div>
          <div className="drawer-section"><h3>Evidence sufficiency</h3><SampleBadge flag={query.data.sampleFlag} /><div className="rule-checklist page-section-gap">{query.data.checks.map((check) => <div className="rule-row" key={check.label}><span className={`rule-status${check.status === 'pending' ? ' no' : ''}`}>{check.status === 'available' ? 'Có' : 'Chờ'}</span>{check.label}</div>)}</div></div>
          <div className="notice"><strong>Allowed interpretation:</strong> segment có historical gap cần kiểm tra thêm. Không gọi Confirmed Hotspot hoặc Priority cho đến khi sample/model/priority rule được duyệt.</div>
        </>
      )}
    </OverlayFrame>
  )
}
