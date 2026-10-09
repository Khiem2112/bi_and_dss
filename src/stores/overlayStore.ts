import { create } from 'zustand'
import type {
  AnalysisGrain,
  ComparisonIntent,
  DelayMetricBundle,
  WnAnalysisContext,
  WnAnalysisFilters,
} from '../domain/types'
import { createAnalysisContext } from '../domain/analysisContext'
import { useFilterStore } from './filterStore'

export type OverlayRoute =
  | { kind: 'comparison'; context: WnAnalysisContext }
  | { kind: 'flight-investigation'; context: WnAnalysisContext; carrierScope: 'WN' | 'peer_group'; frozenPeerCarriers: string[] }
  | { kind: 'evidence'; entity: string }
  | { kind: 'cause'; entity: string }
  | { kind: 'explanation'; id: string }
  | { kind: 'methodology' }

export interface OverlayState {
  active: OverlayRoute | null
  backStack: OverlayRoute[]
}

export interface AnalysisTargetRequest {
  sourceComponentId: string
  sourceUnitId: string
  sourceLabelVi: string
  grain: AnalysisGrain
  comparisonIntent: ComparisonIntent
  metrics: DelayMetricBundle
  filters?: Partial<WnAnalysisFilters>
}

export type AnalysisTargetInput = WnAnalysisContext | AnalysisTargetRequest

export function isAnalysisContext(value: AnalysisTargetInput): value is WnAnalysisContext {
  return typeof value === 'object' && value !== null && 'openedAt' in value
}

export function resolveTargetToContext(target: AnalysisTargetInput): WnAnalysisContext {
  if (isAnalysisContext(target)) {
    return target
  }
  const globalFilters = useFilterStore.getState().filters
  return createAnalysisContext({
    sourceComponentId: target.sourceComponentId,
    sourceUnitId: target.sourceUnitId,
    sourceLabelVi: target.sourceLabelVi,
    grain: target.grain,
    comparisonIntent: target.comparisonIntent,
    globalFilters,
    metrics: target.metrics,
    filters: target.filters,
  })
}

interface OverlayStoreState {
  overlayState: OverlayState
  openOverlay: (route: OverlayRoute, preserveActive?: boolean) => void
  closeOverlays: () => void
  goBackOverlay: () => void
  updateComparisonContext: (context: WnAnalysisContext) => void
  openComparison: (target: AnalysisTargetInput) => void
  openInvestigation: (
    target: AnalysisTargetInput,
    frozenPeerCarriers?: string[],
    carrierScope?: 'WN' | 'peer_group',
  ) => void
  openEvidence: (entity: string) => void
  openCause: (entity: string) => void
  openExplanation: (id: string) => void
  openMethodology: () => void
}

export const useOverlayStore = create<OverlayStoreState>((set) => ({
  overlayState: { active: null, backStack: [] },

  openOverlay: (route, preserveActive = false) => {
    set((current) => ({
      overlayState: {
        active: route,
        backStack: preserveActive && current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  closeOverlays: () => {
    set({ overlayState: { active: null, backStack: [] } })
  },

  goBackOverlay: () => {
    set((current) => {
      const { backStack } = current.overlayState
      const previous = backStack[backStack.length - 1] ?? null
      return {
        overlayState: {
          active: previous,
          backStack: backStack.slice(0, -1),
        },
      }
    })
  },

  updateComparisonContext: (context) => {
    set((current) => ({
      overlayState: {
        ...current.overlayState,
        active: current.overlayState.active?.kind === 'comparison'
          ? { kind: 'comparison', context }
          : current.overlayState.active,
      },
    }))
  },

  openComparison: (target) => {
    const context = resolveTargetToContext(target)
    set((current) => ({
      overlayState: {
        active: { kind: 'comparison', context },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  openInvestigation: (target, frozenPeerCarriers = [], carrierScope = 'WN') => {
    const context = resolveTargetToContext(target)
    set((current) => ({
      overlayState: {
        active: { kind: 'flight-investigation', context, frozenPeerCarriers, carrierScope },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  openEvidence: (entity) => {
    set((current) => ({
      overlayState: {
        active: { kind: 'evidence', entity },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  openCause: (entity) => {
    set((current) => ({
      overlayState: {
        active: { kind: 'cause', entity },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  openExplanation: (id) => {
    set((current) => ({
      overlayState: {
        active: { kind: 'explanation', id },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },

  openMethodology: () => {
    set((current) => ({
      overlayState: {
        active: { kind: 'methodology' },
        backStack: current.overlayState.active
          ? [...current.overlayState.backStack, current.overlayState.active]
          : [],
      },
    }))
  },
}))
