import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { DelayMetricBundle, WnAnalysisContext } from '../domain/types'
import { usePeerBenchmark } from '../hooks/dashboardHooks'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

interface CarrierComparisonModalProps {
  context: WnAnalysisContext
  onClose: () => void
  onBack?: () => void
  onOpenInvestigation: (context: WnAnalysisContext, carriers: string[], carrierScope: 'WN' | 'peer_group') => void
}

const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`
const formatCount = (value: number) => value.toLocaleString('vi-VN')

function MetricBundle({ title, metrics, accent = false }: { title: string; metrics: DelayMetricBundle; accent?: boolean }) {
  return (
    <div className={`benchmark-metric${accent ? ' accent' : ''}`} tabIndex={0} data-tooltip={metrics.unavailableReason ?? 'Bộ ba chỉ số dùng cùng tập ô đối sánh và cùng phạm vi lọc.'}>
      <span>{title}</span>
      <strong>{formatPercent(metrics.delayRate)}</strong>
      <small>Trễ {formatCount(metrics.delayedFlights)} / {formatCount(metrics.eligibleFlights)} chuyến</small>
      <small>Độ trễ đến trung bình {formatMinutes(metrics.averageArrivalDelayMinutes)}</small>
    </div>
  )
}

const intentTitle: Record<WnAnalysisContext['comparisonIntent'], string> = {
  rate: 'So sánh tỷ lệ trễ',
  trend: 'So sánh xu hướng trễ',
  airport: 'So sánh bằng chứng sân bay',
  time_pattern: 'So sánh mẫu thứ và khung giờ',
  future_history: 'So sánh lịch sử hỗ trợ dự báo',
}

const viewId: Record<WnAnalysisContext['comparisonIntent'], string> = {
  rate: 'CM-V-RATE', trend: 'CM-V-TREND', airport: 'CM-V-AIRPORT',
  time_pattern: 'CM-V-TIME', future_history: 'CM-V-FUTURE',
}

export function CarrierComparisonModal({ context, onClose, onBack, onOpenInvestigation }: CarrierComparisonModalProps) {
  const workingContext = context
  const request = useMemo(() => ({
    context: workingContext,
    maxPeers: 2 as const,
    minimumCoverageRate: 0.2,
    selectionRuleVersion: 'PEER-COVERAGE-v1-demo',
    weightingRuleVersion: 'WN-MIX-STANDARDIZATION-v1-demo',
  }), [workingContext])
  const query = usePeerBenchmark(request)
  const result = query.data
  const selectedCarriers = result?.benchmark.selectedCarriers ?? []

  return (
    <OverlayFrame
      mode="modal"
      wide
      componentId="CM-C01"
      title={`${intentTitle[workingContext.comparisonIntent]}: ${workingContext.sourceLabelVi}`}
      subtitle={`Mở từ ${workingContext.sourceComponentId} · Ảnh chụp ngữ cảnh lúc ${new Date(workingContext.openedAt).toLocaleString('vi-VN')}`}
      onClose={onClose}
      onBack={onBack}
      backLabel="Quay lại phân tích trước"
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Đóng toàn bộ</button>
          <button className="btn btn-secondary" type="button" onClick={() => onOpenInvestigation(workingContext, selectedCarriers, 'peer_group')} disabled={selectedCarriers.length === 0}>Điều tra chuyến nhóm đối sánh</button>
          <button className="btn btn-primary" type="button" onClick={() => onOpenInvestigation(workingContext, selectedCarriers, 'WN')}>Điều tra chuyến WN</button>
        </>
      }
    >
      <div className="comparison-context-strip">
        <IllustrativeLabel compact />
        <span className="context-chip" tabIndex={0} data-tooltip="Ngữ cảnh được đóng băng khi mở cửa sổ; thay đổi bộ lọc nền không tự cập nhật kết quả.">Ngữ cảnh đã đóng băng</span>
        <span className="context-chip" tabIndex={0} data-tooltip="Kết quả giữ nguyên lát cắt từ component nguồn. Tuyến chỉ được dùng bên trong để ghép các chuyến tương đương của WN và hãng đối sánh.">Bám theo ngữ cảnh nguồn</span>
        <span className="context-chip" tabIndex={0} data-tooltip="Ngưỡng độ phủ 20% chỉ phục vụ hành vi minh họa và chưa được phê duyệt cho môi trường thật.">Ngưỡng minh họa 20%</span>
      </div>

      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi tải dữ liệu đối sánh'} onRetry={query.refetch} /> : query.isLoading || !result ? <LoadingState rows={8} /> : result.status === 'insufficient_comparability' ? (
        <Card id="CM-C02" title="Chưa đủ dữ liệu đối sánh" subtitle="Không thay thế bằng 0 hoặc mức trung bình toàn mạng">
          <EmptyState title="Không có nhóm hãng đạt độ phủ" detail={result.unavailableReason ?? 'Hãy mở rộng thời gian hoặc chuyển sang điều tra các chuyến WN.'} />
          <p className="interpretation-note">Có {result.benchmark.candidateCarrierCount} hãng ứng viên; tập hãng được chọn theo độ phủ dữ liệu chung, không theo kết quả trễ.</p>
        </Card>
      ) : (
        <>
          <Card id="CM-C02" title="Tóm tắt mức tham chiếu nhóm hãng đối sánh" subtitle="Chuẩn hóa theo cơ cấu hoạt động WN trong các ô có thể so sánh">
            <div className="benchmark-summary-grid">
              <MetricBundle title="WN trong các ô chung" metrics={result.wn} accent />
              <MetricBundle title={`Bằng chứng quan sát · ${selectedCarriers.join(' + ')}`} metrics={result.peerObserved} />
              <div className="benchmark-metric benchmark-standardized">
                <span>Mức tham chiếu đã chuẩn hóa</span>
                <strong>{formatPercent(result.peerBenchmarkRate)}</strong>
                <small>Độ trễ đến TB {formatMinutes(result.peerBenchmarkAverageDelayMinutes)}</small>
                <small>Chênh lệch WN: {result.rateGap === null ? '—' : `${result.rateGap >= 0 ? '+' : ''}${formatPercent(result.rateGap)}`}</small>
              </div>
            </div>
          </Card>

          <Card id={viewId[workingContext.comparisonIntent]} title={intentTitle[workingContext.comparisonIntent]} subtitle="Cửa sổ chỉ hiển thị một hạng mục phù hợp với ý định từ thành phần nguồn">
            {workingContext.comparisonIntent === 'trend' && result.series.length > 0 ? (
              <div className="focused-trend" role="list" aria-label="Xu hướng đối sánh theo tháng">
                {result.series.map((point) => (
                  <div className="focused-trend-row" role="listitem" key={point.key} tabIndex={0} data-tooltip={`${point.label}\nWN: ${formatPercent(point.wn.delayRate)} · Trễ ${formatCount(point.wn.delayedFlights)} / ${formatCount(point.wn.eligibleFlights)} · TB ${formatMinutes(point.wn.averageArrivalDelayMinutes)}\nNhóm đối sánh: ${formatPercent(point.peerBenchmarkRate)} · Trễ ${formatCount(point.peerObserved.delayedFlights)} / ${formatCount(point.peerObserved.eligibleFlights)} · TB ${formatMinutes(point.peerBenchmarkAverageDelayMinutes)}`}>
                    <span>{point.label}</span>
                    <span className="focused-trend-track"><i style={{ width: `${Math.min(100, point.wn.delayRate ?? 0)}%` }} /><b style={{ width: `${Math.min(100, point.peerBenchmarkRate ?? 0)}%` }} /></span>
                    <strong>{formatPercent(point.wn.delayRate)} / {formatPercent(point.peerBenchmarkRate)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="focused-rate-view">
                <div className="focused-rate-bar wn" style={{ '--rate': `${Math.min(100, result.wn.delayRate ?? 0)}%` } as CSSProperties}><span>WN</span><strong>{formatPercent(result.wn.delayRate)}</strong></div>
                <div className="focused-rate-bar peer" style={{ '--rate': `${Math.min(100, result.peerBenchmarkRate ?? 0)}%` } as CSSProperties}><span>Mức tham chiếu nhóm</span><strong>{formatPercent(result.peerBenchmarkRate)}</strong></div>
                <p>{workingContext.comparisonIntent === 'future_history' ? 'Đây là lịch sử tương đồng hỗ trợ dự báo, không phải dự báo của hãng khác.' : 'So sánh mô tả chênh lệch quan sát được, không chứng minh nguyên nhân thuộc về hãng bay.'}</p>
              </div>
            )}
          </Card>

          <Card id="CM-C03" title="Cách chọn nhóm đối sánh" subtitle="Nhóm hãng và tập ô được đóng băng trong phiên phân tích này">
            <div className="peer-metadata-grid">
              <div><span>Hãng được chọn</span><strong>{selectedCarriers.join(', ')}</strong></div>
              <div><span>Hãng ứng viên</span><strong>{result.benchmark.candidateCarrierCount}</strong></div>
              <div><span>Ô có thể so sánh</span><strong>{result.benchmark.comparableCellCount}</strong></div>
              <div><span>Độ phủ WN</span><strong>{formatPercent(result.benchmark.wnCoverageRate * 100)}</strong></div>
            </div>
            {result.status === 'one_peer' && <span className="pill low" tabIndex={0} data-tooltip="Hãng thứ hai làm độ phủ nhóm thấp hơn ngưỡng minh họa nên nhóm được giảm còn một hãng.">Nhóm 1 hãng</span>}
            <p className="microcopy">Nhóm đối sánh được chọn theo độ phủ dữ liệu chung, không theo kết quả trễ. Tỷ lệ tham chiếu được chuẩn hóa theo cơ cấu hoạt động WN. Kết quả không đại diện cho trung bình toàn ngành.</p>
            <code>{result.benchmark.selectionRuleVersion} · {result.benchmark.weightingRuleVersion}</code>
          </Card>

          <Card id="CM-C04" title="Hành động tiếp theo" subtitle="Chuyển overlay để giữ một dialog đang hoạt động">
            <div className="inline-actions">
              <button className="btn btn-primary" type="button" onClick={() => onOpenInvestigation(workingContext, selectedCarriers, 'WN')}>Điều tra chuyến WN</button>
              <button className="btn btn-secondary" type="button" onClick={() => onOpenInvestigation(workingContext, selectedCarriers, 'peer_group')}>Điều tra chuyến nhóm đối sánh</button>
            </div>
          </Card>
        </>
      )}
    </OverlayFrame>
  )
}
