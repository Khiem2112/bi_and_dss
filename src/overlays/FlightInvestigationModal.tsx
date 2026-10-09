import { useMemo, useState } from 'react'
import type {
  FlightInvestigationFilters,
  FlightRecord,
  FlightSortDirection,
  FlightSortField,
  WnAnalysisContext,
  WnAnalysisFilters,
} from '../domain/types'
import { useFlightInvestigation } from '../hooks/dashboardHooks'
import { Card, EmptyState, ErrorState, IllustrativeLabel, LoadingState } from '../components/ui/Card'
import { OverlayFrame } from './OverlayFrame'
import { formatDateDisplay, formatTimeBlock } from '../domain/formatters'

interface FlightInvestigationModalProps {
  context: WnAnalysisContext
  carrierScope: 'WN' | 'peer_group'
  frozenPeerCarriers?: string[]
  onClose: () => void
  onBack?: () => void
}

interface InvestigationSnapshot {
  sourceFilters: WnAnalysisFilters
  localFilters: FlightInvestigationFilters
}

const PAGE_SIZE = 10
const dayOptions = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const timeBlocks = [
  { value: 'Early Morning', label: 'Sáng sớm' },
  { value: 'Morning', label: 'Buổi sáng' },
  { value: 'Afternoon', label: 'Buổi chiều' },
  { value: 'Evening', label: 'Buổi tối' },
]

const sourceLabels: Record<string, string> = {
  dateFrom: 'Từ ngày', dateTo: 'Đến ngày', months: 'Tháng', dayOfWeeks: 'Thứ', scheduledTimeBlocks: 'Khung giờ',
  origin: 'Sân bay đi', destination: 'Sân bay đến', route: 'Đường bay', airport: 'Sân bay', airportRole: 'Vai trò sân bay',
  distanceGroups: 'Nhóm khoảng cách', delayedOnly: 'Chỉ chuyến trễ',
}
const localLabels: Record<string, string> = {
  fromDate: 'Từ ngày', toDate: 'Đến ngày', origin: 'Sân bay đi', destination: 'Sân bay đến', route: 'Đường bay',
  dayOfWeek: 'Thứ', scheduledTimeBlock: 'Khung giờ', distanceGroup: 'Nhóm khoảng cách', outcome: 'Trạng thái',
  flightNumber: 'Số hiệu chuyến', minimumArrivalDelay: 'Trễ đến tối thiểu', maximumArrivalDelay: 'Trễ đến tối đa',
}

const outcomeLabels: Record<string, string> = {
  all: 'Tất cả chuyến đủ điều kiện', delayed: 'Chuyến đến trễ', not_delayed: 'Chuyến không trễ',
}

const formatFilterValue = (key: string, rawValue: unknown): string => {
  const values = Array.isArray(rawValue) ? rawValue : [rawValue]
  return values.map((value) => {
    const text = String(value)
    if (key === 'dateFrom' || key === 'dateTo' || key === 'fromDate' || key === 'toDate') return formatDateDisplay(text)
    if (key === 'months') return `Tháng ${Number(value)}`
    if (key === 'scheduledTimeBlocks' || key === 'scheduledTimeBlock') return formatTimeBlock(text)
    if (key === 'airportRole') return text === 'origin' ? 'Sân bay đi' : text === 'destination' ? 'Sân bay đến' : 'Cả hai vai trò'
    if (key === 'delayedOnly') return 'Có'
    if (key === 'outcome') return outcomeLabels[text] ?? text
    if (key === 'minimumArrivalDelay' || key === 'maximumArrivalDelay') return `${text} phút`
    return text
  }).join(', ')
}

const formatClock = (value: number) => {
  const text = String(value).padStart(4, '0')
  return `${text.slice(0, 2)}:${text.slice(2)}`
}
const formatDelay = (value: number | null) => value === null ? '—' : `${value.toFixed(0)} phút`
const isDelayed = (flight: FlightRecord) => (flight.ARR_DELAY ?? 0) >= 15

const columns: Array<{ id: FlightSortField; label: string }> = [
  { id: 'flightDate', label: 'Ngày bay' },
  { id: 'carrier', label: 'Hãng' },
  { id: 'flightNumber', label: 'Số hiệu chuyến' },
  { id: 'route', label: 'Tuyến' },
  { id: 'scheduledDeparture', label: 'Giờ đi lịch' },
  { id: 'scheduledArrival', label: 'Giờ đến lịch' },
  { id: 'departureDelay', label: 'Trễ khởi hành' },
  { id: 'arrivalDelay', label: 'Trễ đến' },
  { id: 'status', label: 'Trạng thái & bộ ba chỉ số' },
  { id: 'distance', label: 'Cự ly' },
]

export function FlightInvestigationModal({ context, carrierScope, frozenPeerCarriers = [], onClose, onBack }: FlightInvestigationModalProps) {
  const initialSourceFilters = useMemo(() => ({ ...context.filters }), [context])
  const initialLocalFilters = useMemo<FlightInvestigationFilters>(() => ({ outcome: context.filters.delayedOnly ? 'delayed' : 'all' }), [context])
  const [sourceFilters, setSourceFilters] = useState<WnAnalysisFilters>(initialSourceFilters)
  const [localFilters, setLocalFilters] = useState<FlightInvestigationFilters>(initialLocalFilters)
  const [draft, setDraft] = useState<FlightInvestigationFilters>(initialLocalFilters)
  const [history, setHistory] = useState<InvestigationSnapshot[]>([])
  const [searchText, setSearchText] = useState('')
  const [sort, setSort] = useState<{ field: FlightSortField; direction: FlightSortDirection }>({ field: 'arrivalDelay', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null)

  const request = useMemo(() => ({
    context,
    sourceFilters,
    localFilters,
    searchText,
    sort,
    page,
    pageSize: PAGE_SIZE,
    carrierScope,
    frozenPeerCarriers,
  }), [carrierScope, context, frozenPeerCarriers, localFilters, page, searchText, sort, sourceFilters])
  const query = useFlightInvestigation(request)
  const totalPages = Math.max(1, Math.ceil((query.data?.totalRows ?? 0) / PAGE_SIZE))

  const pushSnapshot = () => setHistory((current) => [...current, { sourceFilters: { ...sourceFilters }, localFilters: { ...localFilters } }])
  const applyDraft = () => {
    pushSnapshot()
    setLocalFilters({ ...draft })
    setPage(1)
    setSelectedFlight(null)
  }
  const removeSourceFilter = (key: keyof WnAnalysisFilters) => {
    pushSnapshot()
    setSourceFilters((current) => ({ ...current, [key]: undefined }))
    setPage(1)
  }
  const removeLocalFilter = (key: keyof FlightInvestigationFilters) => {
    pushSnapshot()
    setLocalFilters((current) => ({ ...current, [key]: key === 'outcome' ? 'all' : undefined }))
    setDraft((current) => ({ ...current, [key]: key === 'outcome' ? 'all' : undefined }))
    setPage(1)
  }
  const goBackOneLevel = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    setSourceFilters(previous.sourceFilters)
    setLocalFilters(previous.localFilters)
    setDraft(previous.localFilters)
    setHistory((current) => current.slice(0, -1))
    setPage(1)
  }
  const resetInitial = () => {
    pushSnapshot()
    setSourceFilters(initialSourceFilters)
    setLocalFilters(initialLocalFilters)
    setDraft(initialLocalFilters)
    setSearchText('')
    setPage(1)
  }
  const changeSort = (field: FlightSortField) => {
    setSort((current) => current.field === field
      ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' })
    setPage(1)
  }

  const sourceChips = Object.entries(sourceFilters).filter(([, value]) => value !== undefined && value !== false && (!Array.isArray(value) || value.length > 0))
  const localChips = Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== '' && value !== 'all')

  return (
    <OverlayFrame
      mode="modal"
      wide
      componentId="FI-C01"
      title="Điều tra chuyến bay"
      subtitle={`Mở từ: ${context.sourceComponentId} — ${context.sourceLabelVi} · ${carrierScope === 'WN' ? 'Hãng WN' : `Nhóm ${frozenPeerCarriers.join(' + ')}`}`}
      onClose={onClose}
      onBack={onBack}
      backLabel={onBack ? 'Quay lại so sánh' : 'Quay lại phân tích trước'}
      footer={<><button className="btn btn-secondary" type="button" onClick={onClose}>Đóng toàn bộ</button><button className="btn btn-primary" type="button" onClick={resetInitial}>Đặt lại về ngữ cảnh ban đầu</button></>}
    >
      <Card id="FI-C02" title="Thanh lọc điều tra" subtitle="Áp dụng cục bộ trên ảnh chụp ngữ cảnh nguồn; mọi thay đổi cập nhật KPI và bảng">
        <div className="investigation-filter-grid">
          <label><span>Từ ngày</span><input type="date" value={draft.fromDate ?? ''} onChange={(event) => setDraft((current) => ({ ...current, fromDate: event.target.value || undefined }))} /></label>
          <label><span>Đến ngày</span><input type="date" value={draft.toDate ?? ''} onChange={(event) => setDraft((current) => ({ ...current, toDate: event.target.value || undefined }))} /></label>
          <label><span>Sân bay đi</span><input value={draft.origin ?? ''} maxLength={3} placeholder="Ví dụ: ATL" onChange={(event) => setDraft((current) => ({ ...current, origin: event.target.value.toUpperCase() || undefined }))} /></label>
          <label><span>Sân bay đến</span><input value={draft.destination ?? ''} maxLength={3} placeholder="Ví dụ: BWI" onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value.toUpperCase() || undefined }))} /></label>
          <label><span>Thứ trong tuần</span><select value={draft.dayOfWeek ?? ''} onChange={(event) => setDraft((current) => ({ ...current, dayOfWeek: event.target.value || undefined }))}><option value="">Tất cả</option>{dayOptions.map((day) => <option key={day}>{day}</option>)}</select></label>
          <label><span>Khung giờ kế hoạch</span><select value={draft.scheduledTimeBlock ?? ''} onChange={(event) => setDraft((current) => ({ ...current, scheduledTimeBlock: event.target.value || undefined }))}><option value="">Tất cả</option>{timeBlocks.map((block) => <option key={block.value} value={block.value}>{block.label}</option>)}</select></label>
          <label><span>Trạng thái</span><select value={draft.outcome ?? 'all'} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value as FlightInvestigationFilters['outcome'] }))}><option value="all">Tất cả chuyến đủ điều kiện</option><option value="delayed">Chuyến đến trễ</option><option value="not_delayed">Chuyến không trễ</option></select></label>
          <label><span>Số hiệu chuyến</span><input value={draft.flightNumber ?? ''} inputMode="numeric" onChange={(event) => setDraft((current) => ({ ...current, flightNumber: event.target.value || undefined }))} /></label>
          <label><span>Phút trễ đến tối thiểu</span><input type="number" value={draft.minimumArrivalDelay ?? ''} onChange={(event) => setDraft((current) => ({ ...current, minimumArrivalDelay: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label>
          <label><span>Phút trễ đến tối đa</span><input type="number" value={draft.maximumArrivalDelay ?? ''} onChange={(event) => setDraft((current) => ({ ...current, maximumArrivalDelay: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label>
        </div>
        <div className="inline-actions"><button className="btn btn-primary" type="button" onClick={applyDraft}>Áp dụng bộ lọc điều tra</button><button className="btn btn-secondary" type="button" onClick={() => setDraft({ outcome: 'all' })}>Xóa bản nháp</button></div>
      </Card>

      <Card id="FI-C03" title="Điều kiện đang áp dụng và lịch sử mở rộng" subtitle="Thẻ đỏ lấy từ nguồn; thẻ xanh được thêm trong điều tra">
        <div className="investigation-context-compact">
          <div className="investigation-history-actions">
            <button className="btn btn-secondary btn--xs" type="button" disabled={history.length === 0} onClick={goBackOneLevel}>Quay lại ({history.length})</button>
            <button className="btn btn-ghost btn--xs" type="button" disabled={localChips.length === 0} onClick={() => { pushSnapshot(); setLocalFilters({ outcome: 'all' }); setDraft({ outcome: 'all' }); setPage(1) }}>Xóa điều kiện thêm</button>
          </div>
          <div className="filter-chip-groups compact">
            <div className="compact-filter-group">
              <div className="compact-filter-group-title"><span className="filter-origin-dot source" aria-hidden="true" /><strong>Nguồn</strong><small>{sourceChips.length}</small></div>
              <div className="filter-chips">{sourceChips.map(([key, value]) => {
                const displayValue = formatFilterValue(key, value)
                return <button className="filter-chip source" type="button" key={key} onClick={() => removeSourceFilter(key as keyof WnAnalysisFilters)} data-tooltip="Điều kiện từ thành phần nguồn. Chọn để bỏ điều kiện này và mở rộng phạm vi." aria-label={`Bỏ điều kiện nguồn ${sourceLabels[key] ?? key}: ${displayValue}`}><span className="filter-chip-label">{sourceLabels[key] ?? key}</span><span className="filter-chip-value">{displayValue}</span><span className="filter-chip-remove" aria-hidden="true">×</span></button>
              })}</div>
            </div>
            <div className="compact-filter-group">
              <div className="compact-filter-group-title"><span className="filter-origin-dot local" aria-hidden="true" /><strong>Đã thêm</strong><small>{localChips.length}</small></div>
              <div className="filter-chips">{localChips.length ? localChips.map(([key, value]) => {
                const displayValue = formatFilterValue(key, value)
                return <button className="filter-chip local" type="button" key={key} onClick={() => removeLocalFilter(key as keyof FlightInvestigationFilters)} data-tooltip="Điều kiện thêm trong điều tra. Chọn để xóa đúng điều kiện này." aria-label={`Bỏ điều kiện đã thêm ${localLabels[key] ?? key}: ${displayValue}`}><span className="filter-chip-label">{localLabels[key] ?? key}</span><span className="filter-chip-value">{displayValue}</span><span className="filter-chip-remove" aria-hidden="true">×</span></button>
              }) : <span className="muted-copy">Không có</span>}</div>
            </div>
          </div>
        </div>
      </Card>

      {query.isError ? <ErrorState message={query.error?.message ?? 'Lỗi tải bản ghi chuyến bay'} onRetry={query.refetch} /> : query.isLoading || !query.data ? <LoadingState rows={10} /> : (
        <>
          <Card id="FI-C04" title="Tóm tắt tập kết quả" subtitle="Bộ ba chỉ số tính trên toàn bộ bản ghi sau bộ lọc, trước tìm kiếm và phân trang">
            <div className="investigation-summary-grid">
              <div><span>Tỷ lệ chuyến đến trễ</span><strong>{query.data.metrics.delayRate === null ? '—' : `${query.data.metrics.delayRate.toFixed(1).replace('.', ',')}%`}</strong></div>
              <div><span>Số chuyến đến trễ</span><strong>{query.data.metrics.delayedFlights.toLocaleString('vi-VN')} / {query.data.metrics.eligibleFlights.toLocaleString('vi-VN')}</strong></div>
              <div><span>Độ trễ đến trung bình</span><strong>{query.data.metrics.averageArrivalDelayMinutes === null ? '—' : `${query.data.metrics.averageArrivalDelayMinutes.toFixed(1).replace('.', ',')} phút`}</strong></div>
              <div><span>Bản ghi mẫu đang có</span><strong>{query.data.filteredRecordCount.toLocaleString('vi-VN')}</strong><small>Ước tính quần thể minh họa: {query.data.estimatedPopulationRows.toLocaleString('vi-VN')}</small></div>
            </div>
            <div className="inline-badges"><IllustrativeLabel compact /><span className="pill uncalibrated" tabIndex={0} data-tooltip="Số đếm tổng hợp dùng hệ số mẫu 25; bảng không nhân bản ghi.">Hệ số mẫu ×{query.data.countScale}</span></div>
          </Card>

          <Card id="FI-C05" title="Bảng chuyến bay" subtitle="Tìm kiếm toàn bộ cột trên toàn tập sau bộ lọc; sắp xếp trước phân trang">
            <div className="table-toolbar">
              <label className="table-search-label"><span>Tìm kiếm trong bảng</span><input className="table-search" type="search" value={searchText} onChange={(event) => { setSearchText(event.target.value); setPage(1) }} placeholder="Tìm ngày, hãng, số hiệu, tuyến, giờ, số phút, trạng thái hoặc cự ly" /></label>
              {searchText && <button className="btn btn-ghost btn--xs" type="button" onClick={() => { setSearchText(''); setPage(1) }}>Xóa nội dung tìm kiếm</button>}
              <span className="table-result-count" role="status" aria-live="polite">{query.data.totalRows.toLocaleString('vi-VN')} kết quả</span>
            </div>
            {query.data.rows.length === 0 ? <EmptyState title={searchText ? 'Không có kết quả phù hợp' : 'Không có dữ liệu theo điều kiện hiện tại'} detail={searchText ? `Không có bản ghi khớp “${searchText}”. Bộ lọc điều tra vẫn được giữ nguyên.` : 'Hãy bỏ một nhãn điều kiện hoặc mở rộng phạm vi.'} action={searchText ? <button className="btn btn-secondary" type="button" onClick={() => setSearchText('')}>Xóa nội dung tìm kiếm</button> : undefined} /> : (
              <div className="table-wrap flight-table-wrap"><table aria-label="Bảng điều tra chuyến bay"><thead><tr>{columns.map((column) => <th key={column.id} scope="col" aria-sort={sort.field === column.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="table-sort-button" type="button" onClick={() => changeSort(column.id)}><span>{column.label}</span><span className="sort-icon" aria-hidden="true">{sort.field === column.id ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span></button></th>)}</tr></thead><tbody>{query.data.rows.map((flight) => {
                const delayed = isDelayed(flight)
                const rowId = `${flight.FL_DATE}-${flight.OP_CARRIER}-${flight.OP_CARRIER_FL_NUM}-${flight.CRS_DEP_TIME}`
                const oneFlightRate = delayed ? 100 : 0
                return <tr key={rowId} className={selectedFlight === flight ? 'selected' : ''} tabIndex={0} onClick={() => setSelectedFlight(flight)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedFlight(flight) } }}>
                  <td>{new Date(`${flight.FL_DATE}T00:00:00`).toLocaleDateString('vi-VN')}</td><td>{flight.OP_CARRIER}</td><td>{flight.OP_CARRIER_FL_NUM}</td><td>{flight.ORIGIN} → {flight.DEST}</td><td>{formatClock(flight.CRS_DEP_TIME)}</td><td>{formatClock(flight.CRS_ARR_TIME)}</td><td>{formatDelay(flight.DEP_DELAY)}</td><td>{formatDelay(flight.ARR_DELAY)}</td><td><span className={`status-text ${delayed ? 'delayed' : 'on-time'}`}>{delayed ? 'Đến trễ' : 'Không trễ'}</span><span className="subcell">Kết quả của 1 chuyến · Tỷ lệ {oneFlightRate}% · Trễ {delayed ? 1 : 0}/1 · TB {formatDelay(flight.ARR_DELAY)}</span></td><td>{flight.DISTANCE.toLocaleString('vi-VN')} dặm</td>
                </tr>
              })}</tbody></table></div>
            )}
            <div className="pagination"><button className="btn btn-secondary btn--xs" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trang trước</button><span>Trang {page} / {totalPages}</span><button className="btn btn-secondary btn--xs" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Trang sau</button></div>
          </Card>

          {selectedFlight && <Card id="FI-C06" title="Chi tiết chuyến được chọn" subtitle={`${selectedFlight.OP_CARRIER}${selectedFlight.OP_CARRIER_FL_NUM} · ${selectedFlight.ORIGIN} → ${selectedFlight.DEST}`}><div className="flight-detail-grid"><div><span>Ngày bay</span><strong>{new Date(`${selectedFlight.FL_DATE}T00:00:00`).toLocaleDateString('vi-VN')}</strong></div><div><span>Độ trễ đến</span><strong>{formatDelay(selectedFlight.ARR_DELAY)}</strong></div><div><span>Thời gian trên không</span><strong>{formatDelay(selectedFlight.AIR_TIME)}</strong></div><div><span>Bối cảnh nguyên nhân ghi nhận</span><strong>{selectedFlight.CARRIER_DELAY ?? 0} phút do hãng · {selectedFlight.WEATHER_DELAY ?? 0} phút thời tiết</strong></div></div><p className="microcopy">Các trường nguyên nhân chỉ mô tả sau chuyến, không chứng minh quan hệ nhân quả và không dùng làm biến dự báo biết trước.</p></Card>}
        </>
      )}
    </OverlayFrame>
  )
}
