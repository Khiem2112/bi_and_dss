import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { GlobalFilterBar } from './components/filters/GlobalFilterBar'
import { type PageId, type WnAnalysisContext } from './domain/types'
import { bundleFromEvidence, createAnalysisContext } from './domain/analysisContext'
import { OverviewPage } from './pages/OverviewPage'
import { SpatialPage } from './pages/SpatialPage'
import { TemporalPage } from './pages/TemporalPage'
import { PredictionPage } from './pages/PredictionPage'
import { CarrierComparisonModal } from './overlays/CarrierComparisonModal'
import { SegmentEvidenceDrawer } from './overlays/SegmentEvidenceDrawer'
import { CauseContextDrawer } from './overlays/CauseContextDrawer'
import { PredictionExplanationDrawer } from './overlays/PredictionExplanationDrawer'
import { MethodologyModal } from './overlays/MethodologyModal'
import { FlightInvestigationModal } from './overlays/FlightInvestigationModal'

import { useFilterStore } from './stores/filterStore'
import { useOverlayStore } from './stores/overlayStore'

export type OverlayRoute =
  | { kind: 'comparison'; context: WnAnalysisContext }
  | { kind: 'flight-investigation'; context: WnAnalysisContext; carrierScope: 'WN' | 'peer_group'; frozenPeerCarriers: string[] }
  | { kind: 'evidence'; entity: string }
  | { kind: 'cause'; entity: string }
  | { kind: 'explanation'; id: string }
  | { kind: 'methodology' }



const isPage = (value: string): value is PageId => ['overview', 'spatial', 'temporal', 'prediction'].includes(value)

export default function App() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const routePage = location.pathname.replace(/^\//, '')
  const page: PageId = isPage(routePage) ? routePage : 'overview'

  const filters = useFilterStore((state) => state.filters)
  const setFilters = useFilterStore((state) => state.setFilters)
  const [selectedEntity, setSelectedEntity] = useState('Mạng lưới WN')

  const overlayState = useOverlayStore((state) => state.overlayState)
  const {
    openOverlay,
    closeOverlays,
    goBackOverlay,
    openEvidence,
    openCause,
    openComparison,
    openInvestigation,
  } = useOverlayStore()

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

  const fallbackContext = (entity: string) => createAnalysisContext({
    sourceComponentId: 'SD', sourceUnitId: entity, sourceLabelVi: entity,
    grain: entity.includes('→') ? 'route' : 'airport', comparisonIntent: entity.includes('→') ? 'rate' : 'airport',
    globalFilters: filters, metrics: bundleFromEvidence({ unavailableReason: 'Bộ chỉ số sẽ được lớp dịch vụ đối soát lại theo ngữ cảnh.' }),
    filters: entity.includes('→') ? { route: entity } : { airport: entity, airportRole: 'either' },
  })

  const overlay = overlayState.active

  return (
    <>
      <AppShell onOpenMethodology={() => openOverlay({ kind: 'methodology' })}>
        {page !== 'prediction' && <GlobalFilterBar filters={filters} onApply={(nextFilters) => { setFilters(nextFilters); showToast('Đã áp dụng phạm vi phân tích; các lựa chọn cục bộ được giữ nguyên.') }} />}
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage filters={filters} onNavigate={navigate} onSelectEntity={setSelectedEntity} onOpenComparison={openComparison} onOpenInvestigation={openInvestigation} onOpenEvidence={openEvidence} onOpenMethodology={() => openOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="/spatial" element={<SpatialPage filters={filters} initialEntity={selectedEntity} onNavigate={navigate} onOpenComparison={openComparison} onOpenInvestigation={openInvestigation} onOpenEvidence={openEvidence} onOpenCause={openCause} onSelectEntity={setSelectedEntity} onToast={showToast} />} />
          <Route path="/temporal" element={<TemporalPage filters={filters} selectedEntity={selectedEntity} onNavigate={navigate} onSelectEntity={setSelectedEntity} onOpenComparison={openComparison} onOpenInvestigation={openInvestigation} onOpenEvidence={openEvidence} onOpenCause={openCause} onOpenMethodology={() => openOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="/prediction" element={<PredictionPage selectedEntity={selectedEntity} globalFilters={filters} onOpenComparison={openComparison} onOpenInvestigation={openInvestigation} onOpenEvidence={openEvidence} onOpenExplanation={(id) => openOverlay({ kind: 'explanation', id })} onSelectEntity={setSelectedEntity} onOpenMethodology={() => openOverlay({ kind: 'methodology' })} onToast={showToast} />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AppShell>

      {overlay?.kind === 'comparison' && (
        <CarrierComparisonModal
          context={overlay.context}
          onClose={closeOverlays}
          onBack={overlayState.backStack.length ? goBackOverlay : undefined}
          onOpenInvestigation={(context, carriers, carrierScope) => openInvestigation(context, carriers, carrierScope)}
        />
      )}
      {overlay?.kind === 'flight-investigation' && (
        <FlightInvestigationModal
          context={overlay.context}
          carrierScope={overlay.carrierScope}
          frozenPeerCarriers={overlay.frozenPeerCarriers}
          onClose={closeOverlays}
          onBack={overlayState.backStack.length ? goBackOverlay : undefined}
        />
      )}
      {overlay?.kind === 'evidence' && (
        <SegmentEvidenceDrawer
          entity={overlay.entity}
          filters={filters}
          onClose={closeOverlays}
          onOpenComparison={() => openComparison(fallbackContext(overlay.entity))}
          onOpenCause={() => openCause(overlay.entity)}
          onToast={showToast}
        />
      )}
      {overlay?.kind === 'cause' && <CauseContextDrawer entity={overlay.entity} filters={filters} onClose={closeOverlays} />}
      {overlay?.kind === 'explanation' && <PredictionExplanationDrawer id={overlay.id} onClose={closeOverlays} onOpenEvidence={openEvidence} />}

      {overlay?.kind === 'methodology' && <MethodologyModal onClose={closeOverlays} />}

      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  )
}
