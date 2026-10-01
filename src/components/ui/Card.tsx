import type { ReactNode } from 'react'
import { formatSampleFlag } from '../../domain/formatters'

interface CardProps {
  id: string
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ id, title, subtitle, action, className = '', children }: CardProps) {
  return (
    <article className={`card ${className}`.trim()} data-component-id={id}>
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        <div className="card-tools">
          {action}
          <span className="component-id">{id}</span>
        </div>
      </div>
      {children}
    </article>
  )
}

export function SampleBadge({ flag }: { flag: string }) {
  const className = flag === 'Sufficient' ? 'sufficient' : flag === 'Low sample' ? 'low' : 'uncalibrated'
  return <span className={`pill ${className}`}>{formatSampleFlag(flag)}</span>
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="state-panel empty-state" role="status">
      <span className="state-icon" aria-hidden="true">∅</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-panel error-state" role="alert">
      <span className="state-icon" aria-hidden="true">!</span>
      <strong>Không thể tải dữ liệu</strong>
      <p>{message}</p>
      <button className="btn btn-secondary" type="button" onClick={onRetry}>Thử lại</button>
    </div>
  )
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-label="Đang tải dữ liệu" role="status">
      {Array.from({ length: rows }, (_, index) => <span className="skeleton-line" key={index} />)}
    </div>
  )
}

export function IllustrativeLabel({ compact = false }: { compact?: boolean }) {
  return <span className={`illustrative-label${compact ? ' compact' : ''}`}>● Dữ liệu minh họa</span>
}
