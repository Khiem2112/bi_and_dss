import { useEffect, useMemo, useState } from 'react'
import { defaultFilters, type GlobalFilters } from '../../domain/types'
import { DatePicker } from '../atoms/DatePicker/DatePicker'
import { formatDateDisplay } from '../../domain/formatters'
import { MultiSelectCombobox, type MultiSelectItem } from '../atoms/Combobox/MultiSelectCombobox'
import { ComponentHelpButton } from '../ui/ComponentHelpButton'

interface GlobalFilterBarProps {
  filters: GlobalFilters
  onApply: (filters: GlobalFilters) => void
}

const ORIGIN_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'DAL', label: 'DAL', subLabel: 'Dallas Love Field' },
  { value: 'BWI', label: 'BWI', subLabel: 'Baltimore/Washington' },
  { value: 'MDW', label: 'MDW', subLabel: 'Chicago Midway' },
  { value: 'HOU', label: 'HOU', subLabel: 'Houston Hobby' },
  { value: 'PHX', label: 'PHX', subLabel: 'Phoenix Sky Harbor' },
  { value: 'DEN', label: 'DEN', subLabel: 'Denver International' },
]

const DESTINATION_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'ATL', label: 'ATL', subLabel: 'Atlanta Hartsfield-Jackson' },
  { value: 'MCO', label: 'MCO', subLabel: 'Orlando International' },
  { value: 'DEN', label: 'DEN', subLabel: 'Denver International' },
  { value: 'LAS', label: 'LAS', subLabel: 'Las Vegas Harry Reid' },
  { value: 'BWI', label: 'BWI', subLabel: 'Baltimore/Washington' },
  { value: 'MDW', label: 'MDW', subLabel: 'Chicago Midway' },
]

const SEASON_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'Winter', label: 'Mùa đông', subLabel: 'Tháng 1–3' },
  { value: 'Spring', label: 'Mùa xuân', subLabel: 'Tháng 4–6' },
  { value: 'Summer', label: 'Mùa hè', subLabel: 'Tháng 7–9' },
  { value: 'Autumn', label: 'Mùa thu', subLabel: 'Tháng 10–12' },
]

const ROUTE_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'ATL → BWI', label: 'ATL → BWI', subLabel: 'Đường bay theo chiều' },
  { value: 'BWI → ATL', label: 'BWI → ATL', subLabel: 'Đường bay theo chiều' },
  { value: 'DAL → ATL', label: 'DAL → ATL', subLabel: 'Đường bay theo chiều' },
  { value: 'BWI → MCO', label: 'BWI → MCO', subLabel: 'Đường bay theo chiều' },
  { value: 'MDW → DEN', label: 'MDW → DEN', subLabel: 'Đường bay theo chiều' },
  { value: 'HOU → DEN', label: 'HOU → DEN', subLabel: 'Đường bay theo chiều' },
  { value: 'PHX → LAS', label: 'PHX → LAS', subLabel: 'Đường bay theo chiều' },
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

const DISTANCE_GROUP_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'G01', label: 'G01', subLabel: '0–249 dặm' },
  { value: 'G02', label: 'G02', subLabel: '250–499 dặm' },
  { value: 'G03', label: 'G03', subLabel: '500–749 dặm' },
  { value: 'G04', label: 'G04', subLabel: '750–999 dặm' },
  { value: 'G05', label: 'G05', subLabel: '1.000–1.249 dặm' },
  { value: 'G06', label: 'G06', subLabel: '1.250–1.499 dặm' },
  { value: 'G07', label: 'G07', subLabel: '1.500–1.749 dặm' },
  { value: 'G08', label: 'G08', subLabel: '1.750–1.999 dặm' },
  { value: 'G09', label: 'G09', subLabel: '2.000–2.249 dặm' },
  { value: 'G10', label: 'G10', subLabel: '2.250–2.499 dặm' },
  { value: 'G11', label: 'G11', subLabel: 'Từ 2.500 dặm' },
]

export function GlobalFilterBar({ filters, onApply }: GlobalFilterBarProps) {
  const [draft, setDraft] = useState(filters)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => setDraft(filters), [filters])

  const activeCount = useMemo(() => [
    (Array.isArray(filters.origin) ? filters.origin.length > 0 : Boolean(filters.origin && filters.origin !== 'all')),
    (Array.isArray(filters.destination) ? filters.destination.length > 0 : Boolean(filters.destination && filters.destination !== 'all')),
    filters.route.length > 0,
    (Array.isArray(filters.season) ? filters.season.length > 0 : Boolean(filters.season && filters.season !== 'all')),
    filters.dayOfWeek.length > 0,
    filters.scheduledTimeBlock.length > 0,
    (Array.isArray(filters.distanceGroup) ? filters.distanceGroup.length > 0 : Boolean(filters.distanceGroup && filters.distanceGroup !== 'all')),
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

          <div className="filter-field-v2">
            <span>Sân bay đi</span>
            <MultiSelectCombobox
              items={ORIGIN_OPTIONS}
              values={draft.origin}
              onChange={(values) => update('origin', values)}
              placeholder="Tất cả sân bay đi"
              searchPlaceholder="Tìm sân bay đi..."
              emptyMessage="Không tìm thấy sân bay"
              countLabel={(count) => `${count} sân bay đi`}
              ariaLabel="Sân bay đi"
              clearable
            />
          </div>

          <div className="filter-field-v2">
            <span>Sân bay đến</span>
            <MultiSelectCombobox
              items={DESTINATION_OPTIONS}
              values={draft.destination}
              onChange={(values) => update('destination', values)}
              placeholder="Tất cả sân bay đến"
              searchPlaceholder="Tìm sân bay đến..."
              emptyMessage="Không tìm thấy sân bay"
              countLabel={(count) => `${count} sân bay đến`}
              ariaLabel="Sân bay đến"
              clearable
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
            <span>Đường bay theo chiều</span>
            <MultiSelectCombobox
              items={ROUTE_OPTIONS}
              values={draft.route}
              onChange={(values) => update('route', values)}
              placeholder="Tất cả đường bay"
              searchPlaceholder="Tìm đường bay..."
              emptyMessage="Không tìm thấy đường bay"
              countLabel={(count) => `${count} đường bay`}
              ariaLabel="Đường bay theo chiều"
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
            <span>Nhóm khoảng cách</span>
            <MultiSelectCombobox
              items={DISTANCE_GROUP_OPTIONS}
              values={draft.distanceGroup}
              onChange={(values) => update('distanceGroup', values)}
              placeholder="Tất cả nhóm cự ly"
              searchPlaceholder="Tìm nhóm cự ly..."
              emptyMessage="Không tìm thấy nhóm"
              countLabel={(count) => `${count} nhóm cự ly`}
              ariaLabel="Nhóm khoảng cách"
              clearable
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
