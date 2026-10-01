import { useState } from 'react'
import { OverlayFrame } from './OverlayFrame'

const tabs = ['KPI', 'Baseline', 'Sample', 'Model', 'Priority', 'Distance'] as const
type Tab = typeof tabs[number]

export function MethodologyModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('KPI')
  return (
    <OverlayFrame mode="modal" componentId={`MD-${tab.toUpperCase()}`} title="Methodology & Decision Safeguards" subtitle="Các định nghĩa chi phối toàn bộ dashboard" onClose={onClose} wide>
      <div className="method-tabs" role="tablist">
        {tabs.map((item) => <button className={tab === item ? 'active' : ''} type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      <div className="method-content" role="tabpanel">
        {tab === 'KPI' && <><h3>Eligible population & core KPIs</h3><ul><li>Eligible: CANCELLED = 0, DIVERTED = 0, ARR_DELAY không null.</li><li>Delayed: ARR_DELAY ≥ 15 phút.</li><li>Actual Delay Rate = Delayed / Eligible × 100.</li><li>Average Arrival Delay = AVG(ARR_DELAY) trên eligible population; không thay null bằng 0.</li></ul></>}
        {tab === 'Baseline' && <><h3>Named peer populations</h3><ul><li>BL-AR: WN peer population cùng date/time/distance context; dimension đánh giá được remove có công bố.</li><li>BL-T: các time segment còn lại trong cùng WN spatial/date context.</li><li>BL-C: WN và tối đa hai peer trên cùng directional route và comparable route–time cells.</li><li>Baseline invalid trả N/A; không fallback sang network average.</li></ul></>}
        {tab === 'Sample' && <><h3>Sample evidence</h3><p>Rate, gap, benchmark và priority luôn đi cùng n và Sample Flag. Threshold hiện chưa được phê duyệt, vì vậy demo dùng trạng thái <strong>Uncalibrated</strong>.</p><div className="notice">Baseline Gap ≥ 5 pp là materiality rule, không phải statistical significance.</div></>}
        {tab === 'Model' && <><h3>Prediction safety</h3><p>Candidate features chỉ dùng calendar, WN, airport/route, CRS_DEP_TIME, distance và time-safe historical features. Không dùng actual times, DEP_DELAY, ARR_DELAY, taxi/wheels, elapsed/air time hoặc recorded cause của chuyến cần dự báo.</p><div className="notice">DEMO-RISK-v0 chỉ là contract minh họa; chưa calibration/validation/publishing.</div></>}
        {tab === 'Priority' && <><h3>Human decision boundary</h3><p>Dashboard chỉ hỗ trợ Review first / Monitor / Insufficient evidence. Priority rule, tie handling và threshold chưa được duyệt nên label Priority bị khóa.</p></>}
        {tab === 'Distance' && <><h3>DG-BTS-250-v1</h3><p>Distance Group dẫn xuất từ DISTANCE (miles) theo các khoảng 250 miles: G01 [0,250), G02 [250,500), …, G10 [2250,2500), G11 [2500,+∞).</p></>}
      </div>
    </OverlayFrame>
  )
}
