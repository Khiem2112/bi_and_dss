import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { PageId } from '../../domain/types'
import { GlobalPortalTooltip } from '../ui/GlobalPortalTooltip'

interface AppShellProps {
  onOpenMethodology: () => void
  children: ReactNode
}

const navItems: Array<{ id: PageId; code: string; label: string; detail: string }> = [
  { id: 'overview', code: 'P1', label: 'Tổng quan', detail: 'BI mạng lưới' },
  { id: 'spatial', code: 'P2', label: 'Sân bay & tuyến', detail: 'Bằng chứng không gian' },
  { id: 'temporal', code: 'P3', label: 'Quy luật thời gian', detail: 'Quy luật theo thời gian' },
  { id: 'prediction', code: 'P4', label: 'Dự báo & ưu tiên', detail: 'Đánh giá DSS' },
]

const pageMeta: Record<PageId, { title: string; detail: string }> = {
  overview: { title: 'Tổng quan mạng lưới', detail: 'Bằng chứng lịch sử BI · Cố định hãng WN' },
  spatial: { title: 'Sân bay & tuyến bay', detail: 'BL-AR · Tỷ lệ trễ, Chênh lệch và Cỡ mẫu' },
  temporal: { title: 'Quy luật thời gian', detail: 'BL-T · Khung giờ bay theo kế hoạch' },
  prediction: { title: 'Dự báo & ưu tiên', detail: 'Rủi ro minh họa · Đánh giá thủ công' },
}

export function AppShell({ onOpenMethodology, children }: AppShellProps) {
  const location = useLocation()
  const routePage = location.pathname.replace(/^\//, '')
  const page: PageId = navItems.some((item) => item.id === routePage) ? routePage as PageId : 'overview'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WN</div>
          <div className="brand-copy">
            <strong>Flight Intelligence</strong>
            <span>BI & DSS · Bản demo v2</span>
          </div>
        </div>
        <div className="nav-label">Luồng quyết định</div>
        <nav className="nav-list" aria-label="Điều hướng dashboard">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              to={`/${item.id}`}
              key={item.id}
            >
              <span className="nav-icon">{item.code}</span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>Đánh giá bởi con người (Human-in-the-loop)</strong>
          Bảng điều khiển chỉ hỗ trợ <em>ưu tiên xem xét</em>, <em>theo dõi</em> hoặc <em>chưa đủ bằng chứng</em>; không phát lệnh vận hành.
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="context-block">
            <strong>{pageMeta[page].title}</strong>
            <span>{pageMeta[page].detail}</span>
          </div>
          <div className="top-actions">
            <span className="demo-badge">Bản demo minh họa</span>
            <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Phương pháp</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <GlobalPortalTooltip />
    </div>
  )
}
