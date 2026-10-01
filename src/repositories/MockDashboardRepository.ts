import type {
  AirportHotspotsData,
  CarrierComparisonData,
  CauseContextData,
  ComparisonContext,
  FutureFlightsData,
  GlobalFilters,
  OverviewData,
  PredictionExplanationData,
  PredictionFilters,
  RiskAggregatesData,
  RouteCandidatesData,
  SegmentEvidenceData,
  SpatialState,
  TemporalPatternsData,
} from '../domain/types'
import type { DashboardRepository } from './DashboardRepository'

const wait = (duration = 240) => new Promise((resolve) => window.setTimeout(resolve, duration))

async function loadJson<T>(file: string): Promise<T> {
  await wait()
  const response = await fetch(`/mock-data/${file}`)
  if (!response.ok) throw new Error(`Không thể tải mock-data/${file}`)
  return response.json() as Promise<T>
}

export class MockDashboardRepository implements DashboardRepository {
  async getOverview() {
    return loadJson<OverviewData>('overview.json')
  }

  async getAirportHotspots(filters: GlobalFilters, localState: SpatialState) {
    void filters
    const payload = await loadJson<AirportHotspotsData>('airport-hotspots.json')
    const role = localState.grain === 'origin' ? 'Origin' : 'Destination'
    return { ...payload, airports: payload.airports.filter((airport) => airport.role === role) }
  }

  async getRouteCandidates(filters: GlobalFilters) {
    const payload = await loadJson<RouteCandidatesData>('route-candidates.json')
    const routes = payload.routes.filter((route) => {
      const [origin, destination] = route.route.split(' → ')
      return (filters.origin === 'all' || filters.origin === origin) &&
        (filters.destination === 'all' || filters.destination === destination)
    })
    return { ...payload, routes }
  }

  async getTemporalPatterns() {
    return loadJson<TemporalPatternsData>('temporal-patterns.json')
  }

  async getCarrierComparison(context: ComparisonContext, peers: string[]) {
    const payload = await loadJson<CarrierComparisonData>('carrier-comparisons.json')
    const allowed = new Set(['WN', ...peers])
    return {
      ...payload,
      entity: context.entity,
      carriers: payload.carriers.filter((carrier) => allowed.has(carrier.carrier)),
    }
  }

  async getFutureFlights(filters: PredictionFilters) {
    const payload = await loadJson<FutureFlightsData>('future-flights.json')
    return {
      ...payload,
      flights: filters.route ? payload.flights.filter((flight) => flight.route === filters.route) : payload.flights,
    }
  }

  async getRiskAggregates() {
    return loadJson<RiskAggregatesData>('predictions.json')
  }

  async getPredictionExplanation(id: string) {
    const payload = await loadJson<{ metadata: PredictionExplanationData['metadata']; explanations: PredictionExplanationData[] }>('explanations.json')
    const explanation = payload.explanations.find((item) => item.id === id) ?? payload.explanations[0]
    return { ...explanation, metadata: payload.metadata }
  }

  async getSegmentEvidence(entity: string) {
    const payload = await loadJson<SegmentEvidenceData>('segment-evidence.json')
    return { ...payload, entity }
  }

  async getCauseContext(entity: string) {
    const payload = await loadJson<CauseContextData>('cause-context.json')
    return { ...payload, entity }
  }
}
