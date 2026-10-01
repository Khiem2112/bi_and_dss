import type {
  ComparisonContext,
  GlobalFilters,
  PredictionFilters,
  SpatialState,
  TemporalContext,
} from '../domain/types'
import { dashboardRepository } from '../repositories'
import { useRepositoryQuery } from './useRepositoryQuery'

export const useOverview = (filters: GlobalFilters) =>
  useRepositoryQuery(() => dashboardRepository.getOverview(filters), [JSON.stringify(filters)])

export const useAirportHotspots = (filters: GlobalFilters, localState: SpatialState) =>
  useRepositoryQuery(
    () => dashboardRepository.getAirportHotspots(filters, localState),
    [JSON.stringify(filters), JSON.stringify(localState)],
  )

export const useRouteCandidates = (filters: GlobalFilters, localState: SpatialState) =>
  useRepositoryQuery(
    () => dashboardRepository.getRouteCandidates(filters, localState),
    [JSON.stringify(filters), JSON.stringify(localState)],
  )

export const useTemporalPatterns = (filters: GlobalFilters, context: TemporalContext) =>
  useRepositoryQuery(
    () => dashboardRepository.getTemporalPatterns(filters, context),
    [JSON.stringify(filters), JSON.stringify(context)],
  )

export const useCarrierComparison = (context: ComparisonContext, peers: string[], enabled = true, filters?: GlobalFilters) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getCarrierComparison(context, peers, filters)
      : Promise.reject(new Error('Ngữ cảnh so sánh chưa sẵn sàng')),
    [JSON.stringify(context), peers.join(','), enabled, JSON.stringify(filters)],
  )

export const useFutureFlights = (filters: PredictionFilters, globalFilters?: GlobalFilters) =>
  useRepositoryQuery(() => dashboardRepository.getFutureFlights(filters, globalFilters), [JSON.stringify(filters), JSON.stringify(globalFilters)])

export const useRiskAggregates = (filters: PredictionFilters, globalFilters?: GlobalFilters) =>
  useRepositoryQuery(() => dashboardRepository.getRiskAggregates(filters, globalFilters), [JSON.stringify(filters), JSON.stringify(globalFilters)])

export const usePredictionExplanation = (id: string, enabled = true) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getPredictionExplanation(id)
      : Promise.reject(new Error('Chưa chọn chuyến bay hoặc phân đoạn')),
    [id, enabled],
  )

export const useSegmentEvidence = (entity: string, enabled = true, filters?: GlobalFilters) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getSegmentEvidence(entity, filters)
      : Promise.reject(new Error('Chưa chọn phân đoạn')),
    [entity, enabled, JSON.stringify(filters)],
  )

export const useCauseContext = (entity: string, enabled = true, filters?: GlobalFilters) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getCauseContext(entity, filters)
      : Promise.reject(new Error('Chưa chọn phân đoạn lịch sử')),
    [entity, enabled, JSON.stringify(filters)],
  )

