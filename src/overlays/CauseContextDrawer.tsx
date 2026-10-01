import { useCauseContext } from '../hooks/dashboardHooks'
import { ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

export function CauseContextDrawer({ entity, onClose }: { entity: string; onClose: () => void }) {
  const query = useCauseContext(entity)
  return (
    <OverlayFrame mode="drawer" componentId="CD" title="Recorded Delay Cause Context" subtitle={`${entity} · post-event fields only`} onClose={onClose}>
      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi cause context'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={7} /> : (
        <>
          <div className="notice danger-notice"><strong>Post-event context · non-exclusive · not causal · not a predictor.</strong><br />Một delayed flight có thể có nhiều cause; tổng share không bắt buộc bằng 100%.</div>
          <div className="drawer-section">
            <div className="drawer-title-row"><h3>{query.data.entity}</h3><IllustrativeLabel compact /></div>
            <p className="microcopy">Delayed n={query.data.delayedN.toLocaleString('vi-VN')} · có recorded cause n={query.data.recordedN.toLocaleString('vi-VN')}</p>
            <div className="bar-list cause-bars">
              {query.data.causes.map((cause) => <div className="bar-row" key={cause.label}><span>{cause.label}</span><span className="bar-track"><span className="bar-fill" style={{ width: `${cause.share * 2}%` }} /></span><strong>{cause.share}%</strong><small>{cause.flights} flights</small></div>)}
            </div>
          </div>
          <div className="notice"><strong>Interpretation:</strong> các field này chỉ mô tả record sau chuyến bay; không được đưa vào pre-flight model hoặc dùng để khẳng định nguyên nhân.</div>
        </>
      )}
    </OverlayFrame>
  )
}
