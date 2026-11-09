import type {
  AirportHotspotsData,
  CauseContextData,
  EntityTrendFilters,
  FlightInvestigationRequest,
  FlightInvestigationResult,
  FutureFlightsData,
  GlobalFilters,
  GranularTrendsData,
  OverviewData,
  PeerBenchmarkRequest,
  PeerBenchmarkResult,
  PredictionExplanationData,
  PredictionFilters,
  RiskAggregatesData,
  RouteCandidatesData,
  SegmentEvidenceData,
  SpatialState,
  TemporalContext,
  TemporalPatternsData,
} from '../domain/types'
import type { DashboardRepository } from './DashboardRepository'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const postJson = async <T>(endpoint: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Lỗi kết nối kho dữ liệu (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

const getJson = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Lỗi kết nối kho dữ liệu (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

export class ApiDashboardRepository implements DashboardRepository {
  async getOverview(filters: GlobalFilters): Promise<OverviewData> {
    return postJson<OverviewData>('/overview', { filters })
  }

  async getAirportHotspots(filters: GlobalFilters, localState: SpatialState): Promise<AirportHotspotsData> {
    return postJson<AirportHotspotsData>('/spatial/airports', { filters, localState })
  }

  async getRouteCandidates(filters: GlobalFilters, localState: SpatialState): Promise<RouteCandidatesData> {
    return postJson<RouteCandidatesData>('/spatial/routes', { filters, localState })
  }

  async getEntityTrend(entityFilters: EntityTrendFilters, globalFilters: GlobalFilters): Promise<GranularTrendsData> {
    return postJson<GranularTrendsData>('/temporal/granular-trends', { entityFilters, globalFilters })
  }

  async getTemporalPatterns(filters: GlobalFilters, context: TemporalContext): Promise<TemporalPatternsData> {
    return postJson<TemporalPatternsData>('/temporal/patterns', { filters, context })
  }

  async getPeerBenchmark(request: PeerBenchmarkRequest): Promise<PeerBenchmarkResult> {
    return postJson<PeerBenchmarkResult>('/benchmark', { request })
  }

  async getFlightInvestigation(request: FlightInvestigationRequest): Promise<FlightInvestigationResult> {
    return postJson<FlightInvestigationResult>('/investigation', { request })
  }

  async getFutureFlights(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<FutureFlightsData> {
    return postJson<FutureFlightsData>('/predictions/future-flights', { filters, globalFilters })
  }

  async getRiskAggregates(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<RiskAggregatesData> {
    return postJson<RiskAggregatesData>('/predictions/risk-aggregates', { filters, globalFilters })
  }

  async getPredictionExplanation(id: string): Promise<PredictionExplanationData> {
    return getJson<PredictionExplanationData>(`/predictions/explanation/${encodeURIComponent(id)}`)
  }

  async getSegmentEvidence(entity: string, filters?: GlobalFilters): Promise<SegmentEvidenceData> {
    return postJson<SegmentEvidenceData>('/evidence/segment', { entity, filters })
  }

  async getCauseContext(entity: string, filters?: GlobalFilters): Promise<CauseContextData> {
    return postJson<CauseContextData>('/causes', { entity, filters })
  }
}
