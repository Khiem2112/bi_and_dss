import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AirportClause } from '../../domain/types'
import { airportClauseKey, isCompleteAirportClause } from '../../domain/airportClauses'
import { formatAirportClause, formatAirportClauseGroup } from '../../domain/formatters'
import { MultiSelectCombobox, type MultiSelectItem } from '../atoms/Combobox/MultiSelectCombobox'

interface AirportClauseBuilderProps {
  value: readonly AirportClause[]
  onChange: (clauses: AirportClause[]) => void
  airports: readonly MultiSelectItem[]
  ariaLabel?: string
  compact?: boolean
}

const MODE_OPTIONS = [
  { value: 'route', label: 'Đường bay theo chiều' },
  { value: 'origin', label: 'Sân bay đi' },
  { value: 'destination', label: 'Sân bay đến' },
  { value: 'airport', label: 'Sân bay · mọi vai trò' },
] as const

const cloneClauses = (clauses: readonly AirportClause[]): AirportClause[] => clauses.map((clause) => ({ ...clause }))
const newClauseId = () => `airport-clause-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const emptyClause = (): AirportClause => ({ id: newClauseId(), mode: 'airport', airport: '' })

function changeMode(clause: AirportClause, mode: AirportClause['mode']): AirportClause {
  const fallbackAirport = clause.mode === 'route' ? clause.origin : clause.airport
  if (mode === 'route') {
    return { id: clause.id, mode, origin: fallbackAirport, destination: '' }
  }
  return { id: clause.id, mode, airport: fallbackAirport }
}

function updateAirport(clause: AirportClause, field: 'airport' | 'origin' | 'destination', airport: string): AirportClause {
  if (clause.mode === 'route') {
    return field === 'destination'
      ? { ...clause, destination: airport }
      : { ...clause, origin: airport }
  }
  return { ...clause, airport }
}

function AirportPicker({
  value,
  onChange,
  airports,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  airports: readonly MultiSelectItem[]
  ariaLabel: string
}) {
  return (
    <MultiSelectCombobox
      items={airports}
      values={value ? [value] : []}
      onChange={(values) => onChange(values[values.length - 1] ?? '')}
      placeholder="Chọn sân bay"
      searchPlaceholder="Tìm mã hoặc tên sân bay..."
      emptyMessage="Không tìm thấy sân bay"
      ariaLabel={ariaLabel}
      clearable
      countLabel={() => value}
      menuClassName="airport-clause-airport-menu"
    />
  )
}

export function AirportClauseBuilder({
  value,
  onChange,
  airports,
  ariaLabel = 'Điều kiện sân bay và tuyến',
  compact = false,
}: AirportClauseBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<AirportClause[]>(() => cloneClauses(value))
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const popupId = useId()

  useEffect(() => {
    if (!isOpen) setDraft(cloneClauses(value))
  }, [isOpen, value])

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.min(compact ? 650 : 720, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
    const estimatedHeight = Math.min(690, window.innerHeight * 0.72)
    const roomBelow = window.innerHeight - rect.bottom - 12
    const roomAbove = rect.top - 12
    const top =
      roomBelow >= estimatedHeight || roomBelow >= roomAbove
        ? Math.min(rect.bottom + 6, window.innerHeight - estimatedHeight - 12)
        : Math.max(12, rect.top - estimatedHeight - 6)

    setCoords({ top: Math.max(12, top), left, width })
  }, [compact])

  useEffect(() => {
    if (!isOpen) return
    updateCoords()
    const refresh = () => updateCoords()
    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', refresh, true)
    const frame = requestAnimationFrame(() => popupRef.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh, true)
    }
  }, [isOpen, updateCoords])

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-combobox-portal="true"]')) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  const duplicateKeys = useMemo(() => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    draft.filter(isCompleteAirportClause).forEach((clause) => {
      const key = airportClauseKey(clause)
      if (seen.has(key)) duplicates.add(key)
      seen.add(key)
    })
    return duplicates
  }, [draft])

  const redundantCount = useMemo(() => draft.filter((clause, index) => {
    if (!isCompleteAirportClause(clause)) return false
    return draft.some((other, otherIndex) => {
      if (index === otherIndex || !isCompleteAirportClause(other)) return false
      if (other.mode === 'airport') {
        if (clause.mode === 'route') return clause.origin === other.airport || clause.destination === other.airport
        return clause.airport === other.airport
      }
      if (clause.mode === 'route' && other.mode === 'origin') return clause.origin === other.airport
      if (clause.mode === 'route' && other.mode === 'destination') return clause.destination === other.airport
      return false
    })
  }).length, [draft])

  const invalidCount = draft.filter((clause) => !isCompleteAirportClause(clause)).length
  const hasBlockingError = invalidCount > 0 || duplicateKeys.size > 0

  const setClause = (id: string, updater: (clause: AirportClause) => AirportClause) => {
    setDraft((current) => current.map((clause) => clause.id === id ? updater(clause) : clause))
  }

  const close = () => {
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const triggerText = value.length === 0
    ? 'Tất cả sân bay và đường bay'
    : value.length === 1
      ? formatAirportClause(value[0])
      : `${value.length} điều kiện HOẶC`

  const popup = isOpen && coords && createPortal(
    <div
      ref={popupRef}
      id={popupId}
      role="dialog"
      aria-modal="false"
      aria-label="Tạo điều kiện sân bay và tuyến"
      tabIndex={-1}
      className={`airport-clause-popup${compact ? ' airport-clause-popup--compact' : ''}`}
      style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 1200 }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
    >
      <div className="airport-clause-popup-header">
        <div>
          <strong>Điều kiện sân bay và tuyến</strong>
          <span>Các dòng trong nhóm kết hợp bằng HOẶC.</span>
        </div>
        <button className="airport-clause-close" type="button" onClick={close} aria-label="Đóng trình tạo điều kiện">×</button>
      </div>

      <div className="airport-clause-list">
        {draft.length === 0 ? (
          <div className="airport-clause-empty">Chưa có điều kiện. Kết quả đang bao gồm tất cả sân bay và đường bay.</div>
        ) : draft.map((clause, index) => (
          <div key={clause.id}>
            {index > 0 && <div className="airport-clause-or" aria-hidden="true"><span>HOẶC</span></div>}
            <div className={`airport-clause-row${!isCompleteAirportClause(clause) ? ' has-error' : ''}`}>
              <div className="airport-clause-mode">
                <MultiSelectCombobox
                  items={MODE_OPTIONS}
                  values={[clause.mode]}
                  onChange={(modes) => {
                    const mode = modes[0] as AirportClause['mode'] | undefined
                    if (mode) setClause(clause.id, (current) => changeMode(current, mode))
                  }}
                  placeholder="Chọn loại điều kiện"
                  ariaLabel={`Loại điều kiện ${index + 1}`}
                  searchable={false}
                  selectionMode="single"
                  size="sm"
                  menuClassName="airport-clause-mode-menu"
                />
              </div>

              <div className="airport-clause-values">
                {clause.mode === 'route' ? (
                  <>
                    <AirportPicker value={clause.origin} onChange={(airport) => setClause(clause.id, (current) => updateAirport(current, 'origin', airport))} airports={airports} ariaLabel={`Sân bay đi của điều kiện ${index + 1}`} />
                    <span className="airport-clause-arrow" aria-hidden="true">→</span>
                    <AirportPicker value={clause.destination} onChange={(airport) => setClause(clause.id, (current) => updateAirport(current, 'destination', airport))} airports={airports} ariaLabel={`Sân bay đến của điều kiện ${index + 1}`} />
                  </>
                ) : (
                  <AirportPicker value={clause.airport} onChange={(airport) => setClause(clause.id, (current) => updateAirport(current, 'airport', airport))} airports={airports} ariaLabel={`${MODE_OPTIONS.find((option) => option.value === clause.mode)?.label} của điều kiện ${index + 1}`} />
                )}
              </div>

              <button className="airport-clause-remove" type="button" onClick={() => setDraft((current) => current.filter((item) => item.id !== clause.id))} aria-label={`Xóa điều kiện ${index + 1}`}>Xóa</button>
            </div>
            {!isCompleteAirportClause(clause) && <p className="airport-clause-row-error">Hãy chọn đủ sân bay; đường bay phải có hai đầu khác nhau.</p>}
          </div>
        ))}
      </div>

      <button className="btn btn-secondary btn--xs airport-clause-add" type="button" onClick={() => setDraft((current) => [...current, emptyClause()])}>+ Thêm điều kiện</button>

      <div className="airport-clause-feedback" role="status" aria-live="polite">
        {duplicateKeys.size > 0 && <span className="error">Có điều kiện trùng lặp. Hãy xóa dòng trùng trước khi áp dụng.</span>}
        {redundantCount > 0 && <span className="warning">Có điều kiện đã được một điều kiện rộng hơn bao phủ; kết quả không đổi nhưng truy vấn có thể khó đọc.</span>}
      </div>

      <div className="airport-clause-preview">
        <span>Biểu thức hiện tại</span>
        <strong>{draft.length ? formatAirportClauseGroup(draft.filter(isCompleteAirportClause)) : 'Tất cả sân bay và đường bay'}</strong>
      </div>

      <div className="airport-clause-footer">
        <button className="btn btn-ghost btn--xs" type="button" disabled={draft.length === 0} onClick={() => setDraft([])}>Xóa tất cả</button>
        <span className="airport-clause-footer-spacer" />
        <button className="btn btn-secondary btn--xs" type="button" onClick={close}>Hủy</button>
        <button className="btn btn-primary btn--xs" type="button" disabled={hasBlockingError} onClick={() => { onChange(cloneClauses(draft)); close() }}>Áp dụng điều kiện</button>
      </div>
    </div>,
    document.body,
  )

  return (
    <div className="airport-clause-builder">
      <button
        ref={triggerRef}
        type="button"
        className={`airport-clause-trigger${isOpen ? ' active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popupId}
        aria-label={`${ariaLabel}: ${triggerText}`}
        title={value.length ? formatAirportClauseGroup(value) : undefined}
        onClick={() => {
          if (!isOpen) setDraft(cloneClauses(value))
          setIsOpen((current) => !current)
        }}
      >
        <span className="airport-clause-trigger-icon" aria-hidden="true">⌘</span>
        <span className="airport-clause-trigger-text">{triggerText}</span>
        <span className="airport-clause-trigger-chevron" aria-hidden="true">⌄</span>
      </button>
      {popup}
    </div>
  )
}

