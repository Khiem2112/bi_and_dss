import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { componentHelpRegistry } from '../../domain/componentHelpRegistry'

interface ComponentHelpButtonProps {
  componentId: string
  title: string
}

export function ComponentHelpButton({ componentId, title }: ComponentHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const help = componentHelpRegistry[componentId]

  function updatePosition() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 360
    let left = rect.left
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16)
    }
    let top = rect.bottom + 8
    if (top + 320 > window.innerHeight - 16 && rect.top > 340) {
      top = rect.top - 328
    }
    setPopoverPos({ top, left })
  }

  function handleToggle() {
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleScrollOrResize() {
      updatePosition()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  if (!help) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="help-trigger-btn"
        aria-label={`Giải thích: ${title}`}
        aria-expanded={isOpen}
        aria-controls={`help-popover-${componentId}`}
        onClick={handleToggle}
      >
        ?
      </button>

      {isOpen &&
        createPortal(
          <div
            id={`help-popover-${componentId}`}
            ref={popoverRef}
            className="help-popover"
            style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
            role="dialog"
            aria-labelledby={`help-title-${componentId}`}
          >
            <div className="help-popover-header">
              <div className="help-popover-title-row">
                <span className="help-popover-badge">{help.componentId}</span>
                <strong id={`help-title-${componentId}`}>{help.title}</strong>
              </div>
              <button
                type="button"
                className="help-close-btn"
                onClick={() => {
                  setIsOpen(false)
                  triggerRef.current?.focus()
                }}
                aria-label="Đóng bảng giải thích"
              >
                x
              </button>
            </div>

            <div className="help-popover-body">
              <div className="help-section">
                <div className="help-section-label">Mục đích</div>
                <p>{help.purpose}</p>
              </div>

              {help.analyticalQuestion && (
                <div className="help-section">
                  <div className="help-section-label">Câu hỏi phân tích</div>
                  <p>{help.analyticalQuestion}</p>
                </div>
              )}

              {help.grain && (
                <div className="help-section">
                  <div className="help-section-label">Đối tượng phân tích</div>
                  <p>{help.grain}</p>
                </div>
              )}

              {help.measures && help.measures.length > 0 && (
                <div className="help-section">
                  <div className="help-section-label">Chỉ số chính</div>
                  <ul className="help-measures-list">
                    {help.measures.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {help.filterScope && (
                <div className="help-section">
                  <div className="help-section-label">Phạm vi bộ lọc</div>
                  <p>{help.filterScope}</p>
                </div>
              )}

              {help.interpretation && (
                <div className="help-section help-section--highlight">
                  <div className="help-section-label">Quy ước diễn giải &amp; đọc hiểu</div>
                  <p>{help.interpretation}</p>
                </div>
              )}

              {help.limitation && (
                <div className="help-section">
                  <div className="help-section-label">Giới hạn &amp; Lưu ý</div>
                  <p className="help-limitation-text">{help.limitation}</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
