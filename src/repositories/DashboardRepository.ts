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
  TemporalContext,
  TemporalPatternsData,
} from '../domain/types'

export interface DashboardRepository {
  getOverview(filters: GlobalFilters): Promise<OverviewData>
  getAirportHotspots(filters: GlobalFilters, localState: SpatialState): Promise<AirportHotspotsData>
  getRouteCandidates(filters: GlobalFilters, localState: SpatialState): Promise<RouteCandidatesData>
  getTemporalPatterns(filters: GlobalFilters, context: TemporalContext): Promise<TemporalPatternsData>
  getCarrierComparison(context: ComparisonContext, peers: string[]): Promise<CarrierComparisonData>
  getFutureFlights(filters: PredictionFilters): Promise<FutureFlightsData>
  getRiskAggregates(filters: PredictionFilters): Promise<RiskAggregatesData>
  getPredictionExplanation(id: string): Promise<PredictionExplanationData>
  getSegmentEvidence(entity: string): Promise<SegmentEvidenceData>
  getCauseContext(entity: string): Promise<CauseContextData>
}
