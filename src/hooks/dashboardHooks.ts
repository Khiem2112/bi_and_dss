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

export const useCarrierComparison = (context: ComparisonContext, peers: string[], enabled = true) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getCarrierComparison(context, peers)
      : Promise.reject(new Error('Ngữ cảnh so sánh chưa sẵn sàng')),
    [JSON.stringify(context), peers.join(','), enabled],
  )

export const useFutureFlights = (filters: PredictionFilters) =>
  useRepositoryQuery(() => dashboardRepository.getFutureFlights(filters), [JSON.stringify(filters)])

export const useRiskAggregates = (filters: PredictionFilters) =>
  useRepositoryQuery(() => dashboardRepository.getRiskAggregates(filters), [JSON.stringify(filters)])

export const usePredictionExplanation = (id: string, enabled = true) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getPredictionExplanation(id)
      : Promise.reject(new Error('Chưa chọn chuyến bay hoặc phân đoạn')),
    [id, enabled],
  )

export const useSegmentEvidence = (entity: string, enabled = true) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getSegmentEvidence(entity)
      : Promise.reject(new Error('Chưa chọn phân đoạn')),
    [entity, enabled],
  )

export const useCauseContext = (entity: string, enabled = true) =>
  useRepositoryQuery(
    () => enabled
      ? dashboardRepository.getCauseContext(entity)
      : Promise.reject(new Error('Chưa chọn phân đoạn lịch sử')),
    [entity, enabled],
  )
