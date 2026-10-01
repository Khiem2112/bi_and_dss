import { useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

export type TooltipProps = {
  readonly content: ReactNode
  readonly children: ReactNode
  readonly side?: TooltipSide
  readonly delayDuration?: number
  readonly className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  if (!content) {
    return <>{children}</>
  }

  return (
    <div
      className="ui-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn('ui-tooltip-bubble', `ui-tooltip-${side}`, className)}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export function TooltipProvider({ children }: { readonly children: ReactNode }) {
  return <>{children}</>
}
