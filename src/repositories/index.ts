import type { DashboardRepository } from './DashboardRepository'
import { MockDashboardRepository } from './MockDashboardRepository'

export const dashboardRepository: DashboardRepository = new MockDashboardRepository()
