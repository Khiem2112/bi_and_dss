import type { DashboardRepository } from './DashboardRepository'
import { MockDashboardRepository } from './MockDashboardRepository'
import { ApiDashboardRepository } from './ApiDashboardRepository'

const useApi = import.meta.env.VITE_DATA_SOURCE === 'api' || import.meta.env.VITE_DATA_SOURCE === 'motherduck'

export const dashboardRepository: DashboardRepository = useApi
  ? new ApiDashboardRepository()
  : new MockDashboardRepository()
