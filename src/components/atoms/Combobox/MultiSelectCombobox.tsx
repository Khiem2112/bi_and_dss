import {
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '../Badge/Badge'
import { Tooltip } from '../Tooltip/Tooltip'
import { cn } from '../../../lib/cn'

export type MultiSelectItem = {
  readonly value: string
  readonly label: string
  readonly subLabel?: string
  readonly dotColor?: string
  readonly icon?: ReactNode
  readonly disabled?: boolean
}

export type MultiSelectComboboxProps = {
  readonly items: readonly MultiSelectItem[]
  readonly values: readonly string[]
  readonly onChange: (values: string[]) => void
  readonly placeholder?: string
  readonly label?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly menuClassName?: string
  readonly size?: 'sm' | 'md'
  readonly searchable?: boolean
  readonly searchPlaceholder?: string
  readonly ariaLabel?: string
  readonly placement?: 'bottom' | 'top'
  readonly portaled?: boolean
  readonly clearable?: boolean
  readonly clearAriaLabel?: string
  readonly onClear?: () => void
  readonly badgePlacement?: 'beside' | 'none'
  readonly renderBadge?: (item: MultiSelectItem, onRemove: () => void) => ReactNode
  readonly emptyMessage?: string
  readonly countLabel?: (count: number) => string
}

export function MultiSelectCombobox({
  items,
  values,
  onChange,
  placeholder = 'Chọn tùy chọn...',
  label,
  disabled = false,
  className,
  menuClassName,
  size = 'md',
  searchable = true,
  searchPlaceholder = 'Tìm kiếm...',
  ariaLabel,
  placement = 'bottom',
  portaled = true,
  clearable = false,
  clearAriaLabel = 'Xóa tất cả',
  onClear,
  badgePlacement = 'none',
  renderBadge,
  emptyMessage = 'Không tìm thấy tùy chọn',
  countLabel,
}: MultiSelectComboboxProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const buttonId = useId()
  const listboxId = useId()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const selectedItems = useMemo(
    () => items.filter((item) => values.includes(item.value)),
    [items, values],
  )

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase().trim()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(query)),
    )
  }, [items, searchQuery])

  useEffect(() => {
    setActiveIndex((current) => Math.max(0, Math.min(current, filteredOptions.length - 1)))
  }, [filteredOptions.length])

  const handleToggle = useCallback(
    (itemValue: string) => {
      const isSelected = values.includes(itemValue)
      const nextValues = isSelected
        ? values.filter((v) => v !== itemValue)
        : [...values, itemValue]
      onChange(nextValues)
    },
    [onChange, values],
  )

  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange([])
      onClear?.()
    },
    [onChange, onClear],
  )

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (filteredOptions.length === 0) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
      }
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + direction + filteredOptions.length) % filteredOptions.length)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : filteredOptions.length - 1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filteredOptions[activeIndex]
      if (option && !option.disabled) handleToggle(option.value)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }, [activeIndex, filteredOptions, handleToggle])

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false)
      return
    }

    const menuEl = menuRef.current
    const estimatedHeight = menuEl ? menuEl.offsetHeight : 240
    const sideOffset = 4

    let top = rect.bottom + sideOffset
    const wouldOverflowBottom = top + estimatedHeight > window.innerHeight - 8
    const fitsTop = rect.top - estimatedHeight - sideOffset >= 8

    if (placement === 'top' || (wouldOverflowBottom && fitsTop)) {
      top = rect.top - (menuEl ? menuEl.offsetHeight : estimatedHeight) - sideOffset
    }

    let left = rect.left
    const width = Math.max(rect.width, 180)
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }

    setCoords({
      top,
      left: Math.max(8, left),
      width,
    })
  }, [placement])

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
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
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
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || filteredOptions.length === 0) return
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, filteredOptions.length, isOpen, listboxId])

  const triggerText = useMemo(() => {
    if (selectedItems.length === 0) {
      return placeholder
    }
    if (countLabel) {
      return countLabel(selectedItems.length)
    }
    if (selectedItems.length === 1) {
      return selectedItems[0].label
    }
    return `${selectedItems.length} đã chọn`
  }, [selectedItems, placeholder, countLabel])

  const menuElement = isOpen && (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-multiselectable="true"
      data-combobox-portal="true"
      onPointerDown={(e) => e.stopPropagation()}
      style={
        portaled
          ? {
              position: 'fixed',
              top: coords ? `${coords.top}px` : undefined,
              left: coords ? `${coords.left}px` : undefined,
              width: coords ? `${coords.width}px` : undefined,
              visibility: coords ? 'visible' : 'hidden',
              pointerEvents: 'auto',
              zIndex: 1000,
            }
          : undefined
      }
      className={cn(
        'ui-combobox-menu',
        portaled ? 'ui-combobox-menu-portaled' : 'ui-combobox-menu-inline',
        menuClassName,
      )}
    >
      {searchable && items.length > 4 && (
        <div className="ui-combobox-search-box">
          <input
            ref={searchInputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={filteredOptions.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            aria-label={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleMenuKeyDown}
            placeholder={searchPlaceholder}
            className="ui-combobox-search-input"
          />
        </div>
      )}

      <ul className="ui-combobox-options-list">
        {filteredOptions.length === 0 ? (
          <li className="ui-combobox-empty-message">
            {emptyMessage}
          </li>
        ) : (
          filteredOptions.map((option, optionIndex) => {
            const isSelected = values.includes(option.value)
            const tooltipText = option.subLabel
              ? `${option.label} (${option.subLabel})`
              : option.label

            return (
              <Tooltip
                key={option.value}
                content={tooltipText}
                side="top"
              >
                <li
                  id={`${listboxId}-option-${optionIndex}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={() => {
                    if (!option.disabled) handleToggle(option.value)
                  }}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  className={cn(
                    'ui-combobox-option',
                    optionIndex === activeIndex && 'ui-combobox-option-active',
                    isSelected && 'ui-combobox-option-selected',
                    option.disabled && 'ui-combobox-option-disabled',
                  )}
                >
                  <div className="ui-combobox-option-content">
                    <span
                      className={cn(
                        'ui-combobox-checkbox',
                        isSelected && 'ui-combobox-checkbox-checked',
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <svg
                          className="ui-combobox-check-icon"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>

                    {option.dotColor && (
                      <span
                        className="ui-combobox-dot"
                        style={{ backgroundColor: option.dotColor }}
                        aria-hidden="true"
                      />
                    )}
                    {option.icon && (
                      <span className="ui-combobox-item-icon">{option.icon}</span>
                    )}
                    <span className="ui-combobox-item-label">{option.label}</span>
                  </div>

                  {option.subLabel && (
                    <span className="ui-combobox-item-sublabel">
                      {option.subLabel}
                    </span>
                  )}
                </li>
              </Tooltip>
            )
          })
        )}
      </ul>
    </div>
  )

  const comboboxContent = (
    <div className="ui-combobox-container" ref={containerRef}>
      {label && (
        <label
          htmlFor={buttonId}
          className="ui-combobox-label"
        >
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && !searchable && filteredOptions.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-label={ariaLabel ?? label ?? placeholder}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          setIsOpen(true)
          setActiveIndex(event.key === 'ArrowDown' ? 0 : Math.max(0, filteredOptions.length - 1))
        }}
        className={cn(
          'ui-combobox-trigger',
          size === 'sm' ? 'ui-combobox-trigger-sm' : 'ui-combobox-trigger-md',
          disabled && 'ui-combobox-trigger-disabled',
          isOpen && 'ui-combobox-trigger-active',
        )}
      >
        <span className="ui-combobox-trigger-left">
          <svg
            className="ui-combobox-icon-filter"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
              clipRule="evenodd"
            />
          </svg>
          <span className={cn('ui-combobox-trigger-text', selectedItems.length === 0 && 'ui-combobox-placeholder-text')}>
            {triggerText}
          </span>
        </span>

        <div className="ui-combobox-trigger-right">
          {clearable && selectedItems.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClearAll(e as unknown as React.MouseEvent)
                }
              }}
              aria-label={clearAriaLabel}
              className="ui-combobox-clear-btn"
            >
              <svg className="ui-combobox-clear-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 2.5l7 7m0-7l-7 7" />
              </svg>
            </span>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn(
              'ui-combobox-chevron',
              isOpen && 'ui-combobox-chevron-open',
            )}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {portaled && isMounted
        ? menuElement
          ? createPortal(menuElement, document.body)
          : null
        : menuElement}
    </div>
  )

  if (badgePlacement === 'beside') {
    return (
      <div className={cn('ui-combobox-beside-wrap', className)}>
        <div className="ui-combobox-beside-trigger">{comboboxContent}</div>
        {selectedItems.map((item) => {
          const onRemove = () => handleToggle(item.value)
          if (renderBadge) {
            return <div key={item.value}>{renderBadge(item, onRemove)}</div>
          }
          return (
            <Badge
              key={item.value}
              size="xs"
              onRemove={onRemove}
              removePlacement="top-right"
            >
              {item.label}
            </Badge>
          )
        })}
      </div>
    )
  }

  return <div className={cn('ui-combobox-root', className)}>{comboboxContent}</div>
}

export { MultiSelectCombobox as MultiSelect }
