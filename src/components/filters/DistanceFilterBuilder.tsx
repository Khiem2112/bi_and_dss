import { type CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DistanceFilter } from '../../domain/types'
import { cloneDistanceFilter, formatDistanceFilter, formatDistanceRange } from '../../domain/distanceFilter'
import { MultiSelectCombobox } from '../atoms/Combobox/MultiSelectCombobox'
import {
  DISTANCE_GROUP_OPTIONS,
  DISTANCE_SLIDER_MAX,
  DISTANCE_SLIDER_MIN,
  DISTANCE_SLIDER_STEP,
  formatDistanceGroups,
} from './distanceOptions'

interface DistanceFilterBuilderProps {
  value: DistanceFilter | null | undefined
  onChange: (value: DistanceFilter | null) => void
  ariaLabel?: string
  compact?: boolean
}

type DistanceMode = DistanceFilter['mode']

export function DistanceFilterBuilder({
  value,
  onChange,
  ariaLabel = 'Điều kiện cự ly chuyến bay',
  compact = false,
}: DistanceFilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<DistanceMode>(value?.mode ?? 'range')
  const [groups, setGroups] = useState<string[]>(value?.mode === 'groups' ? [...value.groups] : [])
  const [minMiles, setMinMiles] = useState(value?.mode === 'range' ? value.minMiles : DISTANCE_SLIDER_MIN)
  const [maxMiles, setMaxMiles] = useState(value?.mode === 'range' ? value.maxMiles : DISTANCE_SLIDER_MAX)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const popupId = useId()

  const syncDraft = useCallback(() => {
    const next = cloneDistanceFilter(value)
    setMode(next?.mode ?? 'range')
    setGroups(next?.mode === 'groups' ? [...next.groups] : [])
    setMinMiles(next?.mode === 'range' ? next.minMiles : DISTANCE_SLIDER_MIN)
    setMaxMiles(next?.mode === 'range' ? next.maxMiles : DISTANCE_SLIDER_MAX)
  }, [value])

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.min(compact ? 520 : 580, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
    const estimatedHeight = Math.min(540, window.innerHeight * 0.72)
    const roomBelow = window.innerHeight - rect.bottom - 12
    const roomAbove = rect.top - 12
    const top = roomBelow >= estimatedHeight || roomBelow >= roomAbove
      ? Math.min(rect.bottom + 6, window.innerHeight - estimatedHeight - 12)
      : Math.max(12, rect.top - estimatedHeight - 6)
    setCoords({ top: Math.max(12, top), left, width })
  }, [compact])

  useEffect(() => {
    if (!isOpen) return
    updateCoords()
    const refresh = () => updateCoords()
    const frame = requestAnimationFrame(() => popupRef.current?.focus())
    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', refresh, true)
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

  const close = () => {
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const hasRangeError = minMiles < DISTANCE_SLIDER_MIN
    || maxMiles > DISTANCE_SLIDER_MAX
    || minMiles > maxMiles
  const hasGroupError = mode === 'groups' && groups.length === 0
  const startPercent = ((minMiles - DISTANCE_SLIDER_MIN) / (DISTANCE_SLIDER_MAX - DISTANCE_SLIDER_MIN)) * 100
  const endPercent = ((maxMiles - DISTANCE_SLIDER_MIN) / (DISTANCE_SLIDER_MAX - DISTANCE_SLIDER_MIN)) * 100
  const rangeStyle = {
    '--distance-start': `${Math.max(0, Math.min(100, startPercent))}%`,
    '--distance-end': `${Math.max(0, Math.min(100, endPercent))}%`,
  } as CSSProperties

  const apply = () => {
    if (mode === 'groups') {
      if (groups.length === 0) return
      onChange({ mode: 'groups', groups: [...groups] })
    } else {
      if (hasRangeError) return
      const coversFullRange = minMiles === DISTANCE_SLIDER_MIN && maxMiles === DISTANCE_SLIDER_MAX
      onChange(coversFullRange ? null : { mode: 'range', minMiles, maxMiles })
    }
    close()
  }

  const popup = isOpen && coords && createPortal(
    <div
      ref={popupRef}
      id={popupId}
      role="dialog"
      aria-modal="false"
      aria-label="Tạo điều kiện cự ly chuyến bay"
      tabIndex={-1}
      className={`distance-filter-popup${compact ? ' distance-filter-popup--compact' : ''}`}
      style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 1200 }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
    >
      <div className="distance-filter-popup-header">
        <div>
          <strong>Điều kiện cự ly chuyến bay</strong>
          <span>Chọn một khoảng tùy chỉnh hoặc các nhóm chuẩn 250 dặm.</span>
        </div>
        <button className="distance-filter-close" type="button" onClick={close} aria-label="Đóng trình tạo điều kiện cự ly">×</button>
      </div>

      <div className="distance-filter-mode" role="tablist" aria-label="Cách lọc cự ly">
        <button type="button" role="tab" aria-selected={mode === 'range'} className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Khoảng tùy chỉnh</button>
        <button type="button" role="tab" aria-selected={mode === 'groups'} className={mode === 'groups' ? 'active' : ''} onClick={() => setMode('groups')}>Nhóm chuẩn G01–G11</button>
      </div>

      {mode === 'range' ? (
        <div className="distance-range-panel" role="tabpanel">
          <div className="distance-range-summary">
            <span>Khoảng đang chọn</span>
            <strong>{formatDistanceRange({ minMiles, maxMiles })}</strong>
          </div>
          <div className="distance-dual-range" style={rangeStyle}>
            <div className="distance-range-rail" aria-hidden="true" />
            <input
              type="range"
              min={DISTANCE_SLIDER_MIN}
              max={DISTANCE_SLIDER_MAX}
              step={DISTANCE_SLIDER_STEP}
              value={Math.min(minMiles, maxMiles)}
              onChange={(event) => setMinMiles(Math.min(Number(event.target.value), maxMiles))}
              aria-label="Cự ly tối thiểu"
              aria-valuetext={`${minMiles.toLocaleString('vi-VN')} dặm`}
            />
            <input
              type="range"
              min={DISTANCE_SLIDER_MIN}
              max={DISTANCE_SLIDER_MAX}
              step={DISTANCE_SLIDER_STEP}
              value={Math.max(maxMiles, minMiles)}
              onChange={(event) => setMaxMiles(Math.max(Number(event.target.value), minMiles))}
              aria-label="Cự ly tối đa"
              aria-valuetext={`${maxMiles.toLocaleString('vi-VN')} dặm`}
            />
          </div>
          <div className="distance-range-scale" aria-hidden="true"><span>0</span><span>2.500</span><span>5.000 dặm</span></div>
          <div className="distance-number-grid">
            <label>
              <span>Từ (dặm)</span>
              <input type="number" min={DISTANCE_SLIDER_MIN} max={DISTANCE_SLIDER_MAX} step="1" value={minMiles} onChange={(event) => setMinMiles(Number(event.target.value))} />
            </label>
            <label>
              <span>Đến (dặm)</span>
              <input type="number" min={DISTANCE_SLIDER_MIN} max={DISTANCE_SLIDER_MAX} step="1" value={maxMiles} onChange={(event) => setMaxMiles(Number(event.target.value))} />
            </label>
          </div>
          {hasRangeError && <p className="distance-filter-error" role="alert">Khoảng hợp lệ nằm trong 0–5.000 dặm và giá trị Từ không được lớn hơn Đến.</p>}
        </div>
      ) : (
        <div className="distance-groups-panel" role="tabpanel">
          <MultiSelectCombobox
            items={DISTANCE_GROUP_OPTIONS}
            values={groups}
            onChange={setGroups}
            placeholder="Chọn nhóm chuẩn"
            searchPlaceholder="Tìm mã nhóm hoặc khoảng cự ly..."
            emptyMessage="Không tìm thấy nhóm cự ly"
            countLabel={(count) => `${count} nhóm chuẩn`}
            ariaLabel="Nhóm cự ly chuẩn"
            clearable
            menuClassName="distance-filter-groups-menu"
          />
          {hasGroupError && <p className="distance-filter-hint">Chọn ít nhất một nhóm chuẩn hoặc dùng “Xóa điều kiện”.</p>}
        </div>
      )}

      <div className="distance-filter-preview">
        <span>Điều kiện sẽ áp dụng</span>
        <strong>{mode === 'range' ? formatDistanceRange({ minMiles, maxMiles }) : formatDistanceGroups(groups)}</strong>
      </div>

      <div className="distance-filter-footer">
        <button className="btn btn-ghost btn--xs" type="button" disabled={!value} onClick={() => { onChange(null); close() }}>Xóa điều kiện</button>
        <span className="distance-filter-footer-spacer" />
        <button className="btn btn-secondary btn--xs" type="button" onClick={close}>Hủy</button>
        <button className="btn btn-primary btn--xs" type="button" disabled={(mode === 'range' && hasRangeError) || hasGroupError} onClick={apply}>Áp dụng cự ly</button>
      </div>
    </div>,
    document.body,
  )

  const triggerText = formatDistanceFilter(value)

  return (
    <div className="distance-filter-builder">
      <button
        ref={triggerRef}
        type="button"
        className={`distance-filter-trigger${isOpen ? ' active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popupId}
        aria-label={`${ariaLabel}: ${triggerText}`}
        title={value ? triggerText : undefined}
        onClick={() => {
          if (!isOpen) syncDraft()
          setIsOpen((current) => !current)
        }}
      >
        <span className="distance-filter-trigger-icon" aria-hidden="true">↔</span>
        <span className="distance-filter-trigger-text">{triggerText}</span>
        <span className="distance-filter-trigger-chevron" aria-hidden="true">⌄</span>
      </button>
      {popup}
    </div>
  )
}
