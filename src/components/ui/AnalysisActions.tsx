import { useEffect, useId, useRef, useState } from 'react'
import type { WnAnalysisContext } from '../../domain/types'

interface AnalysisActionsProps {
  context: WnAnalysisContext
  onOpenComparison: (context: WnAnalysisContext) => void
  onOpenInvestigation: (context: WnAnalysisContext) => void
  compact?: boolean
  predictive?: boolean
}

export function AnalysisActions({
  context,
  onOpenComparison,
  onOpenInvestigation,
  compact = false,
  predictive = false,
}: AnalysisActionsProps) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setContextPosition(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setContextPosition(null)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => firstItemRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const invoke = (kind: 'comparison' | 'investigation') => {
    setOpen(false)
    setContextPosition(null)
    if (kind === 'comparison') onOpenComparison(context)
    else onOpenInvestigation(context)
  }

  return (
    <div
      className="analysis-actions"
      ref={rootRef}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setContextPosition({ x: event.clientX, y: event.clientY })
        setOpen(true)
      }}
    >
      <button
        className={`btn btn-secondary${compact ? ' btn--xs' : ''}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setContextPosition(null)
          setOpen((value) => !value)
        }}
      >
        Hành động phân tích <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div
          className={`analysis-actions-menu${contextPosition ? ' is-context' : ''}`}
          id={menuId}
          role="menu"
          aria-label={`Hành động phân tích cho ${context.sourceLabelVi}`}
          style={contextPosition ? { left: contextPosition.x, top: contextPosition.y, position: 'fixed' } : undefined}
        >
          <span className="analysis-actions-context">{context.sourceLabelVi}</span>
          <button ref={firstItemRef} type="button" role="menuitem" onClick={() => invoke('investigation')}>
            {predictive ? 'Điều tra chuyến lịch sử liên quan' : 'Điều tra chuyến liên quan'}
          </button>
          <button type="button" role="menuitem" onClick={() => invoke('comparison')}>
            So sánh đối thủ
          </button>
        </div>
      )}
    </div>
  )
}
