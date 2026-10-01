import type { DashboardRepository } from './DashboardRepository'

export class ApiDashboardRepository implements DashboardRepository {
  private unavailable(): never {
    throw new Error('API repository chưa được cấu hình. Demo đang dùng mock repository có version.')
  }

  getOverview: DashboardRepository['getOverview'] = async () => this.unavailable()
  getAirportHotspots: DashboardRepository['getAirportHotspots'] = async () => this.unavailable()
  getRouteCandidates: DashboardRepository['getRouteCandidates'] = async () => this.unavailable()
  getEntityTrend: DashboardRepository['getEntityTrend'] = async () => this.unavailable()
  getTemporalPatterns: DashboardRepository['getTemporalPatterns'] = async () => this.unavailable()
  getCarrierComparison: DashboardRepository['getCarrierComparison'] = async () => this.unavailable()
  getFutureFlights: DashboardRepository['getFutureFlights'] = async () => this.unavailable()
  getRiskAggregates: DashboardRepository['getRiskAggregates'] = async () => this.unavailable()
  getPredictionExplanation: DashboardRepository['getPredictionExplanation'] = async () => this.unavailable()
  getSegmentEvidence: DashboardRepository['getSegmentEvidence'] = async () => this.unavailable()
  getCauseContext: DashboardRepository['getCauseContext'] = async () => this.unavailable()
}
