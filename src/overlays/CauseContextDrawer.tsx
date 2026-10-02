import type { GlobalFilters } from '../domain/types'
import { formatCauseLabel } from '../domain/formatters'
import { useCauseContext } from '../hooks/dashboardHooks'
import { ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

export function CauseContextDrawer({ entity, filters, onClose }: { entity: string; filters?: GlobalFilters; onClose: () => void }) {
  const query = useCauseContext(entity, true, filters)
  const data = query.data

  return (
    <OverlayFrame mode="drawer" componentId="CD" title="Bối cảnh nguyên nhân trễ chuyến được ghi nhận" subtitle={`${entity} · chỉ gồm dữ liệu sau sự kiện`} onClose={onClose}>
      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi tải bối cảnh nguyên nhân'} onRetry={query.refetch} /> : query.isLoading || !data ? <LoadingState rows={7} /> : (
        <>
          <div className="notice danger-notice"><strong>Bối cảnh sau sự kiện · không loại trừ lẫn nhau · không phải nguyên nhân nhân quả · không dùng để dự báo.</strong><br />Một chuyến bay bị trễ có thể có nhiều nguyên nhân; tổng tỷ trọng không nhất thiết bằng 100%.</div>
          <div className="drawer-section">
            <div className="drawer-title-row"><h3>{data.entity}</h3><IllustrativeLabel compact /></div>
            <p className="microcopy">Tỷ lệ chuyến đến trễ {data.delayRate === null ? '—' : `${data.delayRate.toFixed(1)}%`} · chuyến đến trễ {data.delayedN.toLocaleString('vi-VN')} / {data.eligible.toLocaleString('vi-VN')} · độ trễ đến trung bình {data.averageDelay === null ? '—' : `${data.averageDelay.toFixed(1)} phút`} · có ghi nhận nguyên nhân n={data.recordedN.toLocaleString('vi-VN')}</p>
            <div className="bar-list cause-bars">
              {data.causes.map((cause) => <div className="bar-row" key={cause.label} tabIndex={0} data-tooltip-multiline data-tooltip={`${formatCauseLabel(cause.label)}\n• Tỷ lệ chuyến đến trễ của phân đoạn: ${data.delayRate === null ? '—' : `${data.delayRate.toFixed(1)}%`}\n• Số chuyến đến trễ: ${data.delayedN.toLocaleString('vi-VN')} / ${data.eligible.toLocaleString('vi-VN')}\n• Độ trễ đến trung bình: ${data.averageDelay === null ? '—' : `${data.averageDelay.toFixed(1)} phút`}`}><span>{formatCauseLabel(cause.label)}</span><span className="bar-track"><span className="bar-fill" style={{ width: `${cause.share * 2}%` }} /></span><strong>{cause.share}%</strong><small>{cause.flights} chuyến bay</small></div>)}
            </div>
          </div>
          <div className="notice"><strong>Diễn giải:</strong> các trường dữ liệu này chỉ mô tả ghi nhận sau chuyến bay; không được đưa vào mô hình dự báo trước giờ bay hoặc dùng để khẳng định nguyên nhân.</div>
        </>
      )}
    </OverlayFrame>
  )
}
