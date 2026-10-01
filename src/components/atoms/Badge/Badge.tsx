import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'coral'
  | 'outline'
  | 'success'
  | 'warning'
  | 'error'
  | 'muted'

export type BadgeSize = 'xs' | 'sm' | 'md'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly label?: ReactNode
  readonly children?: ReactNode
  readonly variant?: BadgeVariant
  readonly size?: BadgeSize
  readonly rounded?: boolean
  readonly useDot?: boolean
  readonly dotClassName?: string
  readonly onRemove?: () => void
  readonly removePlacement?: 'top-right' | 'inline'
  readonly removeAriaLabel?: string
}

export function Badge({
  label,
  children,
  variant = 'coral',
  size = 'xs',
  rounded = true,
  useDot = false,
  dotClassName,
  onRemove,
  removePlacement = 'top-right',
  removeAriaLabel,
  className,
  ...restProps
}: BadgeProps) {
  const content = children ?? label

  return (
    <span
      className={cn(
        'ui-badge',
        `ui-badge-${variant}`,
        `ui-badge-${size}`,
        rounded ? 'ui-badge-rounded' : 'ui-badge-square',
        onRemove && removePlacement === 'top-right' && 'ui-badge-removable-top',
        className,
      )}
      {...restProps}
    >
      {useDot && (
        <span
          className={cn('ui-badge-dot', dotClassName)}
          aria-hidden="true"
        />
      )}
      <span className="ui-badge-text">{content}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={removeAriaLabel ?? 'Xóa'}
          className={cn(
            'ui-badge-remove-btn',
            removePlacement === 'inline' ? 'ui-badge-remove-inline' : 'ui-badge-remove-top',
          )}
        >
          <svg
            className="ui-badge-remove-icon"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M2.5 2.5l7 7m0-7l-7 7" />
          </svg>
        </button>
      )}
    </span>
  )
}
