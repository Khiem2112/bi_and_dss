import type {
  AirportHotspot,
  AirportHotspotsData,
  AirportLocation,
  CauseContextData,
  DelayMetricBundle,
  DashboardMetadata,
  EvidenceRecord,
  FlightRecord,
  FutureFlight,
  FutureFlightsData,
  FlightInvestigationRequest,
  FlightInvestigationResult,
  FlightSortField,
  GlobalFilters,
  GranularTrendSeries,
  GranularTrendsData,
  HeatCell,
  KpiValue,
  OverviewData,
  PeerBenchmarkRequest,
  PeerBenchmarkResult,
  PredictionExplanationData,
  PredictionFilters,
  RiskAggregate,
  RiskAggregatesData,
  RoleMetrics,
  RouteCandidate,
  RouteCandidatesData,
  SeasonSummary,
  SegmentEvidenceData,
  EntityTrendFilters,
  SpatialState,
  TemporalContext,
  TemporalPatternsData,
  TrendPoint,
  WnAnalysisFilters,
} from '../domain/types'
import { defaultFilters } from '../domain/types'
import type { DashboardRepository } from './DashboardRepository'

const MOCK_SAMPLE_MULTIPLIER = 25

const scaleCount = (n: number): number => {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Số đếm mẫu phải là số nguyên không âm an toàn')
  if (!Number.isSafeInteger(MOCK_SAMPLE_MULTIPLIER) || MOCK_SAMPLE_MULTIPLIER <= 0) {
    throw new Error('Hệ số nhân mẫu phải là số nguyên dương an toàn')
  }
  const scaled = n * MOCK_SAMPLE_MULTIPLIER
  if (!Number.isSafeInteger(scaled)) throw new Error('Số đếm sau khi nhân mẫu vượt giới hạn an toàn')
  return scaled
}

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
  const group = Math.min(11, Math.max(1, Math.floor(distance / 250) + 1))
  return `G${String(group).padStart(2, '0')}`
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

const formatRoute = (flight: FlightRecord): string => `${flight.ORIGIN} → ${flight.DEST}`

const calculateBundle = (records: readonly FlightRecord[]): DelayMetricBundle => {
  if (records.length === 0) {
    return {
      eligibleFlights: 0,
      delayedFlights: 0,
      delayRate: null,
      averageArrivalDelayMinutes: null,
      unavailableReason: 'Không có chuyến bay đủ điều kiện',
    }
  }
  const delayedFlights = records.filter(isDelayed).length
  return {
    eligibleFlights: scaleCount(records.length),
    delayedFlights: scaleCount(delayedFlights),
    delayRate: Number(((delayedFlights / records.length) * 100).toFixed(3)),
    averageArrivalDelayMinutes: Number((records.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / records.length).toFixed(3)),
  }
}

const normalizeSearch = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLocaleLowerCase('vi')
  .trim()
  .replace(/\s+/g, ' ')

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
      if (filters.route && filters.route.length > 0 && !filters.route.includes(formatRoute(flight))) return false
      if (filters.season && filters.season.length > 0 && !filters.season.includes(getSeason(flight.FL_DATE))) return false
      if (filters.dayOfWeek && filters.dayOfWeek.length > 0 && !filters.dayOfWeek.includes(getDayOfWeek(flight.FL_DATE))) return false
      if (filters.scheduledTimeBlock && filters.scheduledTimeBlock.length > 0 && !filters.scheduledTimeBlock.includes(getTimeBlock(flight.CRS_DEP_TIME))) return false
      if (filters.distanceGroup && filters.distanceGroup.length > 0 && !filters.distanceGroup.includes(getDistanceGroup(flight.DISTANCE))) return false
      return true
    })
  }

  private filterByAnalysisContext(flights: readonly FlightRecord[], filters: WnAnalysisFilters): FlightRecord[] {
    return flights.filter((flight) => {
      if (filters.dateFrom && flight.FL_DATE < filters.dateFrom) return false
      if (filters.dateTo && flight.FL_DATE > filters.dateTo) return false
      if (filters.months?.length && !filters.months.includes(Number(flight.FL_DATE.slice(5, 7)))) return false
      if (filters.dayOfWeeks?.length && !filters.dayOfWeeks.includes(getDayOfWeek(flight.FL_DATE))) return false
      if (filters.scheduledTimeBlocks?.length && !filters.scheduledTimeBlocks.includes(getTimeBlock(flight.CRS_DEP_TIME))) return false
      if (filters.origin && flight.ORIGIN !== filters.origin) return false
      if (filters.destination && flight.DEST !== filters.destination) return false
      if (filters.route && formatRoute(flight) !== filters.route) return false
      if (filters.airport) {
        if (filters.airportRole === 'origin' && flight.ORIGIN !== filters.airport) return false
        if (filters.airportRole === 'destination' && flight.DEST !== filters.airport) return false
        if ((!filters.airportRole || filters.airportRole === 'either') && flight.ORIGIN !== filters.airport && flight.DEST !== filters.airport) return false
      }
      if (filters.distanceGroups?.length && !filters.distanceGroups.includes(getDistanceGroup(flight.DISTANCE))) return false
      if (filters.delayedOnly && !isDelayed(flight)) return false
      return true
    })
  }

  private computeHotspotAirports(
    eligible: FlightRecord[],
    airportMap: Map<string, AirportLocation>,
    networkRate: number
  ): AirportHotspot[] {
    const originFlightsMap = new Map<string, FlightRecord[]>()
    const destFlightsMap = new Map<string, FlightRecord[]>()

    for (const f of eligible) {
      const oList = originFlightsMap.get(f.ORIGIN) ?? []
      oList.push(f)
      originFlightsMap.set(f.ORIGIN, oList)

      const dList = destFlightsMap.get(f.DEST) ?? []
      dList.push(f)
      destFlightsMap.set(f.DEST, dList)
    }

    const allAirportCodes = new Set<string>([...originFlightsMap.keys(), ...destFlightsMap.keys()])
    const hotspotAirports: AirportHotspot[] = []

    for (const code of allAirportCodes) {
      const airport = airportMap.get(code)
      if (!airport) continue

      const oFlights = originFlightsMap.get(code) ?? []
      const oDelayed = oFlights.filter(isDelayed)
      const oRate = oFlights.length > 0 ? Number(((oDelayed.length / oFlights.length) * 100).toFixed(1)) : 0
      const oGap = oFlights.length > 0 ? Number((oRate - networkRate).toFixed(1)) : null
      const oAvg = oFlights.length > 0 ? Number((oFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / oFlights.length).toFixed(1)) : 0

      const originMetrics: RoleMetrics = {
        role: 'Origin',
        rate: oRate,
        delayedCount: scaleCount(oDelayed.length),
        eligibleCount: scaleCount(oFlights.length),
        averageDelay: oAvg,
        gap: oGap,
        baseline: networkRate,
        n: scaleCount(oFlights.length),
        flag: 'Uncalibrated',
      }

      const dFlights = destFlightsMap.get(code) ?? []
      const dDelayed = dFlights.filter(isDelayed)
      const dRate = dFlights.length > 0 ? Number(((dDelayed.length / dFlights.length) * 100).toFixed(1)) : 0
      const dGap = dFlights.length > 0 ? Number((dRate - networkRate).toFixed(1)) : null
      const dAvg = dFlights.length > 0 ? Number((dFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / dFlights.length).toFixed(1)) : 0

      const destMetrics: RoleMetrics = {
        role: 'Destination',
        rate: dRate,
        delayedCount: scaleCount(dDelayed.length),
        eligibleCount: scaleCount(dFlights.length),
        averageDelay: dAvg,
        gap: dGap,
        baseline: networkRate,
        n: scaleCount(dFlights.length),
        flag: 'Uncalibrated',
      }

      if (oFlights.length === 0 && dFlights.length === 0) continue

      const totalFlights = oFlights.length + dFlights.length
      const totalDelayed = oDelayed.length + dDelayed.length
      const combinedRate = totalFlights > 0 ? Number(((totalDelayed / totalFlights) * 100).toFixed(1)) : 0
      const combinedGap = totalFlights > 0 ? Number((combinedRate - networkRate).toFixed(1)) : null
      const totalDelayMins = oFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) + dFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0)
      const combinedAvg = totalFlights > 0 ? Number((totalDelayMins / totalFlights).toFixed(1)) : 0

      hotspotAirports.push({
        id: `${code}-hotspot`,
        entity: `${airport.name} (${code})`,
        entityType: 'Airport',
        code,
        role: 'Destination',
        x: airport.x,
        y: airport.y,
        lat: airport.lat,
        lng: airport.lng,
        name: airport.name,
        city: airport.city ?? airport.name,
        rate: combinedRate,
        baseline: networkRate,
        gap: combinedGap,
        averageDelay: combinedAvg,
        n: scaleCount(totalFlights),
        delayedCount: scaleCount(totalDelayed),
        eligibleCount: scaleCount(totalFlights),
        flag: 'Uncalibrated',
        originMetrics,
        destMetrics,
      })
    }

    return hotspotAirports.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
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
    const hasEligible = eligible.length > 0
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
        metrics: calculateBundle(eligible),
      },
      {
        id: 'P1-C03',
        label: 'Chuyến bay đến trễ',
        value: delayedCount.toLocaleString('vi-VN'),
        context: 'Đến trễ từ 15 phút trở lên so với lịch bay công bố',
        metrics: calculateBundle(eligible),
      },
      {
        id: 'P1-C04',
        label: 'Tỷ lệ đến trễ thực tế',
        value: hasEligible ? `${delayRate.toFixed(1).replace('.', ',')}%` : '—',
        context: hasEligible ? 'Tỷ lệ chuyến bay trễ trên tổng số chuyến bay đủ điều kiện' : 'Không có chuyến bay đủ điều kiện',
        metrics: calculateBundle(eligible),
      },
      {
        id: 'P1-C05',
        label: 'Độ trễ đến trung bình',
        value: hasEligible ? `${avgDelay.toFixed(1).replace('.', ',')} phút` : '—',
        context: hasEligible ? 'Số phút trễ bình quân trên các chuyến bay đủ điều kiện' : 'Không có chuyến bay đủ điều kiện',
        metrics: calculateBundle(eligible),
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
      const averageDelay = mFlights.length > 0
        ? Number((mFlights.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / mFlights.length).toFixed(1))
        : 0
      return {
        period,
        value: rate,
        n: scaleCount(mFlights.length),
        baseline: delayRate,
        delayedCount: scaleCount(mDelayed.length),
        averageDelay,
      }
    })

    const predictedTrend: TrendPoint[] = actualTrend.map((pt) => {
      const simulatedRate = Number((pt.value * 0.98 + (pt.value > 25 ? -0.7 : 0.7)).toFixed(1))
      return {
        period: pt.period,
        value: simulatedRate,
        n: pt.n,
        baseline: delayRate,
        delayedCount: pt.delayedCount,
        averageDelay: pt.averageDelay,
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
          baseline: delayRate,
          baselineAvgDelay: avgDelay,
          isFuture: true,
        })
      })
    }

    const unifiedTrends: GranularTrendsData = {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA XU HƯỚNG TỔNG QUAN', eligible.length),
      month: monthlySeries,
      week: weeklySeries,
      day: dailySeries,
      baseline: delayRate,
      baselineAvgDelay: avgDelay,
    }

    const destinations = this.computeHotspotAirports(eligible, airportMap, delayRate)

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
      routes: routeCandidates,
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

    const hotspotAirports = this.computeHotspotAirports(eligible, airportMap, networkRate)

    if (localState.metric === 'rate') {
      hotspotAirports.sort((a, b) => b.rate - a.rate)
    }

    const routesByAirport: Record<string, EvidenceRecord[]> = {}
    for (const airport of hotspotAirports) {
      const code = airport.code
      const routeMap = new Map<string, FlightRecord[]>()
      for (const f of eligible) {
        if (f.ORIGIN !== code && f.DEST !== code) continue
        const route = `${f.ORIGIN} \u2192 ${f.DEST}`
        const list = routeMap.get(route) ?? []
        list.push(f)
        routeMap.set(route, list)
      }
      const routeRecords: EvidenceRecord[] = []
      for (const [route, rFlights] of routeMap.entries()) {
        const rDelayed = rFlights.filter(isDelayed)
        const rRate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
        const rGap = Number((rRate - networkRate).toFixed(1))
        const rAvg = Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1))
        const parts = route.split(' \u2192 ')
        const origin = parts[0]
        const destination = parts[1]
        routeRecords.push({
          id: route.replace(' \u2192 ', '-'),
          entity: route,
          entityType: 'Route',
          origin,
          destination,
          rate: rRate,
          baseline: networkRate,
          gap: rGap,
          averageDelay: rAvg,
          n: scaleCount(rFlights.length),
          delayedCount: scaleCount(rDelayed.length),
          eligibleCount: scaleCount(rFlights.length),
          flag: 'Uncalibrated',
        })
      }
      routeRecords.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
      routesByAirport[code] = routeRecords
    }

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA VỊ TRÍ / KHU VỰC SÂN BAY', eligible.length),
      airports: hotspotAirports,
      routesByAirport,
      networkBaselineRate: networkRate,
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

  async getEntityTrend(entityFilters: EntityTrendFilters, globalFilters: GlobalFilters): Promise<GranularTrendsData> {
    this.activeFilters = globalFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, globalFilters, 'WN')
    const allEligible = baseFlights.filter(isEligible)

    let contextFlights: FlightRecord[]
    if (entityFilters.entityType === 'Route') {
      contextFlights = allEligible.filter((f) => `${f.ORIGIN} \u2192 ${f.DEST}` === entityFilters.entityCode)
    } else {
      contextFlights = allEligible.filter((f) =>
        entityFilters.grain === 'origin' ? f.ORIGIN === entityFilters.entityCode : f.DEST === entityFilters.entityCode,
      )
    }
    const contextDelayed = contextFlights.filter(isDelayed)
    const delayRate = contextFlights.length > 0
      ? Number(((contextDelayed.length / contextFlights.length) * 100).toFixed(1))
      : 0
    const avgDelay = contextFlights.length > 0
      ? Number((contextFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / contextFlights.length).toFixed(1))
      : 0

    const monthMap = new Map<string, FlightRecord[]>()
    for (const f of contextFlights) {
      const m = f.FL_DATE.slice(0, 7)
      const list = monthMap.get(m) ?? []
      list.push(f)
      monthMap.set(m, list)
    }
    const sortedMonths = Array.from(monthMap.keys()).sort()

    const month: GranularTrendSeries[] = sortedMonths.map((period, idx) => {
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
        label: `Th\u00e1ng ${monthNum}/2018`,
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

    if (month.length > 0) {
      const lastWn = month[month.length - 1].wn ?? delayRate
      const futureForecastRate = Number((delayRate * 1.15 + (lastWn > 20 ? 1.2 : -0.5)).toFixed(1))
      month.push({
        period: '2019-01',
        label: 'Th\u00e1ng 1/2019 (D\u1ef1 b\u00e1o)',
        wn: null,
        dl: null,
        aa: null,
        wnForecast: futureForecastRate,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: true,
      })
    }

    const weekMap = new Map<string, FlightRecord[]>()
    for (const f of contextFlights) {
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
    const week: GranularTrendSeries[] = sortedWeeks.map((period, idx) => {
      const wFlights = weekMap.get(period) ?? []
      const wDelayed = wFlights.filter(isDelayed)
      const wn = wFlights.length > 0 ? Number(((wDelayed.length / wFlights.length) * 100).toFixed(1)) : 0
      const wnForecast = Number((wn * 0.97 + (idx % 3 === 0 ? 0.5 : -0.3)).toFixed(1))
      const wAvgDelay = wFlights.length > 0
        ? Number((wFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / wFlights.length).toFixed(1))
        : 0
      return {
        period,
        label: period.replace('-W', ' Tu\u1ea7n '),
        wn,
        dl: Math.max(8, Number((wn * 0.87 + Math.sin(idx * 0.8) * 2).toFixed(1))),
        aa: Math.max(10, Number((wn * 0.93 + Math.cos(idx * 0.7) * 2).toFixed(1))),
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

    const dayMap = new Map<string, FlightRecord[]>()
    for (const f of contextFlights) {
      const list = dayMap.get(f.FL_DATE) ?? []
      list.push(f)
      dayMap.set(f.FL_DATE, list)
    }
    const sortedDays = Array.from(dayMap.keys()).sort()
    const day: GranularTrendSeries[] = sortedDays.map((period, idx) => {
      const dFlights = dayMap.get(period) ?? []
      const dDelayed = dFlights.filter(isDelayed)
      const wn = dFlights.length > 0 ? Number(((dDelayed.length / dFlights.length) * 100).toFixed(1)) : 0
      const dAvgDelay = dFlights.length > 0
        ? Number((dFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / dFlights.length).toFixed(1))
        : 0
      return {
        period,
        label: period,
        wn,
        dl: Math.max(5, Number((wn * 0.87 + Math.sin(idx * 1.2) * 3).toFixed(1))),
        aa: Math.max(7, Number((wn * 0.93 + Math.cos(idx * 1.1) * 3).toFixed(1))),
        wnForecast: null,
        wnN: scaleCount(dFlights.length),
        delayedCount: scaleCount(dDelayed.length),
        eligibleCount: scaleCount(dFlights.length),
        averageDelay: dAvgDelay,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: false,
      }
    })

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA XU HƯỚNG THỰC THỂ', contextFlights.length),
      month,
      week,
      day,
      baseline: delayRate,
      baselineAvgDelay: avgDelay,
    }
  }

  async getTemporalPatterns(filters: GlobalFilters, context: TemporalContext): Promise<TemporalPatternsData> {
    this.activeFilters = filters
    const [allFlights, airports] = await Promise.all([this.loadFlights(), this.loadAirports()])
    const airportMap = new Map(airports.map((a) => [a.code, a]))
    const baseFlights = this.filterFlights(allFlights, filters, 'WN')
    const eligible = baseFlights.filter(isEligible)

    let contextFlights = eligible
    if (context.route) {
      contextFlights = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === context.route)
    }

    const networkRate = contextFlights.length > 0
      ? Number(((contextFlights.filter(isDelayed).length / contextFlights.length) * 100).toFixed(1))
      : 0

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
      const sAvgDelay = sFlights.length > 0
        ? Number((sFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / sFlights.length).toFixed(1))
        : 0

      const months = sc.months.map((mStr, idx) => {
        const mFlights = sFlights.filter((f) => f.FL_DATE.slice(5, 7) === mStr)
        const mDelayed = mFlights.filter(isDelayed)
        const mRate = mFlights.length > 0 ? Number(((mDelayed.length / mFlights.length) * 100).toFixed(1)) : sRate
        const mAvg = mFlights.length > 0
          ? Number((mFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / mFlights.length).toFixed(1))
          : 0
        return {
          month: sc.labels[idx],
          rate: mRate,
          gap: Number((mRate - networkRate).toFixed(1)),
          n: scaleCount(mFlights.length),
          delayedCount: scaleCount(mDelayed.length),
          averageDelay: mAvg,
        }
      })

      return {
        season: sc.name,
        rate: sRate,
        months,
        delayedCount: scaleCount(sDelayed.length),
        averageDelay: sAvgDelay,
        n: scaleCount(sFlights.length),
        gap: Number((sRate - networkRate).toFixed(1)),
      }
    })

    const monthMapCode: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    }

    let heatmapFlights = contextFlights
    if (context.selectedPeriod) {
      heatmapFlights = contextFlights.filter((f) => f.FL_DATE.startsWith(context.selectedPeriod!))
    } else if (context.selectedMonth) {
      const targetMonthCode = monthMapCode[context.selectedMonth] ?? context.selectedMonth
      heatmapFlights = contextFlights.filter((f) => f.FL_DATE.slice(5, 7) === targetMonthCode)
    } else if (context.selectedSeason) {
      const targetSeason = seasonsConfig.find((s) => s.name === context.selectedSeason)
      if (targetSeason) {
        heatmapFlights = contextFlights.filter((f) => targetSeason.months.includes(f.FL_DATE.slice(5, 7)))
      }
    }

    const heatmapBaselineRate = heatmapFlights.length > 0
      ? Number(((heatmapFlights.filter(isDelayed).length / heatmapFlights.length) * 100).toFixed(1))
      : networkRate

    const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    const blocks = ['Early Morning', 'Morning', 'Afternoon', 'Evening']

    const heatmap: HeatCell[] = []
    for (const day of days) {
      for (const block of blocks) {
        const cellFlights = heatmapFlights.filter(
          (f) => getDayOfWeek(f.FL_DATE) === day && getTimeBlock(f.CRS_DEP_TIME) === block,
        )
        const cellDelayed = cellFlights.filter(isDelayed)
        const rate = cellFlights.length > 0 ? Number(((cellDelayed.length / cellFlights.length) * 100).toFixed(1)) : 0
        const gap = cellFlights.length > 0 ? Number((rate - heatmapBaselineRate).toFixed(1)) : null
        const averageDelay = cellFlights.length > 0
          ? Number((cellFlights.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / cellFlights.length).toFixed(1))
          : 0
        heatmap.push({
          day,
          block,
          rate,
          gap,
          n: scaleCount(cellFlights.length),
          delayedCount: scaleCount(cellDelayed.length),
          averageDelay,
          flag: 'Uncalibrated' as const,
        })
      }
    }

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
      const avg = mFlights.length > 0
        ? Number((mFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / mFlights.length).toFixed(1))
        : 0
      return {
        period,
        value: r,
        baseline: networkRate,
        gap: Number((r - networkRate).toFixed(1)),
        delayedCount: scaleCount(mDel.length),
        averageDelay: avg,
        n: scaleCount(mFlights.length),
      }
    })

    let tableBaseFlights = eligible
    if (context.selectedPeriod) {
      tableBaseFlights = tableBaseFlights.filter((f) => f.FL_DATE.startsWith(context.selectedPeriod!))
    } else if (context.selectedMonth) {
      const targetMonthCode = monthMapCode[context.selectedMonth] ?? context.selectedMonth
      tableBaseFlights = tableBaseFlights.filter((f) => f.FL_DATE.slice(5, 7) === targetMonthCode)
    } else if (context.selectedSeason) {
      const targetSeason = seasonsConfig.find((s) => s.name === context.selectedSeason)
      if (targetSeason) {
        tableBaseFlights = tableBaseFlights.filter((f) => targetSeason.months.includes(f.FL_DATE.slice(5, 7)))
      }
    }

    if (context.selectedCell) {
      const cellParts = context.selectedCell.split(' · ')
      const cellDay = cellParts[0]?.trim()
      const cellBlock = cellParts[1]?.trim()
      if (cellDay && cellBlock) {
        tableBaseFlights = tableBaseFlights.filter(
          (f) => getDayOfWeek(f.FL_DATE) === cellDay && getTimeBlock(f.CRS_DEP_TIME) === cellBlock,
        )
      }
    }

    const tableBaselineRate = tableBaseFlights.length > 0
      ? Number(((tableBaseFlights.filter(isDelayed).length / tableBaseFlights.length) * 100).toFixed(1))
      : networkRate

    const hotspotAirports = this.computeHotspotAirports(tableBaseFlights, airportMap, tableBaselineRate)

    const routesByAirport: Record<string, EvidenceRecord[]> = {}
    for (const airport of hotspotAirports) {
      const code = airport.code
      const rMap = new Map<string, FlightRecord[]>()
      for (const f of tableBaseFlights) {
        if (f.ORIGIN !== code && f.DEST !== code) continue
        const route = `${f.ORIGIN} → ${f.DEST}`
        const list = rMap.get(route) ?? []
        list.push(f)
        rMap.set(route, list)
      }
      const routeRecords: EvidenceRecord[] = []
      for (const [route, rFlights] of rMap.entries()) {
        const rDelayed = rFlights.filter(isDelayed)
        const rRate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
        const rGap = Number((rRate - tableBaselineRate).toFixed(1))
        const rAvg = Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1))
        const parts = route.split(' → ')
        routeRecords.push({
          id: route.replace(' → ', '-'),
          entity: route,
          entityType: 'Route' as const,
          origin: parts[0],
          destination: parts[1],
          rate: rRate,
          baseline: tableBaselineRate,
          gap: rGap,
          averageDelay: rAvg,
          n: scaleCount(rFlights.length),
          delayedCount: scaleCount(rDelayed.length),
          eligibleCount: scaleCount(rFlights.length),
          flag: 'Uncalibrated' as const,
        })
      }
      routeRecords.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
      routesByAirport[code] = routeRecords
    }

    const routeMap = new Map<string, FlightRecord[]>()
    for (const f of tableBaseFlights) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const list = routeMap.get(r) ?? []
      list.push(f)
      routeMap.set(r, list)
    }

    const routes: RouteCandidate[] = Array.from(routeMap.entries()).map(([route, rFlights]) => {
      const rDelayed = rFlights.filter(isDelayed)
      const rRate = Number(((rDelayed.length / rFlights.length) * 100).toFixed(1))
      const parts = route.split(' → ')
      return {
        id: route.replace(' → ', '-'),
        entity: route,
        entityType: 'Route' as const,
        route,
        origin: parts[0],
        destination: parts[1],
        rate: rRate,
        baseline: tableBaselineRate,
        gap: Number((rRate - tableBaselineRate).toFixed(1)),
        averageDelay: Number((rFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / rFlights.length).toFixed(1)),
        n: scaleCount(rFlights.length),
        delayedCount: scaleCount(rDelayed.length),
        eligibleCount: scaleCount(rFlights.length),
        flag: 'Uncalibrated' as const,
        sparkline: [rRate, rRate, rRate, rRate, rRate, rRate],
      }
    }).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — KHÔNG PHẢI KẾT QUẢ ĐO LƯỜNG', contextFlights.length),
      heatmap,
      seasons,
      monthlyTrend,
      routes,
      airports: hotspotAirports,
      routesByAirport,
      networkBaselineRate: tableBaselineRate,
    }
  }

  async getPeerBenchmark(request: PeerBenchmarkRequest): Promise<PeerBenchmarkResult> {
    const allFlights = (await this.loadFlights()).filter(isEligible)
    const contextFlights = this.filterByAnalysisContext(allFlights, request.context.filters)
    const wnSource = contextFlights.filter((flight) => flight.OP_CARRIER === 'WN')
    const candidateCarriers = Array.from(new Set(contextFlights.map((flight) => flight.OP_CARRIER)))
      .filter((carrier) => carrier !== 'WN')

    const cellKey = (flight: FlightRecord) => [
      formatRoute(flight),
      flight.FL_DATE.slice(0, 7),
      getDayOfWeek(flight.FL_DATE),
      getTimeBlock(flight.CRS_DEP_TIME),
      getDistanceGroup(flight.DISTANCE),
    ].join('|')

    const routeSuggestions = Array.from(new Set(wnSource.map(formatRoute))).map((route) => {
      const routeWn = wnSource.filter((flight) => formatRoute(flight) === route)
      const peerCells = new Set(contextFlights.filter((flight) => flight.OP_CARRIER !== 'WN' && formatRoute(flight) === route).map(cellKey))
      const covered = routeWn.filter((flight) => peerCells.has(cellKey(flight))).length
      return { id: route, label: route, grain: 'route' as const, expectedCoverageRate: routeWn.length ? covered / routeWn.length : 0 }
    }).sort((left, right) => right.expectedCoverageRate - left.expectedCoverageRate).slice(0, 6)

    const hasComparableEntity = Boolean(
      request.context.filters.route || request.context.filters.airport ||
      request.context.filters.origin || request.context.filters.destination ||
      request.context.grain === 'route' || request.context.grain === 'airport' || request.context.grain === 'time_cell',
    )
    if (!hasComparableEntity) {
      return {
        metadata: this.createMetadata('DỮ LIỆU MINH HỌA — CẦN HOÀN THIỆN NGỮ CẢNH ĐỐI SÁNH', contextFlights.length),
        status: 'incomplete_context',
        context: request.context,
        wn: calculateBundle(wnSource),
        peerObserved: calculateBundle([]),
        peerBenchmarkRate: null,
        peerBenchmarkAverageDelayMinutes: null,
        rateGap: null,
        benchmark: {
          selectedCarriers: [], candidateCarrierCount: candidateCarriers.length, comparableCellCount: 0,
          wnCoverageRate: 0, selectionRuleVersion: request.selectionRuleVersion,
          weightingRuleVersion: request.weightingRuleVersion,
        },
        series: [], suggestions: routeSuggestions,
        unavailableReason: 'Cần chọn tuyến hoặc sân bay trước khi tạo mức tham chiếu tương đương.',
      }
    }

    const wnCellKeys = new Set(wnSource.map(cellKey))
    const candidates = candidateCarriers.map((carrier) => {
      const peer = contextFlights.filter((flight) => flight.OP_CARRIER === carrier)
      const peerCellKeys = new Set(peer.map(cellKey))
      const sharedCells = new Set([...wnCellKeys].filter((key) => peerCellKeys.has(key)))
      const coveredWn = wnSource.filter((flight) => sharedCells.has(cellKey(flight))).length
      return { carrier, peer, sharedCells, coverage: wnSource.length ? coveredWn / wnSource.length : 0, eligible: peer.length }
    }).sort((left, right) =>
      right.coverage - left.coverage || right.sharedCells.size - left.sharedCells.size || right.eligible - left.eligible || left.carrier.localeCompare(right.carrier),
    )

    let selected = candidates.filter((candidate) => candidate.coverage >= request.minimumCoverageRate).slice(0, request.maxPeers)
    let fallbackReason: PeerBenchmarkResult['benchmark']['fallbackReason']
    let finalCellKeys = new Set<string>()
    const updateFinalCells = () => {
      finalCellKeys = new Set([...wnCellKeys].filter((key) => selected.every((candidate) => candidate.sharedCells.has(key))))
    }
    updateFinalCells()
    let finalCoverage = wnSource.length ? wnSource.filter((flight) => finalCellKeys.has(cellKey(flight))).length / wnSource.length : 0
    if (selected.length === 2 && finalCoverage < request.minimumCoverageRate) {
      selected = selected.slice(0, 1)
      fallbackReason = 'second_peer_reduced_coverage'
      updateFinalCells()
      finalCoverage = wnSource.length ? wnSource.filter((flight) => finalCellKeys.has(cellKey(flight))).length / wnSource.length : 0
    }

    if (selected.length === 0 || finalCellKeys.size === 0 || finalCoverage < request.minimumCoverageRate) {
      return {
        metadata: this.createMetadata('DỮ LIỆU MINH HỌA — CHƯA ĐỦ DỮ LIỆU ĐỐI SÁNH', contextFlights.length),
        status: 'insufficient_comparability', context: request.context,
        wn: calculateBundle(wnSource), peerObserved: calculateBundle([]),
        peerBenchmarkRate: null, peerBenchmarkAverageDelayMinutes: null, rateGap: null,
        benchmark: {
          selectedCarriers: [], candidateCarrierCount: candidateCarriers.length, comparableCellCount: 0,
          wnCoverageRate: 0, selectionRuleVersion: request.selectionRuleVersion,
          weightingRuleVersion: request.weightingRuleVersion, fallbackReason: 'insufficient_comparability',
        },
        series: [], suggestions: routeSuggestions,
        unavailableReason: 'Không có hãng nào đạt ngưỡng độ phủ minh họa trong ngữ cảnh hiện tại.',
      }
    }

    const selectedCarriers = selected.map((candidate) => candidate.carrier)
    const comparableWn = wnSource.filter((flight) => finalCellKeys.has(cellKey(flight)))
    const comparablePeers = contextFlights.filter((flight) => selectedCarriers.includes(flight.OP_CARRIER) && finalCellKeys.has(cellKey(flight)))
    const wnByCell = new Map<string, FlightRecord[]>()
    const peerByCell = new Map<string, FlightRecord[]>()
    for (const flight of comparableWn) wnByCell.set(cellKey(flight), [...(wnByCell.get(cellKey(flight)) ?? []), flight])
    for (const flight of comparablePeers) peerByCell.set(cellKey(flight), [...(peerByCell.get(cellKey(flight)) ?? []), flight])

    let benchmarkRate = 0
    let benchmarkAverage = 0
    for (const key of finalCellKeys) {
      const wnCell = wnByCell.get(key) ?? []
      const peerCell = peerByCell.get(key) ?? []
      if (!wnCell.length || !peerCell.length) continue
      const weight = wnCell.length / comparableWn.length
      benchmarkRate += weight * (peerCell.filter(isDelayed).length / peerCell.length) * 100
      benchmarkAverage += weight * (peerCell.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / peerCell.length)
    }

    const wnBundle = calculateBundle(comparableWn)
    const months = Array.from(new Set(comparableWn.map((flight) => flight.FL_DATE.slice(0, 7)))).sort()
    const series = months.map((period) => {
      const monthWn = comparableWn.filter((flight) => flight.FL_DATE.startsWith(period))
      const monthPeers = comparablePeers.filter((flight) => flight.FL_DATE.startsWith(period))
      const monthPeerBundle = calculateBundle(monthPeers)
      return {
        key: period,
        label: `Tháng ${period.slice(5)}/${period.slice(0, 4)}`,
        wn: calculateBundle(monthWn),
        peerObserved: monthPeerBundle,
        peerBenchmarkRate: monthPeerBundle.delayRate,
        peerBenchmarkAverageDelayMinutes: monthPeerBundle.averageArrivalDelayMinutes,
        wnCoverageRate: finalCoverage,
      }
    })

    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — MỨC THAM CHIẾU NHÓM HÃNG ĐỐI SÁNH', comparableWn.length + comparablePeers.length),
      status: selected.length === 1 ? 'one_peer' : 'ready',
      context: request.context,
      wn: wnBundle,
      peerObserved: calculateBundle(comparablePeers),
      peerBenchmarkRate: Number(benchmarkRate.toFixed(3)),
      peerBenchmarkAverageDelayMinutes: Number(benchmarkAverage.toFixed(3)),
      rateGap: wnBundle.delayRate === null ? null : Number((wnBundle.delayRate - benchmarkRate).toFixed(3)),
      benchmark: {
        selectedCarriers, candidateCarrierCount: candidateCarriers.length, comparableCellCount: finalCellKeys.size,
        wnCoverageRate: finalCoverage, selectionRuleVersion: request.selectionRuleVersion,
        weightingRuleVersion: request.weightingRuleVersion, fallbackReason,
      },
      series, suggestions: routeSuggestions,
    }
  }

  async getFlightInvestigation(request: FlightInvestigationRequest): Promise<FlightInvestigationResult> {
    const allFlights = (await this.loadFlights()).filter(isEligible)
    const carriers = request.carrierScope === 'WN' ? ['WN'] : (request.frozenPeerCarriers ?? [])
    let filtered = this.filterByAnalysisContext(allFlights, request.sourceFilters)
      .filter((flight) => carriers.includes(flight.OP_CARRIER))
    const local = request.localFilters
    filtered = filtered.filter((flight) => {
      if (local.fromDate && flight.FL_DATE < local.fromDate) return false
      if (local.toDate && flight.FL_DATE > local.toDate) return false
      if (local.origin && flight.ORIGIN !== local.origin.trim().toUpperCase()) return false
      if (local.destination && flight.DEST !== local.destination.trim().toUpperCase()) return false
      if (local.route && formatRoute(flight) !== local.route) return false
      if (local.dayOfWeek && getDayOfWeek(flight.FL_DATE) !== local.dayOfWeek) return false
      if (local.scheduledTimeBlock && getTimeBlock(flight.CRS_DEP_TIME) !== local.scheduledTimeBlock) return false
      if (local.distanceGroup && getDistanceGroup(flight.DISTANCE) !== local.distanceGroup) return false
      if (local.outcome === 'delayed' && !isDelayed(flight)) return false
      if (local.outcome === 'not_delayed' && isDelayed(flight)) return false
      if (local.flightNumber && !String(flight.OP_CARRIER_FL_NUM).includes(local.flightNumber.trim())) return false
      if (local.minimumArrivalDelay !== undefined && (flight.ARR_DELAY ?? -Infinity) < local.minimumArrivalDelay) return false
      if (local.maximumArrivalDelay !== undefined && (flight.ARR_DELAY ?? Infinity) > local.maximumArrivalDelay) return false
      return true
    })
    const metrics = calculateBundle(filtered)
    const queryTerms = normalizeSearch(request.searchText).split(' ').filter(Boolean)
    const searched = queryTerms.length === 0 ? filtered : filtered.filter((flight) => {
      const status = isDelayed(flight) ? 'Đến trễ' : 'Không trễ'
      const dep = String(flight.CRS_DEP_TIME).padStart(4, '0')
      const arr = String(flight.CRS_ARR_TIME).padStart(4, '0')
      const index = normalizeSearch([
        flight.FL_DATE, flight.OP_CARRIER, flight.OP_CARRIER_FL_NUM, formatRoute(flight),
        dep, `${dep.slice(0, 2)}:${dep.slice(2)}`, arr, `${arr.slice(0, 2)}:${arr.slice(2)}`,
        flight.DEP_DELAY, flight.ARR_DELAY, status, flight.DISTANCE,
      ].join(' '))
      return queryTerms.every((term) => index.includes(term))
    })

    const sortValue = (flight: FlightRecord, field: FlightSortField): string | number => ({
      flightDate: flight.FL_DATE,
      carrier: flight.OP_CARRIER,
      flightNumber: Number(flight.OP_CARRIER_FL_NUM),
      route: formatRoute(flight),
      scheduledDeparture: flight.CRS_DEP_TIME,
      scheduledArrival: flight.CRS_ARR_TIME,
      departureDelay: flight.DEP_DELAY ?? Number.POSITIVE_INFINITY,
      arrivalDelay: flight.ARR_DELAY ?? Number.POSITIVE_INFINITY,
      status: isDelayed(flight) ? 1 : 0,
      distance: flight.DISTANCE,
    })[field]
    const direction = request.sort.direction === 'asc' ? 1 : -1
    const sorted = [...searched].sort((left, right) => {
      const leftValue = sortValue(left, request.sort.field)
      const rightValue = sortValue(right, request.sort.field)
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : new Intl.Collator('vi', { numeric: true, sensitivity: 'base' }).compare(String(leftValue), String(rightValue))
      if (result !== 0) return result * direction
      return `${left.FL_DATE}-${left.OP_CARRIER}-${left.OP_CARRIER_FL_NUM}`.localeCompare(`${right.FL_DATE}-${right.OP_CARRIER}-${right.OP_CARRIER_FL_NUM}`, 'vi')
    })
    const start = Math.max(0, (request.page - 1) * request.pageSize)
    const appliedFilters = [
      ...Object.entries(request.sourceFilters).filter(([, value]) => value !== undefined && (!Array.isArray(value) || value.length > 0)).map(([key, value]) => ({ key, label: key, value: Array.isArray(value) ? value.join(', ') : String(value), provenance: 'source' as const, locked: key === 'route' || key === 'airport' })),
      ...Object.entries(local).filter(([, value]) => value !== undefined && value !== '' && value !== 'all').map(([key, value]) => ({ key, label: key, value: String(value), provenance: 'investigation' as const })),
    ]
    return {
      metadata: this.createMetadata('DỮ LIỆU MINH HỌA — BẢN GHI MẪU ĐANG CÓ', filtered.length),
      metrics,
      rows: sorted.slice(start, start + request.pageSize),
      totalRows: sorted.length,
      filteredRecordCount: filtered.length,
      estimatedPopulationRows: scaleCount(filtered.length),
      countScale: MOCK_SAMPLE_MULTIPLIER,
      appliedFilters,
      sourceDataVersion: 'mock-flights-v3',
    }
  }

  async getFutureFlights(filters: PredictionFilters, globalFilters?: GlobalFilters): Promise<FutureFlightsData> {
    const activeF = globalFilters ?? this.activeFilters
    const allFlights = await this.loadFlights()
    const baseFlights = this.filterFlights(allFlights, activeF, 'WN')
    const eligible = baseFlights.filter(isEligible)

    const routeDelayMap = new Map<string, { total: number; delayed: number; arrivalDelaySum: number }>()
    for (const f of eligible) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const entry = routeDelayMap.get(r) ?? { total: 0, delayed: 0, arrivalDelaySum: 0 }
      entry.total += 1
      if (isDelayed(f)) entry.delayed += 1
      entry.arrivalDelaySum += f.ARR_DELAY ?? 0
      routeDelayMap.set(r, entry)
    }

    const defaultRoutes = ['DAL → ATL', 'BWI → MCO', 'MDW → DEN', 'HOU → DEN', 'PHX → LAS', 'DEN → MDW']
    const availableRoutes = Array.from(routeDelayMap.keys())
    const candidateRoutes = availableRoutes.length > 0 ? availableRoutes.slice(0, 6) : defaultRoutes

    const predictionStart = filters.window.split(' → ')[0] || '2019-01-01'
    const windowAdjustment = predictionStart === '2019-01-01' ? 0 : 0.03
    const flights: FutureFlight[] = candidateRoutes.map((route, idx) => {
      const stats = routeDelayMap.get(route)
      const historicalRate = stats && stats.total > 0 ? stats.delayed / stats.total : 0.28
      const probability = Number(Math.min(0.85, Math.max(0.12, historicalRate * 1.25 + (idx % 3 === 0 ? 0.05 : -0.03) + windowAdjustment)).toFixed(2))
      const riskLabel: FutureFlight['riskLabel'] = probability >= 0.38 ? 'High' : probability >= 0.28 ? 'Elevated' : 'Monitor'
      const flightNum = 1000 + idx * 215
      const date = new Date(`${predictionStart}T00:00:00Z`)
      date.setUTCDate(date.getUTCDate() + idx + 1)
      const departureHour = [5, 8, 14, 19][idx % 4]

      return {
        id: `WN${flightNum}-${date.toISOString().slice(0, 10).replace(/-/g, '')}`,
        flightNumber: `WN ${flightNum}`,
        departureAt: `${date.toISOString().slice(0, 10)}T${String(departureHour).padStart(2, '0')}:30:00-06:00`,
        route,
        probability,
        riskLabel,
        modelVersion: 'DEMO-RISK-v0',
        historicalRate: stats && stats.total > 0 ? Number((historicalRate * 100).toFixed(1)) : null,
        historicalDelayed: stats ? scaleCount(stats.delayed) : 0,
        historicalEligible: stats ? scaleCount(stats.total) : 0,
        historicalAverageDelay: stats && stats.total > 0 ? Number((stats.arrivalDelaySum / stats.total).toFixed(1)) : null,
        historicalUnavailableReason: stats && stats.total > 0 ? undefined : 'Không có bằng chứng lịch sử tương ứng',
      }
    })

    const filteredFlights = flights.filter((flight) => {
      if (filters.route && flight.route !== filters.route) return false
      if (filters.timeBlock) {
        const hour = Number(flight.departureAt.slice(11, 13))
        if (getTimeBlock(hour * 100) !== filters.timeBlock) return false
      }
      return true
    })

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
    const aggregateFlights = filters.timeBlock
      ? eligible.filter((flight) => getTimeBlock(flight.CRS_DEP_TIME) === filters.timeBlock)
      : eligible
    const networkRate = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : 0

    const routeMap = new Map<string, FlightRecord[]>()
    for (const f of aggregateFlights) {
      const r = `${f.ORIGIN} → ${f.DEST}`
      const list = routeMap.get(r) ?? []
      list.push(f)
      routeMap.set(r, list)
    }

    const sortedRoutes = Array.from(routeMap.entries())
      .map(([route, list]) => {
        const del = list.filter(isDelayed)
        const rate = (del.length / list.length) * 100
        const averageDelay = list.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / list.length
        return { route, count: list.length, delayed: del.length, rate, averageDelay }
      })
      .sort((a, b) => b.rate - a.rate)

    const candidateRoutes = filters.route
      ? sortedRoutes.filter((item) => item.route === filters.route)
      : sortedRoutes

    const windowAdjustment = filters.window.startsWith('2019-01-08') ? 1.5 : 0

    const airports = await this.loadAirports()
    const airportMap = new Map(airports.map((a) => [a.code, a]))
    const hotspotAirports = this.computeHotspotAirports(aggregateFlights, airportMap, networkRate)

    const airportAggregates: RiskAggregate[] = hotspotAirports.map((item) => {
      const histRate = Number(item.rate.toFixed(1))
      const histGap = Number((item.gap ?? (histRate - networkRate)).toFixed(1))
      const expRate = Number((histRate * 1.15 + windowAdjustment).toFixed(1))
      const highRisk = Number((histRate * 1.22 + windowAdjustment).toFixed(1))
      const rawCount = item.eligibleCount ?? item.n
      const scoredN = scaleCount(Math.max(1, Math.round((rawCount / MOCK_SAMPLE_MULTIPLIER) * 0.15)))

      return {
        id: item.code,
        entity: `${item.name} (${item.code})`,
        type: 'Airport' as const,
        code: item.code,
        expectedRate: expRate,
        highRiskShare: Math.min(100, highRisk),
        historicalRate: histRate,
        historicalGap: histGap,
        historicalDelayed: item.delayedCount ?? 0,
        historicalEligible: item.eligibleCount ?? item.n,
        historicalAverageDelay: Number(item.averageDelay.toFixed(1)),
        scoredN,
        historicalN: item.n,
        sampleFlag: item.flag,
        priority: 'Uncalibrated' as const,
        rationale: `Rủi ro minh họa cho sân bay ${item.name} (${item.code}), tỷ lệ đến trễ lịch sử ${histRate.toFixed(1).replace('.', ',')}%; quy tắc cỡ mẫu/ưu tiên chưa duyệt.`,
      }
    }).sort((a, b) => b.expectedRate - a.expectedRate)

    const routeAggregates: RiskAggregate[] = candidateRoutes.map((item) => {
      const histRate = Number(item.rate.toFixed(1))
      const histGap = Number((histRate - networkRate).toFixed(1))
      const expRate = Number((histRate * 1.18 + windowAdjustment).toFixed(1))
      const highRisk = Number((histRate * 1.25 + windowAdjustment).toFixed(1))
      const parts = item.route.split(' → ')

      return {
        id: item.route.replace(' → ', '-'),
        entity: item.route,
        type: 'Route' as const,
        origin: parts[0]?.trim(),
        destination: parts[1]?.trim(),
        expectedRate: expRate,
        highRiskShare: Math.min(100, highRisk),
        historicalRate: histRate,
        historicalGap: histGap,
        historicalDelayed: scaleCount(item.delayed),
        historicalEligible: scaleCount(item.count),
        historicalAverageDelay: Number(item.averageDelay.toFixed(1)),
        scoredN: scaleCount(Math.max(1, Math.round(item.count * 0.15))),
        historicalN: scaleCount(item.count),
        sampleFlag: 'Uncalibrated' as const,
        priority: 'Uncalibrated' as const,
        rationale: `Rủi ro minh họa cao cho tuyến ${item.route}, dữ liệu lịch sử cao hơn BL-AR; quy tắc cỡ mẫu/ưu tiên chưa duyệt.`,
      }
    })

    const routesByAirport: Record<string, RiskAggregate[]> = {}
    for (const ap of hotspotAirports) {
      routesByAirport[ap.code] = routeAggregates.filter(
        (r) => r.origin === ap.code || r.destination === ap.code
      )
    }

    const aggregates: RiskAggregate[] = [...routeAggregates, ...airportAggregates].sort((a, b) => b.expectedRate - a.expectedRate)

    const byTime = ['Early Morning', 'Morning', 'Afternoon', 'Evening'].map((label) => {
      const historical = eligible.filter((flight) => getTimeBlock(flight.CRS_DEP_TIME) === label)
      const delayed = historical.filter(isDelayed)
      const historicalRate = historical.length > 0 ? (delayed.length / historical.length) * 100 : null
      const historicalAverageDelay = historical.length > 0
        ? historical.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / historical.length
        : null
      return {
        label,
        expectedRate: historicalRate === null ? 0 : Number((historicalRate * 1.12 + windowAdjustment).toFixed(1)),
        n: historical.length > 0 ? scaleCount(Math.max(1, Math.round(historical.length * 0.15))) : 0,
        historicalRate: historicalRate === null ? null : Number(historicalRate.toFixed(1)),
        historicalDelayed: scaleCount(delayed.length),
        historicalEligible: scaleCount(historical.length),
        historicalAverageDelay: historicalAverageDelay === null ? null : Number(historicalAverageDelay.toFixed(1)),
        unavailableReason: historical.length > 0 ? undefined : 'Không có chuyến bay đủ điều kiện',
      }
    })

    return {
      metadata: this.createMetadata('RỦI RO VÀ MỨC ƯU TIÊN MINH HỌA — KHÔNG PHẢI KHUYẾN NGHỊ VẬN HÀNH', eligible.length),
      aggregates,
      routes: routeAggregates,
      airports: airportAggregates,
      routesByAirport,
      byTime,
    }
  }

  async getPredictionExplanation(id: string): Promise<PredictionExplanationData> {
    const isFlight = id.startsWith('WN')
    const isAirport = !isFlight && !id.includes('-') && !id.includes(' → ')
    const entity = isFlight
      ? `${id.slice(0, 6)} · Tuyến bay kế hoạch`
      : isAirport
      ? `${id} · Sân bay phân đoạn`
      : `${id.replace('-', ' → ')} · Tuyến bay tổng hợp`

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
    const networkRate: number | null = eligible.length > 0
      ? Number(((eligible.filter(isDelayed).length / eligible.length) * 100).toFixed(1))
      : null

    let segmentFlights = eligible
    if (entity.includes('→')) {
      segmentFlights = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === entity)
    } else if (entity.length === 3) {
      segmentFlights = eligible.filter((f) => f.DEST === entity || f.ORIGIN === entity)
    }

    const sDelayed = segmentFlights.filter(isDelayed)
    const historicalRate: number | null = segmentFlights.length > 0
      ? Number(((sDelayed.length / segmentFlights.length) * 100).toFixed(1))
      : null
    const gap = historicalRate !== null && networkRate !== null
      ? Number((historicalRate - networkRate).toFixed(1))
      : null
    const avg: number | null = segmentFlights.length > 0
      ? Number((segmentFlights.reduce((acc, cur) => acc + (cur.ARR_DELAY || 0), 0) / segmentFlights.length).toFixed(1))
      : null

    return {
      metadata: this.createMetadata('BẰNG CHỨNG MINH HỌA — BẮT BUỘC ĐÁNH GIÁ THỦ CÔNG (HUMAN REVIEW)', segmentFlights.length),
      entity,
      historicalRate,
      baselineRate: networkRate,
      gap,
      eligible: scaleCount(segmentFlights.length),
      delayed: scaleCount(sDelayed.length),
      averageDelay: avg,
      unavailableReason: segmentFlights.length > 0 ? undefined : 'Không có chuyến bay đủ điều kiện cho phân đoạn và bộ lọc hiện tại',
      sampleFlag: 'Uncalibrated',
      predictedRisk: historicalRate === null ? null : Number((historicalRate * 1.18).toFixed(1)),
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
      segmentFlights = eligible.filter((f) => `${f.ORIGIN} → ${f.DEST}` === entity)
    } else if (entity.length === 3) {
      segmentFlights = eligible.filter((f) => f.DEST === entity || f.ORIGIN === entity)
    }

    const delayedFlights = segmentFlights.filter(isDelayed)
    const delayRate = segmentFlights.length > 0 ? (delayedFlights.length / segmentFlights.length) * 100 : null
    const averageDelay = segmentFlights.length > 0
      ? segmentFlights.reduce((sum, flight) => sum + (flight.ARR_DELAY ?? 0), 0) / segmentFlights.length
      : null
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
      eligible: scaleCount(segmentFlights.length),
      delayedN: scaleCount(delayedFlights.length),
      delayRate: delayRate === null ? null : Number(delayRate.toFixed(1)),
      averageDelay: averageDelay === null ? null : Number(averageDelay.toFixed(1)),
      unavailableReason: segmentFlights.length > 0 ? undefined : 'Không có chuyến bay đủ điều kiện',
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
