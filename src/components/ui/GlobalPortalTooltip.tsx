import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipState {
  visible: boolean
  text: string
  isMultiline: boolean
  x: number
  y: number
  placement: 'top' | 'bottom'
}

export function GlobalPortalTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    text: '',
    isMultiline: false,
    x: 0,
    y: 0,
    placement: 'top',
  })
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const currentTargetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function computeAndShow(target: HTMLElement) {
      const text = target.getAttribute('data-tooltip')
      if (!text || text.trim() === '') {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev))
        currentTargetRef.current = null
        return
      }

      currentTargetRef.current = target
      const isMultiline = target.hasAttribute('data-tooltip-multiline')
      const posAttr = target.getAttribute('data-tooltip-pos')
      const rect = target.getBoundingClientRect()

      const targetCenterX = rect.left + rect.width / 2
      let placement: 'top' | 'bottom' = posAttr === 'bottom' ? 'bottom' : 'top'
      let y = placement === 'top' ? rect.top - 8 : rect.bottom + 8

      if (placement === 'top' && y < 35) {
        placement = 'bottom'
        y = rect.bottom + 8
      } else if (placement === 'bottom' && y > window.innerHeight - 45) {
        placement = 'top'
        y = rect.top - 8
      }

      setTooltip({
        visible: true,
        text,
        isMultiline,
        x: targetCenterX,
        y,
        placement,
      })
    }

    function handlePointerOver(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest?.('[data-tooltip]') as HTMLElement | null
      if (target) {
        computeAndShow(target)
      }
    }

    function handlePointerOut(e: MouseEvent) {
      const related = e.relatedTarget as HTMLElement | null
      if (!related || !currentTargetRef.current?.contains(related)) {
        currentTargetRef.current = null
        setTooltip((prev) => ({ ...prev, visible: false }))
      }
    }

    function handleFocusIn(e: FocusEvent) {
      const target = (e.target as HTMLElement | null)?.closest?.('[data-tooltip]') as HTMLElement | null
      if (target) {
        computeAndShow(target)
      }
    }

    function handleFocusOut() {
      currentTargetRef.current = null
      setTooltip((prev) => ({ ...prev, visible: false }))
    }

    function handleScroll() {
      if (currentTargetRef.current) {
        computeAndShow(currentTargetRef.current)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      currentTargetRef.current = null
      setTooltip((prev) => ({ ...prev, visible: false }))
    }

    document.addEventListener('mouseover', handlePointerOver, true)
    document.addEventListener('mouseout', handlePointerOut, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('mouseover', handlePointerOver, true)
      document.removeEventListener('mouseout', handlePointerOut, true)
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  if (!tooltip.visible || !tooltip.text) return null

  return createPortal(
    <div
      ref={tooltipRef}
      className={`portal-tooltip ${tooltip.isMultiline ? 'portal-tooltip--multiline' : ''} portal-tooltip--${tooltip.placement}`}
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
      }}
      role="tooltip"
    >
      {tooltip.text}
    </div>,
    document.body
  )
}
