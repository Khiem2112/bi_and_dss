import { useEffect } from 'react'

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
  useEffect(() => {
    if (!visible) return
    const handleClose = () => onClose()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible) return null

  const safeX = Math.min(x, window.innerWidth - 260)
  const safeY = Math.min(y, window.innerHeight - 300)

  return (
    <div
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
    </div>
  )
}
