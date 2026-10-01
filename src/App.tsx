import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { GlobalFilterBar } from './components/filters/GlobalFilterBar'
import { defaultFilters, type ComparisonContext, type GlobalFilters, type PageId } from './domain/types'
import { OverviewPage } from './pages/OverviewPage'
import { SpatialPage } from './pages/SpatialPage'
import { TemporalPage } from './pages/TemporalPage'
import { PredictionPage } from './pages/PredictionPage'
import { CarrierComparisonModal } from './overlays/CarrierComparisonModal'
import { SegmentEvidenceDrawer } from './overlays/SegmentEvidenceDrawer'
import { CauseContextDrawer } from './overlays/CauseContextDrawer'
import { PredictionExplanationDrawer } from './overlays/PredictionExplanationDrawer'
import { MethodologyModal } from './overlays/MethodologyModal'

type OverlayState =
  | { kind: 'comparison'; context: ComparisonContext }
  | { kind: 'evidence'; entity: string }
  | { kind: 'cause'; entity: string }
  | { kind: 'explanation'; id: string }
  | { kind: 'methodology' }
  | null

const isPage = (value: string): value is PageId => ['overview', 'spatial', 'temporal', 'prediction'].includes(value)

export default function App() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const routePage = location.pathname.replace(/^\//, '')
  const page: PageId = isPage(routePage) ? routePage : 'overview'
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters)
  const [selectedEntity, setSelectedEntity] = useState('DAL → ATL')
  const [overlay, setOverlay] = useState<OverlayState>(null)
  const [toast, setToast] = useState('')

  const showToast = useCallback((message: string) => setToast(message), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigate = (nextPage: PageId) => {
    routerNavigate(`/${nextPage}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEvidence = (entity: string) => setOverlay({ kind: 'evidence', entity })
  const openCause = (entity: string) => setOverlay({ kind: 'cause', entity })
  const openComparison = (context: ComparisonContext) => setOverlay({ kind: 'comparison', context })

  return (
    <>
      <AppShell onOpenMethodology={() => setOverlay({ kind: 'methodology' })}>
        {page !== 'prediction' && <GlobalFilterBar filters={filters} onApply={(nextFilters) => { setFilters(nextFilters); showToast('Đã áp dụng phạm vi phân tích; các lựa chọn cục bộ được giữ nguyên.') }} />}
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage filters={filters} onNavigate={navigate} onSelectEntity={setSelectedEntity} onOpenEvidence={openEvidence} onOpenMethodology={() => setOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="/spatial" element={<SpatialPage filters={filters} initialEntity={selectedEntity} onNavigate={navigate} onOpenComparison={openComparison} onOpenEvidence={openEvidence} onOpenCause={openCause} onSelectEntity={setSelectedEntity} onToast={showToast} />} />
          <Route path="/temporal" element={<TemporalPage filters={filters} selectedEntity={selectedEntity} onNavigate={navigate} onSelectEntity={setSelectedEntity} onOpenComparison={openComparison} onOpenEvidence={openEvidence} onOpenCause={openCause} onOpenMethodology={() => setOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="/prediction" element={<PredictionPage selectedEntity={selectedEntity} onOpenComparison={openComparison} onOpenEvidence={openEvidence} onOpenExplanation={(id) => setOverlay({ kind: 'explanation', id })} onSelectEntity={setSelectedEntity} onOpenMethodology={() => setOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AppShell>

      {overlay?.kind === 'comparison' && (
        <CarrierComparisonModal
          context={overlay.context}
          onClose={() => setOverlay(null)}
          onOpenEvidence={(entity) => setOverlay({ kind: 'evidence', entity })}
          onToast={showToast}
        />
      )}
      {overlay?.kind === 'evidence' && (
        <SegmentEvidenceDrawer
          entity={overlay.entity}
          onClose={() => setOverlay(null)}
          onOpenComparison={() => setOverlay({ kind: 'comparison', context: { entity: overlay.entity, variant: 'CM-R' } })}
          onOpenCause={() => setOverlay({ kind: 'cause', entity: overlay.entity })}
          onToast={showToast}
        />
      )}
      {overlay?.kind === 'cause' && <CauseContextDrawer entity={overlay.entity} onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'explanation' && <PredictionExplanationDrawer id={overlay.id} onClose={() => setOverlay(null)} onOpenEvidence={(entity) => setOverlay({ kind: 'evidence', entity })} />}
      {overlay?.kind === 'methodology' && <MethodologyModal onClose={() => setOverlay(null)} />}

      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  )
}
