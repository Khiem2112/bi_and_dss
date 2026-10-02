import type { ReactNode } from 'react'
import { formatSampleFlag } from '../../domain/formatters'
import { ComponentHelpButton } from './ComponentHelpButton'

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
          <div className="card-title-group">
            <h2>{title}</h2>
            <ComponentHelpButton componentId={id} title={title} />
          </div>
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
  const label = formatSampleFlag(flag)
  const description = flag === 'Sufficient'
    ? 'Cỡ mẫu đáp ứng ngưỡng đã công bố cho ngữ cảnh này.'
    : flag === 'Low sample'
      ? 'Cỡ mẫu chưa đạt ngưỡng để diễn giải ổn định.'
      : 'Ngưỡng cỡ mẫu chưa có phiên bản hiệu chỉnh được phê duyệt.'
  return <span className={`pill ${className}`} tabIndex={0} data-tooltip={description} aria-label={`${label}. ${description}`}>{label}</span>
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
  const description = 'Các giá trị dùng để kiểm thử bố cục và tương tác; không phải kết quả đo lường sản xuất.'
  return <span className={`illustrative-label${compact ? ' compact' : ''}`} tabIndex={0} data-tooltip={description} aria-label={`Dữ liệu minh họa. ${description}`}>● Dữ liệu minh họa</span>
}
