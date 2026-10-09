import { useEffect, useMemo, useState } from 'react'
import { defaultFilters, type GlobalFilters } from '../../domain/types'
import { DatePicker } from '../atoms/DatePicker/DatePicker'
import { formatDateDisplay } from '../../domain/formatters'
import { MultiSelectCombobox, type MultiSelectItem } from '../atoms/Combobox/MultiSelectCombobox'
import { ComponentHelpButton } from '../ui/ComponentHelpButton'
import { AirportClauseBuilder } from './AirportClauseBuilder'
import { AIRPORT_OPTIONS } from './airportOptions'
import { DistanceFilterBuilder } from './DistanceFilterBuilder'

interface GlobalFilterBarProps {
  filters: GlobalFilters
  onApply: (filters: GlobalFilters) => void
}

const SEASON_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'Winter', label: 'Mùa đông', subLabel: 'Tháng 1–3' },
  { value: 'Spring', label: 'Mùa xuân', subLabel: 'Tháng 4–6' },
  { value: 'Summer', label: 'Mùa hè', subLabel: 'Tháng 7–9' },
  { value: 'Autumn', label: 'Mùa thu', subLabel: 'Tháng 10–12' },
]

const DAY_OPTIONS: readonly MultiSelectItem[] = [
  'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật',
].map((value) => ({ value, label: value }))

const TIME_BLOCK_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'Early Morning', label: 'Sáng sớm', subLabel: 'Trước 06:00' },
  { value: 'Morning', label: 'Buổi sáng', subLabel: '06:00–11:59' },
  { value: 'Afternoon', label: 'Buổi chiều', subLabel: '12:00–17:59' },
  { value: 'Evening', label: 'Buổi tối', subLabel: 'Từ 18:00' },
]

export function GlobalFilterBar({ filters, onApply }: GlobalFilterBarProps) {
  const [draft, setDraft] = useState(filters)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => setDraft(filters), [filters])

  const activeCount = useMemo(() => [
    filters.airportClauses.length > 0,
    (Array.isArray(filters.season) ? filters.season.length > 0 : Boolean(filters.season && filters.season !== 'all')),
    filters.dayOfWeek.length > 0,
    filters.scheduledTimeBlock.length > 0,
    Boolean(filters.distanceFilter),
  ].filter(Boolean).length, [filters])

  const update = <K extends keyof GlobalFilters>(field: K, value: GlobalFilters[K]) =>
    setDraft((current) => ({ ...current, [field]: value }))

  const hasDateError = Boolean(draft.fromDate && draft.toDate && draft.fromDate > draft.toDate)

  return (
    <section className={`filterbar-v2${collapsed ? ' collapsed' : ''}`} data-component-id="P1-C01" aria-label="Bộ lọc toàn cục">
      <div className="filter-summary">
        <div>
          <span className="filter-kicker card-title-group">Phạm vi phân tích <ComponentHelpButton componentId="P1-C01" title="Phạm vi phân tích" /></span>
          <strong>{formatDateDisplay(filters.fromDate)} → {formatDateDisplay(filters.toDate)}</strong>
          <span>Hãng bay: WN · {activeCount} nhóm bộ lọc bổ sung</span>
        </div>
        <button
          className="btn btn-ghost filter-collapse"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Mở bộ lọc' : 'Thu gọn'}
        </button>
      </div>

      {!collapsed && (
        <div className="filter-controls">
          <div className="filter-field-v2">
            <span>Từ ngày</span>
            <DatePicker
              value={draft.fromDate}
              onChange={(date) => update('fromDate', date)}
              minDate="2015-01-01"
              maxDate={draft.toDate || '2018-12-31'}
              placeholder="Chọn ngày bắt đầu"
              aria-label="Từ ngày"
            />
          </div>

          <div className="filter-field-v2">
            <span>Đến ngày</span>
            <DatePicker
              value={draft.toDate}
              onChange={(date) => update('toDate', date)}
              minDate={draft.fromDate || '2015-01-01'}
              maxDate="2018-12-31"
              placeholder="Chọn ngày kết thúc"
              aria-label="Đến ngày"
            />
          </div>

          <div className="filter-field-v2 filter-field-v2--airport-clauses">
            <span>Sân bay &amp; tuyến</span>
            <AirportClauseBuilder
              value={draft.airportClauses}
              onChange={(clauses) => update('airportClauses', clauses)}
              airports={AIRPORT_OPTIONS}
              ariaLabel="Điều kiện sân bay và tuyến"
            />
          </div>

          <div className="filter-field-v2">
            <span>Mùa phân tích</span>
            <MultiSelectCombobox
              items={SEASON_OPTIONS}
              values={draft.season}
              onChange={(values) => update('season', values)}
              placeholder="Tất cả các mùa"
              searchPlaceholder="Tìm mùa..."
              emptyMessage="Không tìm thấy mùa"
              countLabel={(count) => `${count} mùa đã chọn`}
              ariaLabel="Mùa phân tích"
              clearable
            />
          </div>

          <div className="filter-field-v2">
            <span>Thứ trong tuần</span>
            <MultiSelectCombobox
              items={DAY_OPTIONS}
              values={draft.dayOfWeek}
              onChange={(values) => update('dayOfWeek', values)}
              placeholder="Tất cả các thứ"
              searchPlaceholder="Tìm thứ..."
              emptyMessage="Không tìm thấy lựa chọn"
              countLabel={(count) => `${count} thứ đã chọn`}
              ariaLabel="Thứ trong tuần"
              clearable
            />
          </div>

          <div className="filter-field-v2">
            <span>Khung giờ khởi hành theo lịch</span>
            <MultiSelectCombobox
              items={TIME_BLOCK_OPTIONS}
              values={draft.scheduledTimeBlock}
              onChange={(values) => update('scheduledTimeBlock', values)}
              placeholder="Tất cả khung giờ"
              searchPlaceholder="Tìm khung giờ..."
              emptyMessage="Không tìm thấy khung giờ"
              countLabel={(count) => `${count} khung giờ`}
              ariaLabel="Khung giờ khởi hành theo lịch"
              clearable
            />
          </div>

          <div className="filter-field-v2">
            <span>Cự ly chuyến bay</span>
            <DistanceFilterBuilder
              value={draft.distanceFilter}
              onChange={(distanceFilter) => update('distanceFilter', distanceFilter)}
              ariaLabel="Điều kiện cự ly chuyến bay"
            />
          </div>

          <div className="filter-actions-v2">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => onApply(draft)}
              disabled={hasDateError}
            >
              Áp dụng
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setDraft(defaultFilters)
                onApply(defaultFilters)
              }}
            >
              Đặt lại
            </button>
          </div>
        </div>
      )}

      {!collapsed && hasDateError && (
        <p className="filter-error" role="alert">
          Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.
        </p>
      )}
    </section>
  )
}
