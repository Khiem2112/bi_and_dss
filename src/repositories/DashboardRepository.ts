import type {
  AirportHotspotsData,
  CarrierComparisonData,
  CauseContextData,
  ComparisonContext,
  EntityTrendFilters,
  FutureFlightsData,
  GlobalFilters,
  GranularTrendsData,
  OverviewData,
  PredictionExplanationData,
  PredictionFilters,
  RiskAggregatesData,
  RouteCandidatesData,
  SegmentEvidenceData,
  SpatialState,
  TemporalContext,
  TemporalPatternsData,
} from '../domain/types'

export interface DashboardRepository {
  getOverview(filters: GlobalFilters): Promise<OverviewData>
  getAirportHotspots(filters: GlobalFilters, localState: SpatialState): Promise<AirportHotspotsData>
  getRouteCandidates(filters: GlobalFilters, localState: SpatialState): Promise<RouteCandidatesData>
  getEntityTrend(entityFilters: EntityTrendFilters, globalFilters: GlobalFilters): Promise<GranularTrendsData>
  getTemporalPatterns(filters: GlobalFilters, context: TemporalContext): Promise<TemporalPatternsData>
  getCarrierComparison(context: ComparisonContext, peers: string[], filters?: GlobalFilters): Promise<CarrierComparisonData>
  getFutureFlights(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<FutureFlightsData>
  getRiskAggregates(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<RiskAggregatesData>
  getPredictionExplanation(id: string): Promise<PredictionExplanationData>
  getSegmentEvidence(entity: string, filters?: GlobalFilters): Promise<SegmentEvidenceData>
  getCauseContext(entity: string, filters?: GlobalFilters): Promise<CauseContextData>
}

