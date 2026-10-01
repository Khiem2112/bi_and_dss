import { useMemo, useState } from 'react'
import type { ComparisonContext, GlobalFilters, PredictionFilters } from '../domain/types'
import { formatDecision, formatEntityType, formatRiskLabel, formatTimeBlock } from '../domain/formatters'
import { useFutureFlights, useRiskAggregates } from '../hooks/dashboardHooks'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState, SampleBadge } from '../components/ui/Card'

const formatScheduledLocal = (value: string) => {
  const [date, timeWithZone] = value.split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} · ${timeWithZone.slice(0, 5)} (giờ địa phương)`
}

interface PredictionPageProps {
  selectedEntity: string
  globalFilters?: GlobalFilters
  onOpenComparison: (context: ComparisonContext) => void
  onOpenEvidence: (entity: string) => void
  onOpenExplanation: (id: string) => void
  onSelectEntity: (entity: string) => void
  onOpenMethodology: () => void
  onToast: (message: string) => void
}

export function PredictionPage({ selectedEntity, globalFilters, onOpenComparison, onOpenEvidence, onOpenExplanation, onSelectEntity, onOpenMethodology, onToast }: PredictionPageProps) {
  const [filters, setFilters] = useState<PredictionFilters>({ window: '2019-01-01 → 2019-01-07' })
  const [selectedFlight, setSelectedFlight] = useState('WN1842-20190102')
  const [selectedAggregate, setSelectedAggregate] = useState(selectedEntity.includes('→') ? selectedEntity : 'DAL → ATL')
  const [decision, setDecision] = useState<string>()
  const flightsQuery = useFutureFlights(filters, globalFilters)
  const risksQuery = useRiskAggregates(filters, globalFilters)


  const selectedFlightRecord = useMemo(() => flightsQuery.data?.flights.find((flight) => flight.id === selectedFlight), [flightsQuery.data, selectedFlight])
  const selectedRisk = useMemo(() => risksQuery.data?.aggregates.find((item) => item.entity === selectedAggregate) ?? risksQuery.data?.aggregates[0], [risksQuery.data, selectedAggregate])

  if (flightsQuery.isError || risksQuery.isError) {
    return <ErrorState message={flightsQuery.error?.message ?? risksQuery.error?.message ?? 'Lỗi không xác định'} onRetry={() => { flightsQuery.refetch(); risksQuery.refetch() }} />
  }

  return (
    <section className="view active" aria-labelledby="prediction-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">P4 · Đánh giá DSS</div>
          <h1 id="prediction-title">Dự báo & ưu tiên rà soát</h1>
          <p className="page-subtitle">Xác suất là tín hiệu rủi ro minh họa, không phải khẳng định chắc chắn và không tự động đưa ra quyết định lịch bay.</p>
        </div>
        <IllustrativeLabel />
      </div>

      <Card id="P4-C01" title="Bối cảnh dự báo" subtitle="Mô hình, thời điểm chốt, tầm dự báo, phạm vi đặc trưng và trạng thái hiệu chỉnh" action={<button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Phương pháp mô hình</button>}>
        <div className="model-context-grid">
          <div><span>Phiên bản mô hình</span><strong>DEMO-RISK-v0</strong><small>Không dùng cho quyết định thật</small></div>
          <div><span>Khung thời gian dự báo</span><select value={filters.window} onChange={(event) => setFilters({ ...filters, window: event.target.value })}><option>2019-01-01 → 2019-01-07</option><option>2019-01-08 → 2019-01-14</option></select></div>
          <div><span>Thời điểm chốt tính điểm</span><strong>2018-12-31 23:59 CST</strong><small>Chỉ dùng dữ liệu trước chuyến bay</small></div>
          <div><span>Kiểm định / Hiệu chỉnh</span><strong className="text-amber">Chưa hiệu chỉnh</strong><small>Quy tắc ưu tiên bị khóa</small></div>
        </div>
        <div className="notice compact-notice"><strong>Chỉ dành cho demo:</strong> xác suất và dữ liệu tổng hợp dưới đây dùng để kiểm thử bố cục/tương tác; không phải bằng chứng triển khai cho M-07, M-08 hoặc M-09.</div>
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P4-C02" title="Danh sách chuyến bay tương lai" subtitle="Chuyến bay tương lai của WN · Xác suất minh họa" action={<button className="btn btn-secondary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenComparison({ entity: selectedFlightRecord.route, variant: 'CM-F' })}>Bối cảnh đối sánh lịch sử</button>}>
          {flightsQuery.isLoading || !flightsQuery.data ? <LoadingState rows={6} /> : flightsQuery.data.flights.length === 0 ? <EmptyState title="Không có chuyến bay đã chấm điểm" detail="Hãy xóa bộ lọc đường bay hoặc đổi khung thời gian dự báo." /> : (
            <div className="table-wrap table-scroll-lg">
              <table>
                <thead><tr><th>Chuyến bay</th><th>Giờ kế hoạch</th><th>Đường bay</th><th>Xác suất</th><th>Mức rủi ro</th></tr></thead>
                <tbody>
                  {flightsQuery.data.flights.map((flight) => (
                    <tr className={`selectable${selectedFlight === flight.id ? ' selected' : ''}`} key={flight.id} onClick={() => { setSelectedFlight(flight.id); setSelectedAggregate(flight.route); onSelectEntity(flight.route) }}>
                      <td className="route-name">{flight.flightNumber}<span className="subcell">{flight.modelVersion}</span></td>
                      <td>{formatScheduledLocal(flight.departureAt)}</td>
                      <td>{flight.route}</td>
                      <td><strong>{(flight.probability * 100).toFixed(0)}%</strong><span className="subcell">Minh họa</span></td>
                      <td><span className={`risk-chip ${flight.riskLabel.toLowerCase()}`}>{formatRiskLabel(flight.riskLabel)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="inline-actions">
            <button className="btn btn-primary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenExplanation(selectedFlightRecord.id)}>Giải thích dự báo</button>
            <button className="btn btn-secondary" type="button" disabled={!selectedFlightRecord} onClick={() => selectedFlightRecord && onOpenEvidence(selectedFlightRecord.route)}>Bằng chứng lịch sử</button>
          </div>
        </Card>

        <Card id="P4-C04" title="Rủi ro theo khung giờ kế hoạch" subtitle="Xác suất trung bình · không phải tỷ lệ đến trễ thực tế">
          {risksQuery.isLoading || !risksQuery.data ? <LoadingState /> : (
            <div className="bar-list large-bars">
              {risksQuery.data.byTime.map((item) => (
                <button className="bar-row button-bar" type="button" key={item.label} onClick={() => { setFilters({ ...filters, timeBlock: item.label }); onToast(`Bộ lọc thời gian dự báo: ${formatTimeBlock(item.label)}.`) }}>
                  <span>{formatTimeBlock(item.label)}</span><span className="bar-track"><span className="bar-fill blue-fill" style={{ width: `${item.expectedRate * 2.2}%` }} /></span><strong>{item.expectedRate.toFixed(1)}%</strong><small>n={item.n}</small>
                </button>
              ))}
            </div>
          )}
          <div className="notice compact-notice"><strong>Lưu ý về ngưỡng:</strong> Tỷ trọng rủi ro cao (High-risk Share) và Tỷ lệ trễ dự kiến (Expected Delay Rate) là hai đầu ra khác nhau.</div>
        </Card>
      </div>

      <Card id="P4-C05" title="Bảng ưu tiên phân đoạn" subtitle="Rủi ro + bằng chứng lịch sử + giải trình · Chỉ số ưu tiên vẫn ở trạng thái Chưa hiệu chỉnh" action={<button className="btn btn-secondary" type="button" onClick={() => selectedRisk && onOpenExplanation(selectedRisk.id)}>Giải thích phân đoạn</button>}>
        {risksQuery.isLoading || !risksQuery.data ? <LoadingState rows={5} /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Đối tượng</th><th>Tỷ lệ dự kiến</th><th>Tỷ trọng rủi ro cao</th><th>Lịch sử / Chênh lệch</th><th>Bằng chứng</th><th>Mức ưu tiên</th></tr></thead>
              <tbody>
                {risksQuery.data.aggregates.map((risk) => (
                  <tr className={`selectable${selectedRisk?.id === risk.id ? ' selected' : ''}`} key={risk.id} onClick={() => { setSelectedAggregate(risk.entity); onSelectEntity(risk.entity) }}>
                    <td className="route-name">{risk.entity}<span className="subcell">{formatEntityType(risk.type)}</span></td>
                    <td>{risk.expectedRate.toFixed(1)}%<span className="subcell">đã chấm điểm n={risk.scoredN}</span></td>
                    <td>{risk.highRiskShare.toFixed(1)}%</td>
                    <td>{risk.historicalRate.toFixed(1)}% / +{risk.historicalGap.toFixed(1)}%<span className="subcell">lịch sử n={risk.historicalN.toLocaleString('vi-VN')}</span></td>
                    <td><SampleBadge flag={risk.sampleFlag} /></td>
                    <td><span className="pill uncalibrated">Đã khóa</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid split-7-5 page-section-gap">
        <Card id="P4-C06" title="Rủi ro × Bằng chứng" subtitle="Trục hoành = Chênh lệch lịch sử · Trục tung = Tỷ lệ trễ dự kiến · Kích thước = cỡ mẫu n">
          {risksQuery.data ? (
            <div className="risk-evidence-plot">
              <span className="plot-y-label">Rủi ro dự kiến</span><span className="plot-x-label">Chênh lệch lịch sử →</span>
              {risksQuery.data.aggregates.map((risk) => (
                <button
                  className={`risk-bubble${selectedRisk?.id === risk.id ? ' selected' : ''}`}
                  type="button"
                  key={risk.id}
                  style={{ left: `${Math.min(86, 10 + risk.historicalGap * 9)}%`, bottom: `${Math.min(82, 8 + (risk.expectedRate - 18) * 3.1)}%`, width: `${28 + Math.sqrt(risk.historicalN) / 5}px`, height: `${28 + Math.sqrt(risk.historicalN) / 5}px` }}
                  onClick={() => setSelectedAggregate(risk.entity)}
                  aria-label={`${risk.entity}: chênh lệch lịch sử ${risk.historicalGap}%, tỷ lệ dự kiến ${risk.expectedRate}%`}
                >{risk.entity.split(' ')[0]}</button>
              ))}
              <span className="plot-lock">Không tự sinh mức ưu tiên từ các góc phần tư</span>
            </div>
          ) : <LoadingState />}
        </Card>
        <Card id="P4-C03" title="Rủi ro theo địa lý" subtitle="Chuyển đổi Bản đồ/Bảng · Dữ liệu địa lý sân bay chưa được xác minh" action={<IllustrativeLabel compact />}>
          <div className="geo-risk-placeholder">
            <span className="geo-orbit one" /><span className="geo-orbit two" />
            <strong>MCO · Sân bay đến</strong><b>33,8%</b><small>Tỷ lệ trễ dự kiến · n đã chấm điểm = 246</small>
          </div>
          <div className="notice compact-notice">Chế độ xem theo vùng bị khóa cho đến khi hoàn tất DATA-GEO-01. Bảng dữ liệu sân bay vẫn khả dụng.</div>
        </Card>
      </div>

      <div className="decision-box" data-component-id="P4-C07">
        <div>
          <span className="component-id inverted">P4-C07</span>
          <h2>Đánh giá bởi con người là bước kết thúc bắt buộc</h2>
          <p>{selectedRisk?.rationale ?? 'Chọn một phân đoạn để xem giải trình cơ sở.'}</p>
        </div>
        <div className="decision-actions">
          {['Review first', 'Monitor', 'Insufficient evidence'].map((value) => (
            <button
              className={`btn decision-button${decision === value ? ' active' : ''}`}
              type="button"
              key={value}
              onClick={() => {
                setDecision(value)
                onToast(`Đã lưu ghi chú minh họa: ${formatDecision(value)}. Không có lệnh vận hành nào được phát đi.`)
              }}
            >
              {formatDecision(value)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
