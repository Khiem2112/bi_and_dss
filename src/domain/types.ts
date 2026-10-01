export type PageId = 'overview' | 'spatial' | 'temporal' | 'prediction'

export type SampleFlag = 'Sufficient' | 'Low sample' | 'Uncalibrated'

export interface DashboardMetadata {
  illustrative: true
  schemaVersion: string
  generatedAt: string
  asOfDate: string
  dataLabel: string
  baselineRuleVersion?: string
  sampleRuleVersion?: string
  modelVersion?: string
  priorityRuleVersion?: string
  predictionHorizon?: string
  scoringCutoff?: string
  sampleMultiplier?: number
  scalingRuleVersion?: string
  baseRecordCount?: number
  weightedSampleSize?: number
}


export interface GlobalFilters {
  fromDate: string
  toDate: string
  origin: string[]
  destination: string[]
  season: string[]
  distanceGroup: string[]
}

export const defaultFilters: GlobalFilters = {
  fromDate: '2018-01-01',
  toDate: '2018-12-31',
  origin: [],
  destination: [],
  season: [],
  distanceGroup: [],
}

export interface KpiValue {
  id: string
  label: string
  value: string
  context: string
}

export interface TrendPoint {
  period: string
  value: number
  n: number
  baseline?: number
}

export interface EvidenceRecord {
  id: string
  entity: string
  entityType: 'Airport' | 'Route' | 'Time'
  rate: number
  baseline: number | null
  gap: number | null
  averageDelay: number
  n: number
  flag: SampleFlag
}

export interface AirportHotspot extends EvidenceRecord {
  code: string
  role: 'Destination' | 'Origin'
  x: number
  y: number
}

export interface RouteCandidate extends EvidenceRecord {
  route: string
  sparkline: number[]
}

export interface OverviewData {
  metadata: DashboardMetadata
  kpis: KpiValue[]
  actualTrend: TrendPoint[]
  predictedTrend: TrendPoint[]
  destinations: AirportHotspot[]
  candidates: EvidenceRecord[]
}

export interface AirportHotspotsData {
  metadata: DashboardMetadata
  airports: AirportHotspot[]
}

export interface RouteCandidatesData {
  metadata: DashboardMetadata
  routes: RouteCandidate[]
  selectedHistory: TrendPoint[]
}

export interface HeatCell {
  day: string
  block: string
  rate: number
  gap: number | null
  n: number
  flag: SampleFlag
}

export interface SeasonMonth {
  month: string
  rate: number
  gap: number
  n: number
}

export interface SeasonSummary {
  season: string
  rate: number
  months: SeasonMonth[]
}

export interface TemporalPatternsData {
  metadata: DashboardMetadata
  heatmap: HeatCell[]
  seasons: SeasonSummary[]
  monthlyTrend: TrendPoint[]
  routes: RouteCandidate[]
}

export interface CarrierMetric {
  carrier: string
  name: string
  eligible: number
  delayed: number
  rate: number
  averageDelay: number
  gapVsWn: number | null
  flag: SampleFlag
}

export interface CarrierBreakdown {
  cell: string
  wnRate: number
  peerRate: number
  wnN: number
  peerN: number
}

export interface CarrierComparisonData {
  metadata: DashboardMetadata
  contextId: string
  entity: string
  baselineId: string
  sharedCells: number
  includedFlights: number
  excludedFlights: number
  coverage: number
  carriers: CarrierMetric[]
  trend: Record<string, TrendPoint[]>
  breakdown: CarrierBreakdown[]
}

export interface FutureFlight {
  id: string
  flightNumber: string
  departureAt: string
  route: string
  probability: number
  riskLabel: 'High' | 'Elevated' | 'Monitor'
  modelVersion: string
}

export interface FutureFlightsData {
  metadata: DashboardMetadata
  flights: FutureFlight[]
}

export interface RiskAggregate {
  id: string
  entity: string
  type: 'Route' | 'Airport' | 'Time'
  expectedRate: number
  highRiskShare: number
  historicalRate: number
  historicalGap: number
  scoredN: number
  historicalN: number
  sampleFlag: SampleFlag
  priority: 'Review first' | 'Monitor' | 'Uncalibrated'
  rationale: string
}

export interface RiskAggregatesData {
  metadata: DashboardMetadata
  aggregates: RiskAggregate[]
  byTime: Array<{ label: string; expectedRate: number; n: number }>
}

export interface ExplanationContributor {
  label: string
  direction: 'up' | 'down'
  strength: number
  description: string
}

export interface PredictionExplanationData {
  metadata: DashboardMetadata
  id: string
  entity: string
  probability: number
  contributors: ExplanationContributor[]
  missingFeatures: string[]
  limitation: string
}

export interface SegmentEvidenceData {
  metadata: DashboardMetadata
  entity: string
  historicalRate: number
  baselineRate: number
  gap: number
  eligible: number
  delayed: number
  averageDelay: number
  sampleFlag: SampleFlag
  predictedRisk: number | null
  checks: Array<{ label: string; status: 'available' | 'pending' }>
}

export interface CauseContextData {
  metadata: DashboardMetadata
  entity: string
  delayedN: number
  recordedN: number
  causes: Array<{ label: string; share: number; flights: number }>
}

export interface QueryState<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  isEmpty: boolean
  refetch: () => void
  metadata: DashboardMetadata | null
}

export interface SpatialState {
  grain: 'destination' | 'origin' | 'route'
  metric: 'rate' | 'gap'
  selectedId?: string
}

export interface TemporalContext {
  route?: string
  selectedCell?: string
  selectedSeason?: string
}

export interface PredictionFilters {
  window: string
  route?: string
  timeBlock?: string
}

export interface ComparisonContext {
  entity: string
  variant: 'CM-R' | 'CM-A' | 'CM-T' | 'CM-F'
}

export interface FlightRecord {
  FL_DATE: string
  OP_CARRIER: string
  OP_CARRIER_FL_NUM: number | string
  ORIGIN: string
  DEST: string
  CRS_DEP_TIME: number
  DEP_TIME: number | null
  DEP_DELAY: number | null
  TAXI_OUT: number | null
  WHEELS_OFF: number | null
  WHEELS_ON: number | null
  TAXI_IN: number | null
  CRS_ARR_TIME: number
  ARR_TIME: number | null
  ARR_DELAY: number | null
  CANCELLED: number
  CANCELLATION_CODE: string | null
  DIVERTED: number
  CRS_ELAPSED_TIME: number | null
  ACTUAL_ELAPSED_TIME: number | null
  AIR_TIME: number | null
  DISTANCE: number
  CARRIER_DELAY: number | null
  WEATHER_DELAY: number | null
  NAS_DELAY: number | null
  SECURITY_DELAY: number | null
  LATE_AIRCRAFT_DELAY: number | null
}

export interface AirportLocation {
  code: string
  name: string
  city: string
  state: string
  x: number
  y: number
  lat?: number
  lng?: number
}

