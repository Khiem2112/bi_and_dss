import { usePredictionExplanation } from '../hooks/dashboardHooks'
import { ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

export function PredictionExplanationDrawer({ id, onClose, onOpenEvidence }: { id: string; onClose: () => void; onOpenEvidence: (entity: string) => void }) {
  const query = usePredictionExplanation(id)
  return (
    <OverlayFrame
      mode="drawer"
      componentId={id.startsWith('WN') ? 'PX-F' : 'PX-S'}
      title="Prediction Explanation"
      subtitle="Business-readable feature contributions · association, not causality"
      onClose={onClose}
      footer={<button className="btn btn-primary" type="button" disabled={!query.data} onClick={() => query.data && onOpenEvidence(query.data.entity.split(' · ')[0])}>Mở historical evidence</button>}
    >
      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi explanation'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={8} /> : (
        <>
          <div className="prediction-hero">
            <IllustrativeLabel />
            <span>{query.data.entity}</span>
            <strong>{(query.data.probability * 100).toFixed(1)}%</strong>
            <small>Predicted Delay Probability · DEMO-RISK-v0</small>
          </div>
          <div className="drawer-section"><h3>Contributors used by model</h3><div className="driver-list">{query.data.contributors.map((contributor) => <div className="driver" key={contributor.label}><div className="driver-top"><span>{contributor.label}</span><span className={`driver-impact ${contributor.direction}`}>{contributor.direction === 'up' ? '↑ risk' : '↓ risk'} · {contributor.strength}</span></div><div className="driver-meter"><span style={{ width: `${contributor.strength}%`, background: contributor.direction === 'up' ? '#e11d48' : '#059669' }} /></div><p>{contributor.description}</p></div>)}</div></div>
          {query.data.missingFeatures.length > 0 && <div className="notice"><strong>Missing features:</strong> {query.data.missingFeatures.join(', ')}.</div>}
          <div className="notice danger-notice"><strong>Limitation:</strong> {query.data.limitation}</div>
        </>
      )}
    </OverlayFrame>
  )
}
