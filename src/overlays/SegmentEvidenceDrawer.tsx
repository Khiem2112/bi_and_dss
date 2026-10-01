import type { GlobalFilters } from '../domain/types'
import { useSegmentEvidence } from '../hooks/dashboardHooks'
import { ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

interface SegmentEvidenceDrawerProps {
  entity: string
  filters?: GlobalFilters
  onClose: () => void
  onOpenComparison: () => void
  onOpenCause: () => void
  onToast: (message: string) => void
}

export function SegmentEvidenceDrawer({ entity, filters, onClose, onOpenComparison, onOpenCause, onToast }: SegmentEvidenceDrawerProps) {
  const query = useSegmentEvidence(entity, true, filters)

  return (
    <OverlayFrame
      mode="drawer"
      componentId="SD"
      title="Bằng chứng phân đoạn"
      subtitle={`${entity} · danh mục kiểm tra lịch sử, mức tham chiếu, cỡ mẫu, rủi ro và quyết định`}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" type="button" onClick={onOpenComparison}>So sánh hãng bay</button><button className="btn btn-secondary" type="button" onClick={onOpenCause}>Bối cảnh nguyên nhân</button><button className="btn btn-primary" type="button" onClick={() => onToast('Đã lưu ghi chú bằng chứng minh họa.')}>Lưu ghi chú</button></>}
    >
      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi tải bằng chứng'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={8} /> : (
        <>
          <div className="drawer-hero"><IllustrativeLabel /><span>Đường bay theo chiều / đối tượng đã chọn</span><h3>{query.data.entity}</h3><p>Ranh giới đánh giá bởi con người · không phát lệnh vận hành</p></div>
          <div className="evidence-grid drawer-evidence">
            <div className="evidence-item"><span>Tỷ lệ đến trễ thực tế</span><strong>{query.data.historicalRate.toFixed(1)}%</strong><small>{query.data.delayed} / {query.data.eligible} đến trễ / đủ điều kiện</small></div>
            <div className="evidence-item"><span>BL-AR / Chênh lệch</span><strong>{query.data.baselineRate.toFixed(1)}% / +{query.data.gap.toFixed(1)} điểm %</strong><small>Ý nghĩa thực tế khác ý nghĩa thống kê</small></div>
            <div className="evidence-item"><span>Độ trễ đến trung bình</span><strong>{query.data.averageDelay.toFixed(1)} phút</strong><small>Chỉ áp dụng tập chuyến bay đủ điều kiện</small></div>
            <div className="evidence-item"><span>Tỷ lệ trễ dự kiến từ mô hình</span><strong>{query.data.predictedRisk?.toFixed(1) ?? 'N/A'}%</strong><small>Minh họa / chưa hiệu chỉnh</small></div>
          </div>
          <div className="drawer-section"><h3>Độ đầy đủ của bằng chứng</h3><SampleBadge flag={query.data.sampleFlag} /><div className="rule-checklist page-section-gap">{query.data.checks.map((check) => <div className="rule-row" key={check.label}><span className={`rule-status${check.status === 'pending' ? ' no' : ''}`}>{check.status === 'available' ? 'Có' : 'Chờ'}</span>{check.label}</div>)}</div></div>
          <div className="notice"><strong>Diễn giải được phép:</strong> phân đoạn có chênh lệch lịch sử cần kiểm tra thêm. Không gọi là Điểm nóng xác nhận hoặc Ưu tiên xử lý cho đến khi các quy tắc về cỡ mẫu/mô hình/mức ưu tiên được phê duyệt.</div>
        </>
      )}
    </OverlayFrame>
  )
}
