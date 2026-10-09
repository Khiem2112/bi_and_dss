import type {
  AnalysisGrain,
  ComparisonIntent,
  DelayMetricBundle,
  GlobalFilters,
  WnAnalysisContext,
  WnAnalysisFilters,
} from './types'

import { useFilterStore } from '../stores/filterStore'

export interface CreateAnalysisContextInput {
  sourceComponentId: string
  sourceUnitId: string
  sourceLabelVi: string
  grain: AnalysisGrain
  comparisonIntent: ComparisonIntent
  globalFilters?: GlobalFilters
  metrics: DelayMetricBundle
  filters?: Partial<WnAnalysisFilters>
}

export function createAnalysisContext(input: CreateAnalysisContextInput): WnAnalysisContext {
  const activeGlobalFilters = input.globalFilters ?? useFilterStore.getState().filters
  const distanceFilter = activeGlobalFilters.distanceFilter
  return {
    sourceComponentId: input.sourceComponentId,
    sourceUnitId: input.sourceUnitId,
    sourceLabelVi: input.sourceLabelVi,
    carrier: 'WN',
    grain: input.grain,
    comparisonIntent: input.comparisonIntent,
    filters: {
      dateFrom: activeGlobalFilters.fromDate,
      dateTo: activeGlobalFilters.toDate,
      airportClauses: activeGlobalFilters.airportClauses.length
        ? activeGlobalFilters.airportClauses.map((clause) => ({ ...clause }))
        : undefined,
      dayOfWeeks: activeGlobalFilters.dayOfWeek.length ? [...activeGlobalFilters.dayOfWeek] : undefined,
      scheduledTimeBlocks: activeGlobalFilters.scheduledTimeBlock.length ? [...activeGlobalFilters.scheduledTimeBlock] : undefined,
      distanceGroups: distanceFilter?.mode === 'groups' && distanceFilter.groups.length ? [...distanceFilter.groups] : undefined,
      distanceRange: distanceFilter?.mode === 'range'
        ? { minMiles: distanceFilter.minMiles, maxMiles: distanceFilter.maxMiles }
        : undefined,
      ...input.filters,
    },
    metricSnapshot: { ...input.metrics },
    openedAt: new Date().toISOString(),
  }
}


export function bundleFromEvidence(input: {
  eligible?: number
  delayed?: number
  rate?: number | null
  averageDelay?: number | null
  unavailableReason?: string
}): DelayMetricBundle {
  const eligibleFlights = input.eligible ?? 0
  const delayedFlights = input.delayed ?? 0
  return {
    eligibleFlights,
    delayedFlights,
    delayRate: input.rate ?? null,
    averageArrivalDelayMinutes: input.averageDelay ?? null,
    unavailableReason: input.unavailableReason ?? (eligibleFlights === 0 ? 'Không có chuyến bay đủ điều kiện' : undefined),
  }
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

export function filtersForTrendPeriod(
  period: string,
  granularity: 'month' | 'week' | 'day' = 'month',
): Partial<WnAnalysisFilters> {
  if (granularity === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return { dateFrom: period, dateTo: period }
  }

  if (granularity === 'week') {
    const match = /^(\d{4})-W(\d{2})$/.exec(period)
    if (match) {
      const year = Number(match[1])
      const week = Number(match[2])
      const januaryFourth = new Date(Date.UTC(year, 0, 4))
      const mondayOffset = (januaryFourth.getUTCDay() + 6) % 7
      const monday = new Date(januaryFourth)
      monday.setUTCDate(januaryFourth.getUTCDate() - mondayOffset + (week - 1) * 7)
      const sunday = new Date(monday)
      sunday.setUTCDate(monday.getUTCDate() + 6)
      return { dateFrom: isoDate(monday), dateTo: isoDate(sunday) }
    }
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const month = Number(monthMatch[2])
    const finalDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
      dateFrom: `${monthMatch[1]}-${monthMatch[2]}-01`,
      dateTo: `${monthMatch[1]}-${monthMatch[2]}-${String(finalDay).padStart(2, '0')}`,
    }
  }

  return {}
}
