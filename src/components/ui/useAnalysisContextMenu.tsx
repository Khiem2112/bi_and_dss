import { useCallback, useMemo, useState } from 'react'
import type { WnAnalysisContext } from '../../domain/types'
import { CustomContextMenu, type ContextMenuItem } from './CustomContextMenu'

interface AnalysisContextMenuOptions {
  entitySubtitle?: string
  extraItems?: ContextMenuItem[]
}

interface AnalysisContextMenuState extends AnalysisContextMenuOptions {
  context: WnAnalysisContext
  x: number
  y: number
}

export function useAnalysisContextMenu(
  onOpenComparison: (context: WnAnalysisContext) => void,
  onOpenInvestigation: (context: WnAnalysisContext) => void,
) {
  const [state, setState] = useState<AnalysisContextMenuState | null>(null)

  const openAnalysisContextMenu = useCallback((
    event: React.MouseEvent,
    context: WnAnalysisContext,
    options: AnalysisContextMenuOptions = {},
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setState({
      context,
      x: event.clientX,
      y: event.clientY,
      entitySubtitle: options.entitySubtitle,
      extraItems: options.extraItems,
    })
  }, [])

  const items = useMemo<ContextMenuItem[]>(() => {
    if (!state) return []
    const required: ContextMenuItem[] = [
      {
        label: 'Điều tra chuyến liên quan',
        onClick: () => onOpenInvestigation(state.context),
      },
      {
        label: 'So sánh đối thủ',
        onClick: () => onOpenComparison(state.context),
      },
    ]
    if (!state.extraItems?.length) return required
    return [
      ...required,
      { label: 'Phân cách', isDivider: true, onClick: () => undefined },
      ...state.extraItems,
    ]
  }, [onOpenComparison, onOpenInvestigation, state])

  const analysisContextMenu = state ? (
    <CustomContextMenu
      visible
      x={state.x}
      y={state.y}
      entityTitle={state.context.sourceLabelVi}
      entitySubtitle={state.entitySubtitle ?? 'Bằng chứng WN'}
      items={items}
      onClose={() => setState(null)}
    />
  ) : null

  return {
    analysisContextMenu,
    closeAnalysisContextMenu: () => setState(null),
    openAnalysisContextMenu,
  }
}
