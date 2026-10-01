import { useEffect, useRef, type ReactNode } from 'react'

interface OverlayFrameProps {
  mode: 'modal' | 'drawer'
  componentId: string
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function OverlayFrame({ mode, componentId, title, subtitle, onClose, children, footer, wide = false }: OverlayFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    titleRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  return (
    <div className={`overlay-backdrop open ${mode}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`overlay-panel ${mode}${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`${componentId}-title`} ref={panelRef}>
        <header className="overlay-header">
          <div>
            <span className="component-id">{componentId}</span>
            <h2 id={`${componentId}-title`} tabIndex={-1} ref={titleRef}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label={`Đóng ${title}`}>Đóng ×</button>
        </header>
        <div className="overlay-content">{children}</div>
        {footer && <footer className="overlay-footer">{footer}</footer>}
      </div>
    </div>
  )
}
