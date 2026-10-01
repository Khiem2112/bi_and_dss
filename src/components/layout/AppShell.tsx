import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { PageId } from '../../domain/types'

interface AppShellProps {
  onOpenMethodology: () => void
  children: ReactNode
}

const navItems: Array<{ id: PageId; code: string; label: string; detail: string }> = [
  { id: 'overview', code: 'P1', label: 'Tổng quan', detail: 'Network BI' },
  { id: 'spatial', code: 'P2', label: 'Sân bay & tuyến', detail: 'Place evidence' },
  { id: 'temporal', code: 'P3', label: 'Quy luật thời gian', detail: 'Time patterns' },
  { id: 'prediction', code: 'P4', label: 'Dự báo & ưu tiên', detail: 'DSS review' },
]

const pageMeta: Record<PageId, { title: string; detail: string }> = {
  overview: { title: 'Tổng quan mạng lưới', detail: 'Historical BI evidence · WN fixed' },
  spatial: { title: 'Sân bay & tuyến bay', detail: 'BL-AR · Rate, Gap và Sample' },
  temporal: { title: 'Quy luật thời gian', detail: 'BL-T · Scheduled Time Block' },
  prediction: { title: 'Dự báo & ưu tiên', detail: 'Illustrative risk · Human review' },
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
            <span>BI & DSS · v2 demo</span>
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
          <strong>Human-in-the-loop</strong>
          Dashboard chỉ hỗ trợ <em>review first</em>, <em>monitor</em> hoặc <em>insufficient evidence</em>; không phát lệnh vận hành.
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="context-block">
            <strong>{pageMeta[page].title}</strong>
            <span>{pageMeta[page].detail}</span>
          </div>
          <div className="top-actions">
            <span className="demo-badge">Illustrative demo</span>
            <button className="btn btn-secondary" type="button" onClick={onOpenMethodology}>Phương pháp</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
