import { useState } from 'react'
import type { ComparisonContext, GlobalFilters } from '../domain/types'
import { formatTemporalCell } from '../domain/formatters'
import { useCarrierComparison } from '../hooks/dashboardHooks'
import { MiniSparkline } from '../components/charts/MiniSparkline'
import { Card, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'

interface CarrierComparisonModalProps {
  context: ComparisonContext
  filters?: GlobalFilters
  onClose: () => void
  onOpenEvidence: (entity: string) => void
  onToast: (message: string) => void
}

export function CarrierComparisonModal({ context, filters, onClose, onOpenEvidence, onToast }: CarrierComparisonModalProps) {
  const [peer1, setPeer1] = useState('DL')
  const [peer2, setPeer2] = useState('AA')
  const query = useCarrierComparison(context, [peer1, peer2].filter(Boolean), true, filters)


  return (
    <OverlayFrame
      mode="modal"
      wide
      componentId={context.variant}
      title="So sánh hãng bay trong bối cảnh tương đương"
      subtitle={`${context.entity} · WN đối sánh tối đa 2 hãng bay khác · chỉ tính các ô tuyến bay – thời gian chung`}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" type="button" onClick={onClose}>Đóng</button><button className="btn btn-secondary" type="button" onClick={() => onOpenEvidence(context.entity)}>Mở bằng chứng phân đoạn</button><button className="btn btn-primary" type="button" onClick={() => onToast('Đã sao chép ngữ cảnh so sánh minh họa.')}>Sao chép bối cảnh</button></>}
    >
      <div className="comparison-toolbar">
        <label><span>Hãng đối sánh 1</span><select value={peer1} onChange={(event) => setPeer1(event.target.value)}><option value="DL">DL · Delta Air Lines</option><option value="AA">AA · American Airlines</option></select></label>
        <label><span>Hãng đối sánh 2</span><select value={peer2} onChange={(event) => setPeer2(event.target.value)}><option value="AA">AA · American Airlines</option><option value="DL">DL · Delta Air Lines</option><option value="">Không chọn</option></select></label>
        <label className="locked-toggle"><input type="checkbox" checked readOnly /> Chỉ ô tương đương <small>Luôn bật</small></label>
        <IllustrativeLabel />
      </div>

      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi tải dữ liệu so sánh'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={8} /> : (
        <>
          <div className="comparison-banner" data-component-id="CM-C01">
            <div><span>CM-C01 · Ngữ cảnh & Tính tương đương</span><strong>{query.data.entity} · {query.data.baselineId}</strong><small>2018-01-01 → 2018-12-31 · số ô đối sánh chung = {query.data.sharedCells} · trọng tâm WN</small></div>
            <div className="coverage-ring" style={{ '--coverage': `${query.data.coverage * 3.6}deg` } as React.CSSProperties}><strong>{query.data.coverage.toFixed(1)}%</strong><span>độ bao phủ</span></div>
          </div>

          <Card id="CM-C02" title="Thanh so sánh chỉ số KPI" subtitle="Điều kiện tính và các ô đối sánh tương đương đồng nhất cho WN và các hãng đối sánh">
            <div className="carrier-kpi-grid">
              {query.data.carriers.map((carrier) => (
                <div className={`carrier-kpi${carrier.carrier === 'WN' ? ' focus' : ''}`} key={carrier.carrier}>
                  <span>{carrier.carrier} · {carrier.name}</span><strong>{carrier.rate.toFixed(1)}%</strong>
                  <small>{carrier.delayed.toLocaleString('vi-VN')} / {carrier.eligible.toLocaleString('vi-VN')} đến trễ / đủ điều kiện</small>
                  <small>TB {carrier.averageDelay.toFixed(1)} phút · Chênh lệch so với WN {carrier.gapVsWn === null ? '—' : `${carrier.gapVsWn.toFixed(1)} điểm %`}</small>
                  <SampleBadge flag={carrier.flag} />
                </div>
              ))}
            </div>
          </Card>

          <div className="grid cols-2 page-section-gap">
            <Card id="CM-C03" title="So sánh tỷ lệ trễ có kiểm soát" subtitle="Sắp xếp theo tỷ lệ đến trễ · chỉ phản ánh tương quan quan sát được">
              <div className="bar-list large-bars">
                {[...query.data.carriers].sort((a, b) => b.rate - a.rate).map((carrier) => (
                  <div className="bar-row carrier-bar" key={carrier.carrier}><span>{carrier.carrier}</span><span className="bar-track"><span className="bar-fill" style={{ width: `${carrier.rate * 2.4}%`, background: carrier.carrier === 'WN' ? '#e11d48' : '#64748b' }} /></span><strong>{carrier.rate.toFixed(1)}%</strong><small>n={carrier.eligible.toLocaleString('vi-VN')}</small></div>
                ))}
              </div>
            </Card>
            <Card id="CM-C04" title="So sánh theo thời gian" subtitle="Chỉ trong các kỳ tương đương · Tháng → Tuần → Ngày">
              <div className="carrier-sparklines">
                {Object.entries(query.data.trend).filter(([carrier]) => query.data?.carriers.some((item) => item.carrier === carrier)).map(([carrier, points]) => (
                  <div key={carrier}><strong>{carrier}</strong><MiniSparkline values={points.map((point) => point.value)} /><span>{points[0]?.value.toFixed(1)}% → {points[points.length - 1]?.value.toFixed(1)}%</span></div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid split-7-5 page-section-gap">
            <Card id="CM-C06" title="Phân rã theo tuyến bay – thời gian" subtitle="Các ô đối sánh chung · CM-A sử dụng chế độ xem này làm chính">
              <div className="table-wrap">
                <table><thead><tr><th>Ô đối sánh tương đương</th><th>Tỷ lệ WN / n</th><th>Tỷ lệ đối thủ / n</th><th>Chênh lệch</th></tr></thead><tbody>
                  {query.data.breakdown.map((row) => <tr key={row.cell}><td className="route-name">{formatTemporalCell(row.cell)}</td><td>{row.wnRate.toFixed(1)}% / {row.wnN}</td><td>{row.peerRate.toFixed(1)}% / {row.peerN}</td><td><strong>+{(row.wnRate - row.peerRate).toFixed(1)} điểm %</strong></td></tr>)}
                </tbody></table>
              </div>
            </Card>
            <div className="stacked-cards">
              <Card id="CM-C05" title="Độ bao phủ dữ liệu tương đương" subtitle="Dữ liệu đưa vào / loại trừ">
                <div className="evidence-grid"><div className="evidence-item"><span>Đưa vào</span><strong>{query.data.includedFlights.toLocaleString('vi-VN')}</strong></div><div className="evidence-item"><span>Loại trừ</span><strong>{query.data.excludedFlights.toLocaleString('vi-VN')}</strong></div></div>
                <p className="microcopy">Loại bỏ các chuyến bay ngoài các ô tuyến bay – thời gian chung; kết quả tổng hợp luôn hiển thị độ bao phủ.</p>
              </Card>
              <Card id="CM-C07" title="Chi tiết mức tham chiếu & cỡ mẫu" subtitle="Siêu dữ liệu quy tắc">
                <div className="rule-checklist"><div className="rule-row"><span className="rule-status">ID</span>{query.data.baselineId} · ngữ cảnh tuyến bay – thời gian chung</div><div className="rule-row"><span className="rule-status no">UC</span>Ngưỡng cỡ mẫu chưa hiệu chỉnh</div></div>
              </Card>
            </div>
          </div>
          <div className="notice" data-component-id="CM-C08"><strong>CM-C08 · Diễn giải:</strong> Đây là tương quan quan sát được trong các ô đối sánh tương đương, không phải bằng chứng hãng bay gây ra trễ chuyến. Không thay thế giá trị N/A bằng trung bình toàn mạng lưới hoặc 0.</div>
        </>
      )}
    </OverlayFrame>
  )
}
