import type {
  AirportHotspot,
  AirportHotspotsData,
  AirportLocation,
  CarrierBreakdown,
  CarrierComparisonData,
  CarrierMetric,
  CauseContextData,
  ComparisonContext,
  DashboardMetadata,
  EvidenceRecord,
  FlightRecord,
  FutureFlight,
  FutureFlightsData,
  GlobalFilters,
  GranularTrendSeries,
  GranularTrendsData,
  HeatCell,
  KpiValue,
  OverviewData,
  PredictionExplanationData,
  PredictionFilters,
  RiskAggregate,
  RiskAggregatesData,
  RouteCandidate,
  RouteCandidatesData,
  SeasonSummary,
  SegmentEvidenceData,
  SpatialState,
  TemporalContext,
  TemporalPatternsData,
  TrendPoint,
} from '../domain/types'
import { defaultFilters } from '../domain/types'
import type { DashboardRepository } from './DashboardRepository'

const MOCK_SAMPLE_MULTIPLIER = 25

const scaleCount = (n: number): number => Math.round(n * MOCK_SAMPLE_MULTIPLIER)

const isEligible = (f: FlightRecord): boolean =>
  f.CANCELLED === 0 &&
  f.DIVERTED === 0 &&
  f.ARR_DELAY !== null &&
  f.ARR_DELAY !== undefined &&
  !Number.isNaN(f.ARR_DELAY)

const isDelayed = (f: FlightRecord): boolean => (f.ARR_DELAY ?? 0) >= 15

const getSeason = (dateStr: string): string => {
  const month = parseInt(dateStr.slice(5, 7), 10)
  if (month <= 3) return 'Winter'
  if (month <= 6) return 'Spring'
  if (month <= 9) return 'Summer'
  return 'Autumn'
}

const getDistanceGroup = (distance: number): string => {
  if (distance < 250) return 'G01'
  if (distance < 500) return 'G02'
  if (distance < 750) return 'G03'
  if (distance < 1000) return 'G04'
  return 'G05+'
}

const getTimeBlock = (crsDepTime: number): string => {
  if (crsDepTime < 600) return 'Early Morning'
  if (crsDepTime < 1200) return 'Morning'
  if (crsDepTime < 1800) return 'Afternoon'
  return 'Evening'
}

const getDayOfWeek = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dateObj = new Date(Date.UTC(year, month - 1, day))
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return days[dateObj.getUTCDay()]
}

const CARRIER_NAMES: Record<string, string> = {
  WN: 'Southwest Airlines',
  DL: 'Delta Air Lines',
  AA: 'American Airlines',
}

const wait = (duration = 180) => new Promise((resolve) => window.setTimeout(resolve, duration))

export class MockDashboardRepository implements DashboardRepository {
  private flightsCache: FlightRecord[] | null = null
  private airportsCache: AirportLocation[] | null = null
  private activeFilters: GlobalFilters = defaultFilters

  private async loadFlights(): Promise<FlightRecord[]> {
    if (this.flightsCache) return this.flightsCache
    await wait(100)
    const response = await fetch('/mock-data/flights.json')
    if (!response.ok) throw new Error('Không thể tải mock-data/flights.json')
    const data = (await response.json()) as FlightRecord[]
    this.flightsCache = data
    return data
  }

  private async loadAirports(): Promise<AirportLocation[]> {
    if (this.airportsCache) return this.airportsCache
    const response = await fetch('/mock-data/airports.json')
    if (!response.ok) throw new Error('Không thể tải mock-data/airports.json')
    const raw = await response.json()
    const airports: AirportLocation[] = Array.isArray(raw) ? raw : raw.airports
    this.airportsCache = airports
    return airports
  }

  private createMetadata(dataLabel: string, baseCount: number): DashboardMetadata {
    return {
      illustrative: true,
      schemaVersion: '2.0.0-demo',
      generatedAt: '2026-10-01T08:00:00+07:00',
      asOfDate: '2018-12-31',
      dataLabel,
      baselineRuleVersion: 'BL-DEMO-v0',
      sampleRuleVersion: 'UNCALIBRATED',
      modelVersion: 'DEMO-RISK-v0',
      priorityRuleVersion: 'UNCALIBRATED',
      predictionHorizon: '7 ngày minh họa',
      scoringCutoff: '2018-12-31T23:59:59-06:00',
      sampleMultiplier: MOCK_SAMPLE_MULTIPLIER,
      scalingRuleVersion: 'SCALED-WEIGHT-v1',
      baseRecordCount: baseCount,
      weightedSampleSize: scaleCount(baseCount),
    }
  }


  private filterFlights(flights: FlightRecord[], filters: GlobalFilters, carrier?: string): FlightRecord[] {
    return flights.filter((flight) => {
      if (carrier && flight.OP_CARRIER !== carrier) return false
      if (filters.fromDate && flight.FL_DATE < filters.fromDate) return false
      if (filters.toDate && flight.FL_DATE > filters.toDate) return false
      if (filters.origin && filters.origin.length > 0 && !filters.origin.includes(flight.ORIGIN)) return false
      if (filters.destination && filters.destination.length > 0 && !filters.destination.includes(flight.DEST)) return false
      if (filters.season && filters.season.length > 0 && !filters.season.includes(getSeason(flight.FL_DATE))) return false
      if (filters.distanceGroup && filters.distanceGroup.length > 0 && !filters.distanceGroup.includes(getDistanceGroup(flight.DISTANCE))) return false
      return true
    })
  }

  async getOverview(filters: GlobalFilters): Promise<OverviewData> {
    this.activeFilters = filters
    const [allFlights, airports] = await Promise.all([this.loadFlights(), this.loadAirports()])
    const airportMap = new Map(airports.map((a) => [a.code, a]))

    const baseFlights = this.filterFlights(allFlights, filters, 'WN')
    const eligible = baseFlights.filter(isEligible)
    const delayed = eligible.filter(isDelayed)

    const eligibleCount = scaleCount(eligible.length)
    const delayedCount = scaleCount(delayed.length)
    const delayRate = eligible.length > 0 ? Number(((delayed.length / eligible.length) * 100).toFixed(1)) : 0
    const avgDelay = eligible.length > 0
      ? Number((eligible.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / eligible.length).toFixed(1))
      : 0

    const kpis: KpiValue[] = [
      {
        id: 'P1-C02',
        label: 'Chuyến bay đủ điều kiện',
        value: eligibleCount.toLocaleString('vi-VN'),
        context: 'Chuyến bay hoàn thành lịch trình, không hủy và không chuyển hướng',
      },
      {
        id: 'P1-C03',
        label: 'Chuyến bay đến trễ',
        value: delayedCount.toLocaleString('vi-VN'),
        context: 'Đến trễ từ 15 phút trở lên so với lịch bay công bố',
      },
      {
        id: 'P1-C04',
        label: 'Tỷ lệ đến trễ thực tế',
        value: `${delayRate.toFixed(1).replace('.', ',')}%`,
        context: 'Tỷ lệ chuyến bay trễ trên tổng số chuyến bay đủ điều kiện',
      },
      {
        id: 'P1-C05',
        label: 'Độ trễ đến trung bình',
        value: `${avgDelay.toFixed(1).replace('.', ',')} phút`,
        context: 'Số phút trễ bình quân trên các chuyến bay đủ điều kiện',
      },
    ]

    const monthMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const month = f.FL_DATE.slice(0, 7)
      const list = monthMap.get(month) ?? []
      list.push(f)
      monthMap.set(month, list)
    }

    const sortedMonths = Array.from(monthMap.keys()).sort()
    const actualTrend: TrendPoint[] = sortedMonths.map((period) => {
      const mFlights = monthMap.get(period) ?? []
      const mDelayed = mFlights.filter(isDelayed)
      const rate = mFlights.length > 0 ? Number(((mDelayed.length / mFlights.length) * 100).toFixed(1)) : 0
      return {
        period,
        value: rate,
        n: scaleCount(mFlights.length),
        baseline: delayRate,
      }
    })

    const predictedTrend: TrendPoint[] = actualTrend.map((pt) => {
      const simulatedRate = Number((pt.value * 0.98 + (pt.value > 25 ? -0.7 : 0.7)).toFixed(1))
      return {
        period: pt.period,
        value: simulatedRate,
        n: pt.n,
        baseline: delayRate,
      }
    })

    const monthlySeries: GranularTrendSeries[] = sortedMonths.map((period, idx) => {
      const mFlights = monthMap.get(period) ?? []
      const mDelayed = mFlights.filter(isDelayed)
      const wn = mFlights.length > 0 ? Number(((mDelayed.length / mFlights.length) * 100).toFixed(1)) : 0
      const dl = Math.max(8, Number((wn * 0.86 + Math.sin((idx + 1) * 1.4) * 1.3).toFixed(1)))
      const aa = Math.max(10, Number((wn * 0.94 + Math.cos((idx + 1) * 0.9) * 1.5).toFixed(1)))
      const wnForecast = Number((wn * 0.98 + (wn > 25 ? -0.7 : 0.7)).toFixed(1))
      const monthNum = parseInt(period.slice(5, 7), 10)
      const mAvgDelay = mFlights.length > 0
        ? Number((mFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / mFlights.length).toFixed(1))
        : 0
      return {
        period,
        label: `Tháng ${monthNum}/2018`,
        wn,
        dl,
        aa,
        wnForecast,
        wnN: scaleCount(mFlights.length),
        delayedCount: scaleCount(mDelayed.length),
        eligibleCount: scaleCount(mFlights.length),
        averageDelay: mAvgDelay,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: false,
      }
    })

    if (monthlySeries.length > 0) {
      const lastMonthWn = monthlySeries[monthlySeries.length - 1].wn ?? delayRate
      const futureForecastRate = Number((delayRate * 1.15 + (lastMonthWn > 20 ? 1.2 : -0.5)).toFixed(1))
      monthlySeries.push({
        period: '2019-01',
        label: 'Tháng 1/2019 (Dự báo)',
        wn: null,
        dl: null,
        aa: null,
        wnForecast: futureForecastRate,
        wnN: scaleCount(260),
        delayedCount: scaleCount(Math.round(260 * futureForecastRate / 100)),
        eligibleCount: scaleCount(260),
        averageDelay: Number((avgDelay * 1.18).toFixed(1)),
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: true,
      })
    }

    const weekMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const d = new Date(f.FL_DATE)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
      const weekKey = `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
      const list = weekMap.get(weekKey) ?? []
      list.push(f)
      weekMap.set(weekKey, list)
    }

    const sortedWeeks = Array.from(weekMap.keys()).sort()
    const weeklySeries: GranularTrendSeries[] = sortedWeeks.map((period, idx) => {
      const wFlights = weekMap.get(period) ?? []
      const wDelayed = wFlights.filter(isDelayed)
      const wn = wFlights.length > 0 ? Number(((wDelayed.length / wFlights.length) * 100).toFixed(1)) : 0
      const dl = Math.max(8, Number((wn * 0.86 + Math.sin(idx * 0.8) * 1.5).toFixed(1)))
      const aa = Math.max(10, Number((wn * 0.94 + Math.cos(idx * 0.6) * 1.6).toFixed(1)))
      const wnForecast = Number((wn * 0.98 + (wn > 25 ? -0.8 : 0.8)).toFixed(1))
      const weekNum = period.slice(6)
      const wAvgDelay = wFlights.length > 0
        ? Number((wFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / wFlights.length).toFixed(1))
        : 0
      return {
        period,
        label: `Tuần ${weekNum}`,
        wn,
        dl,
        aa,
        wnForecast,
        wnN: scaleCount(wFlights.length),
        delayedCount: scaleCount(wDelayed.length),
        eligibleCount: scaleCount(wFlights.length),
        averageDelay: wAvgDelay,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: false,
      }
    })

    if (weeklySeries.length > 0) {
      const futureWeeks = ['2019-W01', '2019-W02', '2019-W03', '2019-W04']
      futureWeeks.forEach((fw, fIdx) => {
        const simVal = Number((delayRate * 1.12 + Math.sin(fIdx + 1) * 1.8).toFixed(1))
        weeklySeries.push({
          period: fw,
          label: `Tuần ${fw.slice(6)}/2019 (Dự báo)`,
          wn: null,
          dl: null,
          aa: null,
          wnForecast: simVal,
          wnN: scaleCount(130),
          delayedCount: scaleCount(Math.round(130 * simVal / 100)),
          eligibleCount: scaleCount(130),
          averageDelay: Number((avgDelay * 1.14 + (fIdx === 0 ? 2.1 : -1.0)).toFixed(1)),
          baseline: delayRate,
          baselineAvgDelay: avgDelay,
          isFuture: true,
        })
      })
    }

    const dateMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const list = dateMap.get(f.FL_DATE) ?? []
      list.push(f)
      dateMap.set(f.FL_DATE, list)
    }

    const sortedDates = Array.from(dateMap.keys()).sort()
    const dailySeries: GranularTrendSeries[] = sortedDates.map((period, idx) => {
      const dFlights = dateMap.get(period) ?? []
      const dDelayed = dFlights.filter(isDelayed)
      const wn = dFlights.length > 0 ? Number(((dDelayed.length / dFlights.length) * 100).toFixed(1)) : 0
      const dl = Math.max(8, Number((wn * 0.87 + Math.sin(idx * 0.5) * 1.6).toFixed(1)))
      const aa = Math.max(10, Number((wn * 0.93 + Math.cos(idx * 0.4) * 1.7).toFixed(1)))
      const wnForecast = Number((wn * 0.97 + (wn > 25 ? -0.9 : 0.9)).toFixed(1))
      const [, m, d] = period.split('-')
      const dAvgDelay = dFlights.length > 0
        ? Number((dFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / dFlights.length).toFixed(1))
        : 0
      return {
        period,
        label: `${d}/${m}`,
        wn,
        dl,
        aa,
        wnForecast,
        wnN: scaleCount(dFlights.length),
        delayedCount: scaleCount(dDelayed.length),
        eligibleCount: scaleCount(dFlights.length),
        averageDelay: dAvgDelay,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: false,
      }
    })

    if (dailySeries.length > 0) {
      const futureDays = ['2019-01-01', '2019-01-02']
      futureDays.forEach((fd, fIdx) => {
        const [, m, d] = fd.split('-')
        const simVal = Number((delayRate * 1.14 + (fIdx === 0 ? 1.5 : -0.8)).toFixed(1))
        dailySeries.push({
          period: fd,
          label: `${d}/${m}/2019 (Dự báo)`,
          wn: null,
          dl: null,
          aa: null,
          wnForecast: simVal,
          wnN: scaleCount(130),
          delayedCount: scaleCount(Math.round(130 * simVal / 100)),
          eligibleCount: scaleCount(130),
          averageDelay: Number((avgDelay * 1.12 + (fIdx === 0 ? 1.8 : -0.9)).toFixed(1)),
          baseline: delayRate,
          baselineAvgDelay: avgDelay,
          isFuture: true,
        })
      })
    }

    const unifiedTrends: GranularTrendsData = {
      month: monthlySeries,
      week: weeklySeries,
      day: dailySeries,
      baseline: delayRate,
      baselineAvgDelay: avgDelay,
    }

    const destGroupMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const list = destGroupMap.get(f.DEST) ?? []
      list.push(f)
      destGroupMap.set(f.DEST, list)
    }

    const destinations: AirportHotspot[] = []
    for (const [destCode, dFlights] of destGroupMap.entries()) {
      const airport = airportMap.get(destCode)
      if (!airport) continue
      const dDelayed = dFlights.filter(isDelayed)
      const rate = Number(((dDelayed.length / dFlights.length) * 100).toFixed(1))
      const gap = Number((rate - delayRate).toFixed(1))
      const dAvg = Number((dFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / dFlights.length).toFixed(1))

      destinations.push({
        id: `${destCode}-d`,
        entity: `${airport.city} (${destCode})`,
        entityType: 'Airport',
        code: destCode,
        role: 'Destination',
        x: airport.x,
        y: airport.y,
        lat: airport.lat,
        lng: airport.lng,
        name: airport.name,
        city: airport.city,
        rate,
        baseline: delayRate,
        gap,
        averageDelay: dAvg,
        n: scaleCount(dFlights.length),
        delayedCount: scaleCount(dDelayed.length),
        eligibleCount: scaleCount(dFlights.length),
        flag: 'Uncalibrated',
      })
    }

    for (const airport of airports) {
      if (!destGroupMap.has(airport.code)) {
        const oFlights = eligible.filter((f) => f.ORIGIN === airport.code)
        const oDelayed = oFlights.filter(isDelayed)
        const rate = oFlights.length > 0 ? Number(((oDelayed.length / oFlights.length) * 100).toFixed(1)) : delayRate
        const gap = Number((rate - delayRate).toFixed(1))
        const oAvg = oFlights.length > 0
          ? Number((oFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / oFlights.length).toFixed(1))
          : 0

        destinations.push({
          id: `${airport.code}-o`,
          entity: `${airport.city} (${airport.code})`,
          entityType: 'Airport',
          code: airport.code,
          role: 'Origin',
          x: airport.x,
          y: airport.y,
          lat: airport.lat,
          lng: airport.lng,
          name: airport.name,
          city: airport.city,
          rate,
          baseline: delayRate,
          gap,
          averageDelay: oAvg,
          n: scaleCount(oFlights.length),
          delayedCount: scaleCount(oDelayed.length),
          eligibleCount: scaleCount(oFlights.length),
          flag: 'Uncalibrated',
        })
      }
    }
    destinations.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))

    const routeGroupMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const route = `${f.ORIGIN} → ${f.DEST}`
      const list = routeGroupMap.get(route) ?? []
      list.push(f)
      routeGroupMap.set(route, list)
    }

    const routeCandidates: EvidenceRecord[] = []
    for (const [route, rFlights] of routeGroupMap.entries()) {
      const rDelayed = rFlights.filter(isDelayed)
      const rate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
      const gap = Number((rate - delayRate).toFixed(1))
      const rAvg = Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1))
      const distance = Math.round(rFlights.reduce((acc, cur) => acc + (cur.DISTANCE || 0), 0) / rFlights.length)
      const estimatedTime = Math.round(
        rFlights.reduce((acc, cur) => acc + (cur.CRS_ELAPSED_TIME || cur.ACTUAL_ELAPSED_TIME || 0), 0) / rFlights.length
      )
      const [origin, destination] = route.split(' → ')

      routeCandidates.push({
        id: route.replace(' → ', '-'),
        entity: route,
        entityType: 'Route',
        rate,
        baseline: delayRate,
        gap,
        averageDelay: rAvg,
        n: scaleCount(rFlights.length),
        delayedCount: scaleCount(rDelayed.length),
        eligibleCount: scaleCount(rFlights.length),
        flag: 'Uncalibrated',
        distance,
        estimatedTime,
        origin,
        destination,
      })
    }
    routeCandidates.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))

    const candidates: EvidenceRecord[] = []
    const positiveGapRoutes = routeCandidates.filter((r) => (r.gap ?? 0) > 0)
    const negativeGapRoutes = routeCandidates.filter((r) => (r.gap ?? 0) < 0).reverse()

    positiveGapRoutes.slice(0, 3).forEach((r) => candidates.push(r))
    negativeGapRoutes.slice(0, 2).forEach((r) => candidates.push(r))

    if (candidates.length === 0 && routeCandidates.length > 0) {
      candidates.push(...routeCandidates.slice(0, 5))
    }

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — KHÔNG PHẢI KẾT QUẢ ĐO LƯỜNG', eligible.length),
      kpis,
      actualTrend,
      predictedTrend,
      unifiedTrends,
      destinations,
      candidates,
    }
  }

  async getAirportHotspots(filters: GlobalFilters, localState: SpatialState): Promise<AirportHotspotsData> {
    this.activeFilters = filters
    const [allFlights, airports] = await Promise.all([this.loadFlights(), this.loadAirports()])
    const airportMap = new Map(airports.map((a) => [a.code, a]))

    const baseFlights = this.filterFlights(allFlights, filters, 'WN')
    const eligible = baseFlights.filter(isEligible)
    const networkRate = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : 0

    const role = localState.grain === 'origin' ? 'Origin' : 'Destination'
    const airportFlightsMap = new Map<string, FlightRecord[]>()

    for (const f of eligible) {
      const code = role === 'Origin' ? f.ORIGIN : f.DEST
      const list = airportFlightsMap.get(code) ?? []
      list.push(f)
      airportFlightsMap.set(code, list)
    }

    const hotspotAirports: AirportHotspot[] = []

    for (const [code, aFlights] of airportFlightsMap.entries()) {
      if (role === 'Origin' && filters.origin.length > 0 && !filters.origin.includes(code)) continue
      if (role === 'Destination' && filters.destination.length > 0 && !filters.destination.includes(code)) continue

      const airport = airportMap.get(code)
      if (!airport) continue

      const aDelayed = aFlights.filter(isDelayed)
      const rate = Number(((aDelayed.length / aFlights.length) * 100).toFixed(1))
      const gap = Number((rate - networkRate).toFixed(1))
      const avg = Number((aFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / aFlights.length).toFixed(1))

      hotspotAirports.push({
        id: `${code}-${role === 'Origin' ? 'o' : 'd'}`,
        entity: `${airport.name} (${code})`,
        entityType: 'Airport',
        code,
        role,
        x: airport.x,
        y: airport.y,
        rate,
        baseline: networkRate,
        gap,
        averageDelay: avg,
        n: scaleCount(aFlights.length),
        flag: 'Uncalibrated',
      })
    }

    if (localState.metric === 'rate') {
      hotspotAirports.sort((a, b) => b.rate - a.rate)
    } else {
      hotspotAirports.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    }

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA VỊ TRÍ / KHU VỰC SÂN BAY', eligible.length),
      airports: hotspotAirports,
    }
  }

  async getRouteCandidates(filters: GlobalFilters, localState: SpatialState): Promise<RouteCandidatesData> {
    this.activeFilters = filters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, filters, 'WN')
    const eligible = baseFlights.filter(isEligible)
    const networkRate = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : 0

    const routeMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      if (filters.origin.length > 0 && !filters.origin.includes(f.ORIGIN)) continue
      if (filters.destination.length > 0 && !filters.destination.includes(f.DEST)) continue
      const route = `${f.ORIGIN} → ${f.DEST}`
      const list = routeMap.get(route) ?? []
      list.push(f)
      routeMap.set(route, list)
    }

    const routes: RouteCandidate[] = []
    for (const [route, rFlights] of routeMap.entries()) {
      const rDelayed = rFlights.filter(isDelayed)
      const rate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
      const gap = Number((rate - networkRate).toFixed(1))
      const avg = Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1))

      const rMonthMap = new Map<string, FlightRecord[]>()
      for (const f of rFlights) {
        const m = f.FL_DATE.slice(0, 7)
        const list = rMonthMap.get(m) ?? []
        list.push(f)
        rMonthMap.set(m, list)
      }
      const sortedMonths = Array.from(rMonthMap.keys()).sort().slice(-6)
      const sparkline = sortedMonths.map((m) => {
        const mList = rMonthMap.get(m) ?? []
        const mDel = mList.filter(isDelayed)
        return mList.length > 0 ? Number(((mDel.length / mList.length) * 100).toFixed(1)) : rate
      })

      routes.push({
        id: route.replace(' → ', '-'),
        entity: route,
        entityType: 'Route',
        route,
        rate,
        baseline: networkRate,
        gap,
        averageDelay: avg,
        n: scaleCount(rFlights.length),
        flag: 'Uncalibrated',
        sparkline: sparkline.length > 0 ? sparkline : [rate, rate, rate, rate, rate, rate],
      })
    }

    if (localState.metric === 'rate') {
      routes.sort((a, b) => b.rate - a.rate)
    } else {
      routes.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    }

    const topRoute = routes[0]?.route ?? 'DAL → ATL'
    const topRouteFlights = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === topRoute)
    const monthGroupMap = new Map<string, FlightRecord[]>()
    for (const f of topRouteFlights) {
      const m = f.FL_DATE.slice(0, 7)
      const list = monthGroupMap.get(m) ?? []
      list.push(f)
      monthGroupMap.set(m, list)
    }

    const selectedHistory: TrendPoint[] = Array.from(monthGroupMap.keys()).sort().map((period) => {
      const mFlights = monthGroupMap.get(period) ?? []
      const mDel = mFlights.filter(isDelayed)
      const r = mFlights.length > 0 ? Number(((mDel.length / mFlights.length) * 100).toFixed(1)) : 0
      return {
        period,
        value: r,
        baseline: networkRate,
        n: scaleCount(mFlights.length),
      }
    })

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA TUYẾN BAY CẦN ĐIỀU TRA', eligible.length),
      routes,
      selectedHistory,
    }
  }

  async getTemporalPatterns(filters: GlobalFilters, context: TemporalContext): Promise<TemporalPatternsData> {
    this.activeFilters = filters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, filters, 'WN')
    const eligible = baseFlights.filter(isEligible)

    let contextFlights = eligible
    if (context.route) {
      const rFlights = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === context.route)
      if (rFlights.length > 0) contextFlights = rFlights
    }

    const networkRate = contextFlights.length > 0
      ? Number(((contextFlights.filter(isDelayed).length / contextFlights.length) * 100).toFixed(1))
      : 0

    const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    const blocks = ['Early Morning', 'Morning', 'Afternoon', 'Evening']

    const heatmap: HeatCell[] = []
    for (const day of days) {
      for (const block of blocks) {
        const cellFlights = contextFlights.filter(
          (f) => getDayOfWeek(f.FL_DATE) === day && getTimeBlock(f.CRS_DEP_TIME) === block,
        )
        const cellDelayed = cellFlights.filter(isDelayed)
        const rate = cellFlights.length > 0 ? Number(((cellDelayed.length / cellFlights.length) * 100).toFixed(1)) : 0
        const gap = cellFlights.length > 0 ? Number((rate - networkRate).toFixed(1)) : null
        heatmap.push({
          day,
          block,
          rate,
          gap,
          n: scaleCount(cellFlights.length),
          flag: 'Uncalibrated',
        })
      }
    }

    const seasonsConfig = [
      { name: 'Winter', months: ['01', '02', '03'], labels: ['Jan', 'Feb', 'Mar'] },
      { name: 'Spring', months: ['04', '05', '06'], labels: ['Apr', 'May', 'Jun'] },
      { name: 'Summer', months: ['07', '08', '09'], labels: ['Jul', 'Aug', 'Sep'] },
      { name: 'Autumn', months: ['10', '11', '12'], labels: ['Oct', 'Nov', 'Dec'] },
    ]

    const seasons: SeasonSummary[] = seasonsConfig.map((sc) => {
      const sFlights = contextFlights.filter((f) => sc.months.includes(f.FL_DATE.slice(5, 7)))
      const sDelayed = sFlights.filter(isDelayed)
      const sRate = sFlights.length > 0 ? Number(((sDelayed.length / sFlights.length) * 100).toFixed(1)) : 0

      const months = sc.months.map((mStr, idx) => {
        const mFlights = sFlights.filter((f) => f.FL_DATE.slice(5, 7) === mStr)
        const mDelayed = mFlights.filter(isDelayed)
        const mRate = mFlights.length > 0 ? Number(((mDelayed.length / mFlights.length) * 100).toFixed(1)) : sRate
        return {
          month: sc.labels[idx],
          rate: mRate,
          gap: Number((mRate - sRate).toFixed(1)),
          n: scaleCount(mFlights.length),
        }
      })

      return {
        season: sc.name,
        rate: sRate,
        months,
      }
    })

    const monthMap = new Map<string, FlightRecord[]>()
    for (const f of contextFlights) {
      const m = f.FL_DATE.slice(0, 7)
      const list = monthMap.get(m) ?? []
      list.push(f)
      monthMap.set(m, list)
    }

    const monthlyTrend: TrendPoint[] = Array.from(monthMap.keys()).sort().map((period) => {
      const mFlights = monthMap.get(period) ?? []
      const mDel = mFlights.filter(isDelayed)
      const r = mFlights.length > 0 ? Number(((mDel.length / mFlights.length) * 100).toFixed(1)) : 0
      return {
        period,
        value: r,
        baseline: networkRate,
        n: scaleCount(mFlights.length),
      }
    })

    const routeMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const list = routeMap.get(r) ?? []
      list.push(f)
      routeMap.set(r, list)
    }

    const routes: RouteCandidate[] = Array.from(routeMap.entries()).map(([route, rFlights]) => {
      const rDelayed = rFlights.filter(isDelayed)
      const rRate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
      return {
        id: route.replace(' → ', '-'),
        entity: route,
        entityType: 'Route',
        route,
        rate: rRate,
        baseline: networkRate,
        gap: Number((rRate - networkRate).toFixed(1)),
        averageDelay: Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1)),
        n: scaleCount(rFlights.length),
        flag: 'Uncalibrated',
        sparkline: [rRate, rRate, rRate, rRate, rRate, rRate],
      }
    })

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — KHÔNG PHẢI KẾT QUẢ ĐO LƯỜNG', contextFlights.length),
      heatmap,
      seasons,
      monthlyTrend,
      routes,
    }
  }

  async getCarrierComparison(context: ComparisonContext, peers: string[], filters?: GlobalFilters): Promise<CarrierComparisonData> {
    const activeF = filters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const targetFlights = this.filterFlights(allFlights, activeF)
    const eligibleAll = targetFlights.filter(isEligible)

    let entityFlights = eligibleAll
    if (context.entity.includes('→')) {
      const match = eligibleAll.filter((f) => `${f.ORIGIN} → ${f.DEST}` === context.entity)
      if (match.length > 0) entityFlights = match
    } else if (context.entity.length === 3) {
      const match = eligibleAll.filter((f) => f.ORIGIN === context.entity || f.DEST === context.entity)
      if (match.length > 0) entityFlights = match
    }

    const targetCarriers = ['WN', ...peers.filter(Boolean)]
    const carrierMetrics: CarrierMetric[] = []
    let wnRate = 0

    const wnFlights = entityFlights.filter((f) => f.OP_CARRIER === 'WN')
    const wnDelayed = wnFlights.filter(isDelayed)
    if (wnFlights.length > 0) {
      wnRate = Number(((wnDelayed.length / wnFlights.length) * 100).toFixed(1))
    }

    for (const c of targetCarriers) {
      const cFlights = entityFlights.filter((f) => f.OP_CARRIER === c)
      const cDelayed = cFlights.filter(isDelayed)
      const rate = cFlights.length > 0 ? Number(((cDelayed.length / cFlights.length) * 100).toFixed(1)) : 0
      const avg = cFlights.length > 0
        ? Number((cFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / cFlights.length).toFixed(1))
        : 0
      const gapVsWn = c === 'WN' ? null : Number((rate - wnRate).toFixed(1))

      carrierMetrics.push({
        carrier: c,
        name: CARRIER_NAMES[c] ?? c,
        eligible: scaleCount(cFlights.length),
        delayed: scaleCount(cDelayed.length),
        rate,
        averageDelay: avg,
        gapVsWn,
        flag: 'Uncalibrated',
      })
    }

    const trend: Record<string, TrendPoint[]> = {}
    for (const c of targetCarriers) {
      const cFlights = entityFlights.filter((f) => f.OP_CARRIER === c)
      const cMonthMap = new Map<string, FlightRecord[]>()
      for (const f of cFlights) {
        const m = f.FL_DATE.slice(0, 7)
        const list = cMonthMap.get(m) ?? []
        list.push(f)
        cMonthMap.set(m, list)
      }
      trend[c] = Array.from(cMonthMap.keys()).sort().map((period) => {
        const mList = cMonthMap.get(period) ?? []
        const mDel = mList.filter(isDelayed)
        const r = mList.length > 0 ? Number(((mDel.length / mList.length) * 100).toFixed(1)) : 0
        return { period, value: r, n: scaleCount(mList.length) }
      })
    }

    const primaryPeer = peers[0] || 'DL'
    const breakdown: CarrierBreakdown[] = [
      {
        cell: `${context.entity} · Thứ Sáu · Buổi tối`,
        wnRate: Number((wnRate * 1.15).toFixed(1)),
        peerRate: Number((wnRate * 0.92).toFixed(1)),
        wnN: scaleCount(Math.max(10, Math.round(wnFlights.length * 0.15))),
        peerN: scaleCount(Math.max(10, Math.round(entityFlights.filter((f) => f.OP_CARRIER === primaryPeer).length * 0.15))),
      },
      {
        cell: `${context.entity} · Chủ Nhật · Buổi tối`,
        wnRate: Number((wnRate * 1.08).toFixed(1)),
        peerRate: Number((wnRate * 0.88).toFixed(1)),
        wnN: scaleCount(Math.max(10, Math.round(wnFlights.length * 0.13))),
        peerN: scaleCount(Math.max(10, Math.round(entityFlights.filter((f) => f.OP_CARRIER === primaryPeer).length * 0.13))),
      },
      {
        cell: `${context.entity} · Thứ Hai · Buổi sáng`,
        wnRate: Number((wnRate * 0.85).toFixed(1)),
        peerRate: Number((wnRate * 0.82).toFixed(1)),
        wnN: scaleCount(Math.max(10, Math.round(wnFlights.length * 0.14))),
        peerN: scaleCount(Math.max(10, Math.round(entityFlights.filter((f) => f.OP_CARRIER === primaryPeer).length * 0.14))),
      },
    ]

    const totalEligible = scaleCount(entityFlights.length)
    const included = Math.round(totalEligible * 0.88)
    const excluded = totalEligible - included

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — SO SÁNH CHỈ TRONG CÁC Ô ĐỐI SÁNH CHUNG', entityFlights.length),
      contextId: `cmp-${context.entity.replace(/[^A-Za-z0-9]/g, '-')}-2018`,
      entity: context.entity,
      baselineId: 'BL-C',
      sharedCells: 18,
      includedFlights: included,
      excludedFlights: excluded,
      coverage: 88.5,
      carriers: carrierMetrics,
      trend,
      breakdown,
    }
  }

  async getFutureFlights(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<FutureFlightsData> {
    const activeF = globalFilters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, activeF, 'WN')
    const eligible = baseFlights.filter(isEligible)

    const routeDelayMap = new Map<string, { total: number; delayed: number }>()
    for (const f of eligible) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const entry = routeDelayMap.get(r) ?? { total: 0, delayed: 0 }
      entry.total += 1
      if (isDelayed(f)) entry.delayed += 1
      routeDelayMap.set(r, entry)
    }

    const defaultRoutes = ['DAL → ATL', 'BWI → MCO', 'MDW → DEN', 'HOU → DEN', 'PHX → LAS', 'DEN → MDW']
    const availableRoutes = Array.from(routeDelayMap.keys())
    const candidateRoutes = availableRoutes.length > 0 ? availableRoutes.slice(0, 6) : defaultRoutes

    const flights: FutureFlight[] = candidateRoutes.map((route, idx) => {
      const stats = routeDelayMap.get(route)
      const historicalRate = stats && stats.total > 0 ? stats.delayed / stats.total : 0.28
      const probability = Number(Math.min(0.85, Math.max(0.12, historicalRate * 1.25 + (idx % 3 === 0 ? 0.05 : -0.03))).toFixed(2))
      const riskLabel: FutureFlight['riskLabel'] = probability >= 0.38 ? 'High' : probability >= 0.28 ? 'Elevated' : 'Monitor'
      const flightNum = 1000 + idx * 215

      return {
        id: `WN${flightNum}-2019010${idx + 2}`,
        flightNumber: `WN ${flightNum}`,
        departureAt: `2019-01-0${idx + 2}T1${6 + (idx % 4)}:30:00-06:00`,
        route,
        probability,
        riskLabel,
        modelVersion: 'DEMO-RISK-v0',
      }
    })

    const filteredFlights = filters.route ? flights.filter((f) => f.route === filters.route) : flights

    return {
      metadata: this.createMetadata('XÁC SUẤT MINH HỌA — MODEL CHƯA HIỆU CHỈNH / CHƯA PHÊ DUYỆT', filteredFlights.length),
      flights: filteredFlights,
    }
  }

  async getRiskAggregates(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<RiskAggregatesData> {
    const activeF = globalFilters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, activeF, 'WN')
    const eligible = baseFlights.filter(isEligible)
    const networkRate = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : 25.0

    const routeMap = new Map<string, FlightRecord[]>()
    for (const f of eligible) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const list = routeMap.get(r) ?? []
      list.push(f)
      routeMap.set(r, list)
    }

    const sortedRoutes = Array.from(routeMap.entries())
      .map(([route, list]) => {
        const del = list.filter(isDelayed)
        const rate = (del.length / list.length) * 100
        return { route, count: list.length, rate }
      })
      .sort((a, b) => b.rate - a.rate)

    const candidateRoutes = filters.route
      ? sortedRoutes.filter((item) => item.route === filters.route)
      : sortedRoutes

    const aggregates: RiskAggregate[] = candidateRoutes.slice(0, 4).map((item) => {

      const histRate = Number(item.rate.toFixed(1))
      const histGap = Number((histRate - networkRate).toFixed(1))
      const expRate = Number((histRate * 1.18).toFixed(1))
      const highRisk = Number((histRate * 1.25).toFixed(1))

      return {
        id: item.route.replace(' → ', '-'),
        entity: item.route,
        type: 'Route',
        expectedRate: expRate,
        highRiskShare: Math.min(100, highRisk),
        historicalRate: histRate,
        historicalGap: histGap,
        scoredN: Math.round(item.count * 0.15) + 30,
        historicalN: scaleCount(item.count),
        sampleFlag: 'Uncalibrated',
        priority: 'Uncalibrated',
        rationale: 'Rủi ro minh họa cao, dữ liệu lịch sử cao hơn BL-AR; quy tắc cỡ mẫu/ưu tiên chưa duyệt.',
      }
    })

    if (aggregates.length === 0) {
      aggregates.push({
        id: 'DAL-ATL',
        entity: 'DAL → ATL',
        type: 'Route',
        expectedRate: 38.7,
        highRiskShare: 41.2,
        historicalRate: 31.8,
        historicalGap: 6.2,
        scoredN: 84,
        historicalN: 2184,
        sampleFlag: 'Uncalibrated',
        priority: 'Uncalibrated',
        rationale: 'Rủi ro minh họa cao, dữ liệu lịch sử cao hơn BL-AR; quy tắc cỡ mẫu/ưu tiên chưa duyệt.',
      })
    }

    const byTime = [
      { label: 'Sáng sớm', expectedRate: 19.4, n: 130 },
      { label: 'Buổi sáng', expectedRate: 24.8, n: 198 },
      { label: 'Buổi chiều', expectedRate: 30.7, n: 224 },
      { label: 'Buổi tối', expectedRate: 36.1, n: 180 },
    ]

    return {
      metadata: this.createMetadata('RỦI RO VÀ MỨC ƯU TIÊN MINH HỌA — KHÔNG PHẢI KHUYẾN NGHỊ VẬN HÀNH', eligible.length),
      aggregates,
      byTime,
    }
  }

  async getPredictionExplanation(id: string): Promise<PredictionExplanationData> {
    const isFlight = id.startsWith('WN')
    const entity = isFlight ? `${id.slice(0, 6)} · Tuyến bay kế hoạch` : `${id.replace('-', ' → ')} · Tuyến bay tổng hợp`

    return {
      metadata: this.createMetadata('ĐÓNG GÓP ĐẶC TRƯNG MINH HỌA — TƯƠNG QUAN, KHÔNG PHẢI NGUYÊN NHÂN NHÂN QUẢ', 1),
      id,
      entity,
      probability: 0.43,
      contributors: [
        {
          label: 'Lịch bay Thứ Sáu / buổi tối',
          direction: 'up',
          strength: 82,
          description: 'Mô hình lịch bay/thời gian theo kế hoạch liên quan tới mức rủi ro cao hơn trong dữ liệu huấn luyện minh họa.',
        },
        {
          label: 'Hồ sơ lịch sử đường bay',
          direction: 'up',
          strength: 68,
          description: 'Đặc trưng lịch sử đường bay bảo đảm an toàn thời gian; không phải chẩn đoán nguyên nhân nhân quả.',
        },
        {
          label: 'Nhóm khoảng cách G03',
          direction: 'down',
          strength: 28,
          description: 'Khoảng cách được dẫn xuất từ DISTANCE theo DG-BTS-250-v1.',
        },
      ],
      missingFeatures: ['Nguồn dữ liệu dự báo thời tiết đã kiểm định'],
      limitation: 'Xác suất chỉ phục vụ diễn tập giao diện; chưa có hiệu chỉnh, kiểm định hoặc phê duyệt cho quyết định vận hành thực tế.',
    }
  }

  async getSegmentEvidence(entity: string, filters?: GlobalFilters): Promise<SegmentEvidenceData> {
    const activeF = filters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, activeF, 'WN')
    const eligible = baseFlights.filter(isEligible)
    const networkRate = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : 25.0

    let segmentFlights = eligible
    if (entity.includes('→')) {
      const match = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === entity)
      if (match.length > 0) segmentFlights = match
    } else if (entity.length === 3) {
      const match = eligible.filter((f) => f.DEST === entity || f.ORIGIN === entity)
      if (match.length > 0) segmentFlights = match
    }

    const sDelayed = segmentFlights.filter(isDelayed)
    const historicalRate = segmentFlights.length > 0
      ? Number(((sDelayed.length / segmentFlights.length) * 100).toFixed(1))
      : networkRate
    const gap = Number((historicalRate - networkRate).toFixed(1))
    const avg = segmentFlights.length > 0
      ? Number((segmentFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / segmentFlights.length).toFixed(1))
      : 0

    return {
      metadata: this.createMetadata('BẰNG CHỨNG MINH HỌA — BẮT BUỘC ĐÁNH GIÁ THỦ CÔNG (HUMAN REVIEW)', segmentFlights.length),
      entity,
      historicalRate,
      baselineRate: networkRate,
      gap,
      eligible: scaleCount(segmentFlights.length),
      delayed: scaleCount(sDelayed.length),
      averageDelay: avg,
      sampleFlag: 'Uncalibrated',
      predictedRisk: Number((historicalRate * 1.18).toFixed(1)),
      checks: [
        { label: 'Tỷ lệ trễ lịch sử và mức tham chiếu BL-AR có sẵn', status: 'available' },
        { label: 'Phiên bản ngưỡng cỡ mẫu được phê duyệt', status: 'pending' },
        { label: 'Kết quả mô hình được công bố / hiệu chỉnh', status: 'pending' },
        { label: 'Quy tắc ưu tiên và xử lý đồng hạng', status: 'pending' },
      ],
    }
  }

  async getCauseContext(entity: string, filters?: GlobalFilters): Promise<CauseContextData> {
    const activeF = filters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, activeF, 'WN')
    const eligible = baseFlights.filter(isEligible)

    let segmentFlights = eligible
    if (entity.includes('→')) {
      const match = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === entity)
      if (match.length > 0) segmentFlights = match
    } else if (entity.length === 3) {
      const match = eligible.filter((f) => f.DEST === entity || f.ORIGIN === entity)
      if (match.length > 0) segmentFlights = match
    }

    const delayedFlights = segmentFlights.filter(isDelayed)
    const recordedFlights = delayedFlights.filter(
      (f) =>
        (f.LATE_AIRCRAFT_DELAY || 0) > 0 ||
        (f.CARRIER_DELAY || 0) > 0 ||
        (f.NAS_DELAY || 0) > 0 ||
        (f.WEATHER_DELAY || 0) > 0 ||
        (f.SECURITY_DELAY || 0) > 0,
    )

    const lateAircraftCount = delayedFlights.filter((f) => (f.LATE_AIRCRAFT_DELAY || 0) > 0).length
    const carrierCount = delayedFlights.filter((f) => (f.CARRIER_DELAY || 0) > 0).length
    const nasCount = delayedFlights.filter((f) => (f.NAS_DELAY || 0) > 0).length
    const weatherCount = delayedFlights.filter((f) => (f.WEATHER_DELAY || 0) > 0).length
    const securityCount = delayedFlights.filter((f) => (f.SECURITY_DELAY || 0) > 0).length

    const recLen = Math.max(1, recordedFlights.length)

    return {
      metadata: this.createMetadata(
        'BỐI CẢNH SAU SỰ KIỆN — KHÔNG LOẠI TRỪ LẪN NHAU — KHÔNG PHẢI NGUYÊN NHÂN NHÂN QUẢ — KHÔNG DÙNG ĐỂ DỰ BÁO',
        delayedFlights.length,
      ),
      entity,
      delayedN: scaleCount(delayedFlights.length),
      recordedN: scaleCount(recordedFlights.length),
      causes: [
        {
          label: 'Máy bay đến trễ',
          share: Math.round((lateAircraftCount / recLen) * 100),
          flights: scaleCount(lateAircraftCount),
        },
        {
          label: 'Hãng bay',
          share: Math.round((carrierCount / recLen) * 100),
          flights: scaleCount(carrierCount),
        },
        {
          label: 'Hệ thống vùng trời quốc gia (NAS)',
          share: Math.round((nasCount / recLen) * 100),
          flights: scaleCount(nasCount),
        },
        {
          label: 'Thời tiết',
          share: Math.round((weatherCount / recLen) * 100),
          flights: scaleCount(weatherCount),
        },
        {
          label: 'An ninh',
          share: Math.round((securityCount / recLen) * 100),
          flights: scaleCount(securityCount),
        },
      ],
    }
  }
}
