import { useEffect, useMemo, useState } from 'react'
import { defaultFilters, type GlobalFilters } from '../../domain/types'

interface GlobalFilterBarProps {
  filters: GlobalFilters
  onApply: (filters: GlobalFilters) => void
}

const origins = ['DAL', 'BWI', 'MDW', 'HOU', 'PHX', 'DEN']
const destinations = ['ATL', 'MCO', 'DEN', 'LAS', 'BWI', 'MDW']

export function GlobalFilterBar({ filters, onApply }: GlobalFilterBarProps) {
  const [draft, setDraft] = useState(filters)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => setDraft(filters), [filters])

  const activeCount = useMemo(() => [
    filters.origin !== 'all',
    filters.destination !== 'all',
    filters.season !== 'all',
    filters.distanceGroup !== 'all',
  ].filter(Boolean).length, [filters])

  const update = (field: keyof GlobalFilters, value: string) => setDraft((current) => ({ ...current, [field]: value }))

  return (
    <section className={`filterbar-v2${collapsed ? ' collapsed' : ''}`} data-component-id="P1-C01" aria-label="Bộ lọc toàn cục">
      <div className="filter-summary">
        <div>
          <span className="filter-kicker">Global context</span>
          <strong>{filters.fromDate} → {filters.toDate}</strong>
          <span>Carrier: WN · {activeCount} filter bổ sung</span>
        </div>
        <button className="btn btn-ghost filter-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
          {collapsed ? 'Mở bộ lọc' : 'Thu gọn'}
        </button>
      </div>
      {!collapsed && (
        <div className="filter-controls">
          <label className="filter-field-v2">
            <span>From date</span>
            <input type="date" min="2015-01-01" max="2018-12-31" value={draft.fromDate} onChange={(event) => update('fromDate', event.target.value)} />
          </label>
          <label className="filter-field-v2">
            <span>To date</span>
            <input type="date" min="2015-01-01" max="2018-12-31" value={draft.toDate} onChange={(event) => update('toDate', event.target.value)} />
          </label>
          <label className="filter-field-v2">
            <span>Origin</span>
            <select value={draft.origin} onChange={(event) => update('origin', event.target.value)}>
              <option value="all">Tất cả origin</option>
              {origins.map((origin) => <option value={origin} key={origin}>{origin}</option>)}
            </select>
          </label>
          <label className="filter-field-v2">
            <span>Destination</span>
            <select value={draft.destination} onChange={(event) => update('destination', event.target.value)}>
              <option value="all">Tất cả destination</option>
              {destinations.map((destination) => <option value={destination} key={destination}>{destination}</option>)}
            </select>
          </label>
          <label className="filter-field-v2">
            <span>Project season</span>
            <select value={draft.season} onChange={(event) => update('season', event.target.value)}>
              <option value="all">Tất cả mùa</option>
              <option value="Winter">Winter · Jan–Mar</option>
              <option value="Spring">Spring · Apr–Jun</option>
              <option value="Summer">Summer · Jul–Sep</option>
              <option value="Autumn">Autumn · Oct–Dec</option>
            </select>
          </label>
          <label className="filter-field-v2">
            <span>Distance Group</span>
            <select value={draft.distanceGroup} onChange={(event) => update('distanceGroup', event.target.value)}>
              <option value="all">Tất cả khoảng cách</option>
              <option value="G01">G01 · 0–249 miles</option>
              <option value="G02">G02 · 250–499 miles</option>
              <option value="G03">G03 · 500–749 miles</option>
              <option value="G04">G04 · 750–999 miles</option>
              <option value="G05+">G05+ · từ 1.000 miles</option>
            </select>
          </label>
          <div className="filter-actions-v2">
            <button className="btn btn-primary" type="button" onClick={() => onApply(draft)} disabled={draft.fromDate > draft.toDate}>Áp dụng</button>
            <button className="btn btn-secondary" type="button" onClick={() => { setDraft(defaultFilters); onApply(defaultFilters) }}>Đặt lại</button>
          </div>
        </div>
      )}
      {!collapsed && draft.fromDate > draft.toDate && <p className="filter-error" role="alert">From date phải nhỏ hơn hoặc bằng To date.</p>}
    </section>
  )
}
