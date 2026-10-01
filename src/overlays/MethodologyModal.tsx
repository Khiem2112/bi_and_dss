import { useState } from 'react'
import { OverlayFrame } from './OverlayFrame'

const tabs = [
  { id: 'KPI', label: 'KPI' },
  { id: 'Baseline', label: 'Mức tham chiếu' },
  { id: 'Sample', label: 'Cỡ mẫu' },
  { id: 'Model', label: 'Mô hình' },
  { id: 'Priority', label: 'Mức ưu tiên' },
  { id: 'Distance', label: 'Khoảng cách' },
] as const

type TabId = typeof tabs[number]['id']

export function MethodologyModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabId>('KPI')
  return (
    <OverlayFrame mode="modal" componentId={`MD-${tab.toUpperCase()}`} title="Phương pháp luận & Rào chắn quyết định" subtitle="Các định nghĩa chuẩn mực chi phối toàn bộ dashboard" onClose={onClose} wide>
      <div className="method-tabs" role="tablist">
        {tabs.map((item) => <button className={tab === item.id ? 'active' : ''} type="button" role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      <div className="method-content" role="tabpanel">
        {tab === 'KPI' && (
          <>
            <h3>Tập hợp chuyến bay đủ điều kiện & các chỉ số KPI cốt lõi</h3>
            <ul>
              <li>Đủ điều kiện (Eligible): CANCELLED = 0, DIVERTED = 0, ARR_DELAY không rỗng (khác null).</li>
              <li>Đến trễ (Delayed): ARR_DELAY ≥ 15 phút.</li>
              <li>Tỷ lệ đến trễ thực tế = Số chuyến trễ / Số chuyến đủ điều kiện × 100.</li>
              <li>Độ trễ đến trung bình = AVG(ARR_DELAY) trên tập hợp chuyến bay đủ điều kiện; tuyệt đối không thay giá trị null bằng 0.</li>
            </ul>
          </>
        )}
        {tab === 'Baseline' && (
          <>
            <h3>Các tập hợp đối sánh được định danh</h3>
            <ul>
              <li>BL-AR: Tập hợp đối sánh của WN trong cùng ngữ cảnh ngày/thời gian/khoảng cách; chiều dữ liệu đánh giá được loại bỏ có công bố rõ ràng.</li>
              <li>BL-T: Các phân đoạn thời gian còn lại trong cùng ngữ cảnh không gian/ngày của WN.</li>
              <li>BL-C: Hãng WN và tối đa hai hãng đối sánh trên cùng đường bay theo chiều và các ô tuyến bay – thời gian tương đương.</li>
              <li>Mức tham chiếu không hợp lệ sẽ trả về N/A; không lấy giá trị trung bình toàn mạng lưới để thay thế.</li>
            </ul>
          </>
        )}
        {tab === 'Sample' && (
          <>
            <h3>Bằng chứng cỡ mẫu</h3>
            <p>Tỷ lệ trễ, khoảng chênh lệch, mức chuẩn đối sánh và mức ưu tiên luôn đi kèm với cỡ mẫu n và nhãn kiểm soát mẫu. Ngưỡng hiện chưa được phê duyệt chính thức, do đó bản demo sử dụng trạng thái <strong>Chưa hiệu chỉnh</strong>.</p>
            <div className="notice">Chênh lệch mức tham chiếu ≥ 5 điểm % là quy tắc về ý nghĩa thực tế (materiality), không phải ý nghĩa thống kê (statistical significance).</div>
          </>
        )}
        {tab === 'Model' && (
          <>
            <h3>An toàn trong dự báo</h3>
            <p>Các đặc trưng ứng viên chỉ sử dụng lịch, WN, sân bay/đường bay, CRS_DEP_TIME, khoảng cách và các đặc trưng lịch sử an toàn về mặt thời gian. Tuyệt đối không dùng thời gian thực tế, DEP_DELAY, ARR_DELAY, thời gian lăn/cất hạ cánh, thời gian bay thực tế hoặc nguyên nhân ghi nhận của chuyến bay cần dự báo.</p>
            <div className="notice">DEMO-RISK-v0 chỉ là giao ước minh họa; chưa qua hiệu chỉnh, kiểm định hoặc công bố chính thức.</div>
          </>
        )}
        {tab === 'Priority' && (
          <>
            <h3>Ranh giới quyết định của con người</h3>
            <p>Dashboard chỉ hỗ trợ: Ưu tiên xem xét / Theo dõi / Chưa đủ bằng chứng. Quy tắc ưu tiên, xử lý đồng hạng và ngưỡng kích hoạt chưa được phê duyệt nên nhãn Mức ưu tiên bị khóa.</p>
          </>
        )}
        {tab === 'Distance' && (
          <>
            <h3>DG-BTS-250-v1</h3>
            <p>Nhóm khoảng cách được dẫn xuất từ DISTANCE (dặm) theo các khoảng 250 dặm: G01 [0,250), G02 [250,500), ..., G10 [2250,2500), G11 [2500,+∞).</p>
          </>
        )}
      </div>
    </OverlayFrame>
  )
}
