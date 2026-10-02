import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../lib/cn'

export type DatePickerProps = {
  readonly value?: string
  readonly onChange?: (dateStr: string) => void
  readonly placeholder?: string
  readonly label?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly minDate?: string
  readonly maxDate?: string
  readonly size?: 'sm' | 'md'
  readonly icon?: ReactNode
  readonly clearable?: boolean
  readonly portaled?: boolean
}

export type DateRangeValue = {
  readonly from: string
  readonly to: string
}

export type DateRangePreset = {
  readonly label: string
  readonly days: number
}

export type DateRangePickerProps = {
  readonly from?: string
  readonly to?: string
  readonly onChange?: (range: DateRangeValue) => void
  readonly presets?: readonly DateRangePreset[]
  readonly placeholder?: string
  readonly label?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly minDate?: string
  readonly maxDate?: string
  readonly size?: 'sm' | 'md'
  readonly portaled?: boolean
}

const padZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear()
  const m = padZero(date.getMonth() + 1)
  const d = padZero(date.getDate())
  return `${y}-${m}-${d}`
}

const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return dateStr
}

const VIETNAMESE_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  label,
  disabled = false,
  className,
  minDate,
  maxDate,
  size = 'md',
  icon,
  clearable = true,
  portaled = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonId = useId()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const selectedDateObj = useMemo(() => {
    if (!value) return null
    const [y, m, d] = value.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }, [value])

  const [viewDate, setViewDate] = useState<Date>(() => selectedDateObj ?? new Date())

  useEffect(() => {
    if (selectedDateObj) {
      setViewDate(selectedDateObj)
    }
  }, [selectedDateObj])

  const currentYear = viewDate.getFullYear()
  const currentMonth = viewDate.getMonth()

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'long',
      year: 'numeric',
    }).format(viewDate)
  }, [viewDate])

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = []

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNumber = daysInPrevMonth - i
      const prevDate = new Date(currentYear, currentMonth - 1, dayNumber)
      days.push({
        dateStr: formatDateToISO(prevDate),
        dayNumber,
        isCurrentMonth: false,
      })
    }

    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const thisDate = new Date(currentYear, currentMonth, i)
      days.push({
        dateStr: formatDateToISO(thisDate),
        dayNumber: i,
        isCurrentMonth: true,
      })
    }

    const remainingSlots = 42 - days.length
    for (let i = 1; i <= remainingSlots; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i)
      days.push({
        dateStr: formatDateToISO(nextDate),
        dayNumber: i,
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentYear, currentMonth])

  const todayStr = useMemo(() => formatDateToISO(new Date()), [])

  const handleSelectDay = (dateStr: string) => {
    onChange?.(dateStr)
    setIsOpen(false)
  }

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false)
      return
    }

    const popupEl = popupRef.current
    const estimatedHeight = popupEl ? popupEl.offsetHeight : 290
    const sideOffset = 4

    let top = rect.bottom + sideOffset
    const wouldOverflowBottom = top + estimatedHeight > window.innerHeight - 8
    const fitsTop = rect.top - estimatedHeight - sideOffset >= 8

    if (wouldOverflowBottom && fitsTop) {
      top = rect.top - (popupEl ? popupEl.offsetHeight : estimatedHeight) - sideOffset
    }

    let left = rect.left
    const width = 270
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }

    setCoords({
      top,
      left: Math.max(8, left),
      width,
    })
  }, [])

  useEffect(() => {
    if (!isOpen || !portaled) {
      setCoords(null)
      return
    }

    updateCoords()

    const rafId = requestAnimationFrame(() => {
      updateCoords()
    })

    const handleScrollOrResize = (e: Event) => {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return
      }
      updateCoords()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, portaled, updateCoords])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const popupElement = isOpen && (
    <div
      ref={popupRef}
      className={cn('ui-datepicker-popup', portaled ? 'ui-datepicker-portal' : 'ui-datepicker-inline')}
      style={
        portaled
          ? {
              position: 'fixed',
              top: coords ? `${coords.top}px` : undefined,
              left: coords ? `${coords.left}px` : undefined,
              visibility: coords ? 'visible' : 'hidden',
              zIndex: 1000,
            }
          : undefined
      }
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="ui-datepicker-header">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="ui-datepicker-nav-btn"
          aria-label="Tháng trước"
        >
          <svg className="ui-datepicker-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="ui-datepicker-title">
          {monthLabel}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="ui-datepicker-nav-btn"
          aria-label="Tháng sau"
        >
          <svg className="ui-datepicker-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="ui-datepicker-weekdays">
        {VIETNAMESE_WEEKDAYS.map((day, idx) => (
          <span key={idx} className="ui-datepicker-weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="ui-datepicker-grid">
        {daysGrid.map((item) => {
          const isSelected = item.dateStr === value
          const isToday = item.dateStr === todayStr
          const isPastMin = minDate ? item.dateStr < minDate : false
          const isFutureMax = maxDate ? item.dateStr > maxDate : false
          const isDayDisabled = isPastMin || isFutureMax

          return (
            <button
              key={item.dateStr}
              type="button"
              disabled={isDayDisabled}
              onClick={() => handleSelectDay(item.dateStr)}
              className={cn(
                'ui-datepicker-cell',
                item.isCurrentMonth ? 'ui-datepicker-cell-current' : 'ui-datepicker-cell-other',
                isToday && !isSelected && 'ui-datepicker-cell-today',
                isSelected && 'ui-datepicker-cell-selected',
                isDayDisabled && 'ui-datepicker-cell-disabled',
              )}
            >
              {item.dayNumber}
            </button>
          )
        })}
      </div>

      <div className="ui-datepicker-footer">
        <button
          type="button"
          onClick={() => handleSelectDay(todayStr)}
          className="ui-datepicker-action-btn"
        >
          Hôm nay
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={() => {
              onChange?.('')
              setIsOpen(false)
            }}
            className="ui-datepicker-clear-btn"
          >
            Xóa
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('ui-datepicker-container', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={buttonId}
          className="ui-datepicker-label"
        >
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'ui-datepicker-trigger',
          size === 'sm' ? 'ui-datepicker-trigger-sm' : 'ui-datepicker-trigger-md',
          disabled && 'ui-datepicker-trigger-disabled',
          isOpen && 'ui-datepicker-trigger-active',
        )}
      >
        <span className="ui-datepicker-trigger-left">
          {icon ?? (
            <svg
              aria-hidden="true"
              className="ui-datepicker-icon-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          )}
          <span className={cn('ui-datepicker-value-text', !value && 'ui-datepicker-placeholder-text')}>
            {value ? formatDateDisplay(value) : placeholder}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn('ui-datepicker-chevron', isOpen && 'ui-datepicker-chevron-open')}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {portaled && isMounted
        ? popupElement
          ? createPortal(popupElement, document.body)
          : null
        : popupElement}
    </div>
  )
}
