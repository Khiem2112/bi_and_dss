import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  disabled?: boolean
  isDivider?: boolean
}

export interface CustomContextMenuProps {
  visible: boolean
  x: number
  y: number
  entityTitle: string
  entitySubtitle?: string
  items: ContextMenuItem[]
  onClose: () => void
}

export function CustomContextMenu({
  visible,
  x,
  y,
  entityTitle,
  entitySubtitle = 'Thực thể',
  items,
  onClose,
}: CustomContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handleClose = () => onClose()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
      if (!buttons.length) return
      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const direction = e.key === 'ArrowDown' ? 1 : -1
        buttons[(currentIndex + direction + buttons.length) % buttons.length]?.focus()
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        buttons[e.key === 'Home' ? 0 : buttons.length - 1]?.focus()
      }
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    window.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus(), 0)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible) return null

  const safeX = Math.max(8, Math.min(x, window.innerWidth - 260))
  const safeY = Math.max(8, Math.min(y, window.innerHeight - 300))

  return createPortal(
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      role="menu"
      aria-label={`Menu thao tác cho ${entityTitle}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-header">
        <span>{entitySubtitle}</span>
        <strong>{entityTitle}</strong>
      </div>

      {items.map((item, idx) => {
        if (item.isDivider) {
          return <div key={`divider-${idx}`} className="context-menu-divider" />
        }
        return (
          <button
            key={item.label}
            type="button"
            className="context-menu-item"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick()
              onClose()
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
