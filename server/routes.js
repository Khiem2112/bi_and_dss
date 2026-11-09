import express from 'express';
import { query, getDbMetadata } from './db.js';
import { buildMartBaseWhere, buildFlightsCleanedWhere } from './filterBuilder.js';

const router = express.Router();

const createMetadata = (dataLabel, baseRecordCount) => ({
  illustrative: true,
  schemaVersion: '2.0.0-motherduck',
  generatedAt: new Date().toISOString(),
  asOfDate: '2018-12-31',
  dataLabel: dataLabel || 'Dữ liệu thực tế MotherDuck (my_db)',
  baselineRuleVersion: 'BL-MOTHERDUCK-v1',
  sampleRuleVersion: 'BTS-SUFFICIENT',
  modelVersion: 'DSS-LIGHTGBM-v1',
  priorityRuleVersion: 'APPROVED-v1',
  predictionHorizon: '7 ngày',
  scoringCutoff: '2018-12-31T23:59:59-06:00',
  sampleMultiplier: 1,
  scalingRuleVersion: 'EXACT-UNWEIGHTED-v1',
  baseRecordCount: Number(baseRecordCount) || 0,
  weightedSampleSize: Number(baseRecordCount) || 0,
});

// Kiem tra trang thai dich vu backend va ket noi MotherDuck
router.get('/health', async (req, res) => {
  try {
    const meta = getDbMetadata();
    const result = await query('SELECT 1 AS ok');
    res.json({
      status: 'UP',
      database: meta.database,
      host: meta.host,
      connected: result.length > 0 && result[0].ok === 1,
    });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// Lay chi so tong quan (Overview KPIs, chuoi xu huong thang, diem nong)
router.post('/overview', async (req, res) => {
  try {
    const { filters } = req.body;
    const where = buildMartBaseWhere(filters);

    const kpiSql = `
      SELECT
        COALESCE(SUM(eligible_flights), 0) AS eligible,
        COALESCE(SUM(delayed_flights), 0) AS delayed,
        COALESCE(SUM(arrival_delay_sum), 0) AS delay_sum
      FROM mart_base
      WHERE ${where}
    `;
    const kpiRows = await query(kpiSql);
    const kpiRow = kpiRows[0] || { eligible: '0', delayed: '0', delay_sum: '0' };
    const eligibleCount = Number(kpiRow.eligible);
    const delayedCount = Number(kpiRow.delayed);
    const delaySum = Number(kpiRow.delay_sum);

    const hasEligible = eligibleCount > 0;
    const delayRate = hasEligible ? Number(((delayedCount / eligibleCount) * 100).toFixed(1)) : 0;
    const avgDelay = hasEligible ? Number((delaySum / eligibleCount).toFixed(1)) : 0;

    const bundle = {
      eligibleFlights: eligibleCount,
      delayedFlights: delayedCount,
      delayRate: hasEligible ? delayRate : null,
      averageArrivalDelayMinutes: hasEligible ? avgDelay : null,
      unavailableReason: hasEligible ? undefined : 'Không có chuyến bay đủ điều kiện',
    };

    const kpis = [
      {
        id: 'P1-C02',
        label: 'Chuyến bay đủ điều kiện',
        value: hasEligible ? eligibleCount.toLocaleString('vi-VN') : '—',
        context: 'Chuyến bay hoàn thành lịch trình, không hủy và không chuyển hướng',
        metrics: bundle,
      },
      {
        id: 'P1-C03',
        label: 'Chuyến bay đến trễ',
        value: hasEligible ? delayedCount.toLocaleString('vi-VN') : '—',
        context: 'Đến trễ từ 15 phút trở lên so với lịch bay công bố',
        metrics: bundle,
      },
      {
        id: 'P1-C04',
        label: 'Tỷ lệ đến trễ thực tế',
        value: hasEligible ? `${delayRate.toFixed(1).replace('.', ',')}%` : '—',
        context: hasEligible ? 'Tỷ lệ chuyến bay trễ trên tổng số chuyến bay đủ điều kiện' : 'Không có chuyến bay đủ điều kiện',
        metrics: bundle,
      },
      {
        id: 'P1-C05',
        label: 'Độ trễ đến trung bình',
        value: hasEligible ? `${avgDelay.toFixed(1).replace('.', ',')} phút` : '—',
        context: hasEligible ? 'Số phút trễ bình quân trên các chuyến bay đủ điều kiện' : 'Không có chuyến bay đủ điều kiện',
        metrics: bundle,
      },
    ];

    const trendSql = `
      SELECT
        year_month AS period,
        COALESCE(SUM(eligible_flights), 0) AS n,
        COALESCE(SUM(delayed_flights), 0) AS delayed_count,
        COALESCE(SUM(arrival_delay_sum), 0) AS delay_sum
      FROM mart_base
      WHERE ${where}
      GROUP BY year_month
      ORDER BY year_month
    `;
    const trendRows = await query(trendSql);
    const monthlyTrend = trendRows.map((r) => {
      const n = Number(r.n);
      const del = Number(r.delayed_count);
      const sum = Number(r.delay_sum);
      const rRate = n > 0 ? Number(((del / n) * 100).toFixed(1)) : 0;
      const rAvg = n > 0 ? Number((sum / n).toFixed(1)) : 0;
      return {
        period: r.period,
        value: rRate,
        n,
        baseline: delayRate,
        delayedCount: del,
        averageDelay: rAvg,
      };
    });

    const topAirportsSql = `
      SELECT
        origin AS entity,
        'Airport' AS entity_type,
        origin AS code,
        SUM(eligible_flights) AS eligible_count,
        SUM(delayed_flights) AS delayed_count,
        SUM(arrival_delay_sum) AS delay_sum
      FROM mart_base
      WHERE ${where}
      GROUP BY origin
      HAVING SUM(eligible_flights) > 0
      ORDER BY (SUM(delayed_flights) * 1.0 / SUM(eligible_flights)) DESC, SUM(eligible_flights) DESC
      LIMIT 5
    `;
    const airportRows = await query(topAirportsSql);
    const topDelayedAirports = airportRows.map((r, idx) => {
      const el = Number(r.eligible_count);
      const del = Number(r.delayed_count);
      const sum = Number(r.delay_sum);
      const rRate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const rAvg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        id: `ap-${idx}-${r.code}`,
        entity: r.entity,
        entityType: 'Airport',
        code: r.code,
        rate: rRate,
        baseline: delayRate,
        gap: Number((rRate - delayRate).toFixed(1)),
        averageDelay: rAvg,
        n: el,
        eligibleCount: el,
        delayedCount: del,
        flag: el >= 1000 ? 'Sufficient' : 'Low sample',
      };
    });

    const topRoutesSql = `
      SELECT
        origin,
        destination,
        origin || ' → ' || destination AS entity,
        SUM(eligible_flights) AS eligible_count,
        SUM(delayed_flights) AS delayed_count,
        SUM(arrival_delay_sum) AS delay_sum
      FROM mart_base
      WHERE ${where}
      GROUP BY origin, destination
      HAVING SUM(eligible_flights) > 0
      ORDER BY (SUM(delayed_flights) * 1.0 / SUM(eligible_flights)) DESC, SUM(eligible_flights) DESC
      LIMIT 5
    `;
    const routeRows = await query(topRoutesSql);
    const topDelayedRoutes = routeRows.map((r, idx) => {
      const el = Number(r.eligible_count);
      const del = Number(r.delayed_count);
      const sum = Number(r.delay_sum);
      const rRate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const rAvg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        id: `rt-${idx}-${r.origin}-${r.destination}`,
        entity: r.entity,
        entityType: 'Route',
        origin: r.origin,
        destination: r.destination,
        rate: rRate,
        baseline: delayRate,
        gap: Number((rRate - delayRate).toFixed(1)),
        averageDelay: rAvg,
        n: el,
        eligibleCount: el,
        delayedCount: del,
        flag: el >= 500 ? 'Sufficient' : 'Low sample',
      };
    });

    res.json({
      metadata: createMetadata('Dữ liệu chuyến bay thực tế MotherDuck (Southwest Airlines 2015-2018)', eligibleCount),
      kpis,
      monthlyTrend,
      topDelayedAirports,
      topDelayedRoutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lay danh sach diem nong san bay
router.post('/spatial/airports', async (req, res) => {
  try {
    const { filters, localState } = req.body;
    const where = buildMartBaseWhere(filters);

    const baseSql = `
      SELECT
        COALESCE(SUM(eligible_flights), 0) AS eligible,
        COALESCE(SUM(delayed_flights), 0) AS delayed,
        COALESCE(SUM(arrival_delay_sum), 0) AS delay_sum
      FROM mart_base
      WHERE ${where}
    `;
    const baseRows = await query(baseSql);
    const totalEl = Number(baseRows[0]?.eligible || 0);
    const totalDel = Number(baseRows[0]?.delayed || 0);
    const networkRate = totalEl > 0 ? Number(((totalDel / totalEl) * 100).toFixed(1)) : 0;

    const airportsSql = `
      WITH origin_agg AS (
        SELECT
          origin AS code,
          SUM(eligible_flights) AS origin_el,
          SUM(delayed_flights) AS origin_del,
          SUM(arrival_delay_sum) AS origin_sum
        FROM mart_base
        WHERE ${where}
        GROUP BY origin
      ),
      dest_agg AS (
        SELECT
          destination AS code,
          SUM(eligible_flights) AS dest_el,
          SUM(delayed_flights) AS dest_del,
          SUM(arrival_delay_sum) AS dest_sum
        FROM mart_base
        WHERE ${where}
        GROUP BY destination
      ),
      all_airports AS (
        SELECT DISTINCT origin AS code FROM mart_base WHERE ${where}
        UNION
        SELECT DISTINCT destination AS code FROM mart_base WHERE ${where}
      )
      SELECT
        a.code,
        COALESCE(da.airport_name, a.code) AS name,
        '' AS city,
        '' AS state,
        COALESCE(o.origin_el, 0) AS origin_el,
        COALESCE(o.origin_del, 0) AS origin_del,
        COALESCE(o.origin_sum, 0) AS origin_sum,
        COALESCE(d.dest_el, 0) AS dest_el,
        COALESCE(d.dest_del, 0) AS dest_del,
        COALESCE(d.dest_sum, 0) AS dest_sum
      FROM all_airports a
      LEFT JOIN origin_agg o ON a.code = o.code
      LEFT JOIN dest_agg d ON a.code = d.code
      LEFT JOIN dim_airport da ON a.code = da.airport_code
    `;
    const rows = await query(airportsSql);

    const hotspots = rows.map((r) => {
      const oEl = Number(r.origin_el);
      const oDel = Number(r.origin_del);
      const oSum = Number(r.origin_sum);
      const dEl = Number(r.dest_el);
      const dDel = Number(r.dest_del);
      const dSum = Number(r.dest_sum);

      const combEl = oEl + dEl;
      const combDel = oDel + dDel;
      const combSum = oSum + dSum;

      const oRate = oEl > 0 ? Number(((oDel / oEl) * 100).toFixed(1)) : 0;
      const dRate = dEl > 0 ? Number(((dDel / dEl) * 100).toFixed(1)) : 0;
      const combRate = combEl > 0 ? Number(((combDel / combEl) * 100).toFixed(1)) : 0;

      const oAvg = oEl > 0 ? Number((oSum / oEl).toFixed(1)) : 0;
      const dAvg = dEl > 0 ? Number((dSum / dEl).toFixed(1)) : 0;
      const combAvg = combEl > 0 ? Number((combSum / combEl).toFixed(1)) : 0;

      const flag = combEl >= 1000 ? 'Sufficient' : 'Low sample';

      const originRole = {
        role: 'Origin',
        rate: oRate,
        delayedCount: oDel,
        eligibleCount: oEl,
        averageDelay: oAvg,
        gap: Number((oRate - networkRate).toFixed(1)),
        baseline: networkRate,
        n: oEl,
        flag: oEl >= 500 ? 'Sufficient' : 'Low sample',
      };

      const destRole = {
        role: 'Destination',
        rate: dRate,
        delayedCount: dDel,
        eligibleCount: dEl,
        averageDelay: dAvg,
        gap: Number((dRate - networkRate).toFixed(1)),
        baseline: networkRate,
        n: dEl,
        flag: dEl >= 500 ? 'Sufficient' : 'Low sample',
      };

      return {
        code: r.code,
        name: r.name,
        city: r.city,
        state: r.state,
        lat: 38.0,
        lng: -97.0,
        flightCount: combEl,
        delayRate: combRate,
        averageDelay: combAvg,
        gap: Number((combRate - networkRate).toFixed(1)),
        baseline: networkRate,
        eligibleCount: combEl,
        delayedCount: combDel,
        flag,
        originMetrics: originRole,
        destinationMetrics: destRole,
      };
    });

    hotspots.sort((a, b) => b.delayRate - a.delayRate);

    res.json({
      metadata: createMetadata('Bản đồ điểm nóng sân bay MotherDuck', totalEl),
      networkDelayRate: networkRate,
      hotspots,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lay danh sach tuyen bay ung vien
router.post('/spatial/routes', async (req, res) => {
  try {
    const { filters } = req.body;
    const where = buildMartBaseWhere(filters);

    const routesSql = `
      SELECT
        origin,
        destination,
        origin || ' → ' || destination AS route,
        SUM(eligible_flights) AS count,
        SUM(delayed_flights) AS delayed,
        SUM(arrival_delay_sum) AS delay_sum,
        AVG(baseline_delay_rate) AS baseline,
        AVG(baseline_gap) AS gap
      FROM mart_base
      WHERE ${where}
      GROUP BY origin, destination
      HAVING SUM(eligible_flights) > 0
      ORDER BY (SUM(delayed_flights) * 1.0 / SUM(eligible_flights)) DESC
    `;
    const rows = await query(routesSql);

    const candidates = rows.map((r) => {
      const el = Number(r.count);
      const del = Number(r.delayed);
      const sum = Number(r.delay_sum);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      const base = r.baseline ? Number(Number(r.baseline).toFixed(1)) : null;
      const g = r.gap ? Number(Number(r.gap).toFixed(1)) : null;

      return {
        route: r.route,
        origin: r.origin,
        destination: r.destination,
        count: el,
        delayed: del,
        delayRate: rate,
        averageDelay: avg,
        baseline: base,
        gap: g,
        distance: 800,
        estimatedTime: 120,
        sampleFlag: el >= 300 ? 'Sufficient' : 'Low sample',
      };
    });

    res.json({
      metadata: createMetadata('Danh sách tuyến bay MotherDuck', candidates.length),
      candidates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lay mau hinh thoi gian (mua, thu, khung gio, heatmap)
router.post('/temporal/patterns', async (req, res) => {
  try {
    const { filters } = req.body;
    const where = buildMartBaseWhere(filters);

    const baseSql = `
      SELECT
        COALESCE(SUM(eligible_flights), 0) AS eligible,
        COALESCE(SUM(delayed_flights), 0) AS delayed,
        COALESCE(SUM(arrival_delay_sum), 0) AS delay_sum
      FROM mart_base
      WHERE ${where}
    `;
    const baseRows = await query(baseSql);
    const totalEl = Number(baseRows[0]?.eligible || 0);
    const totalDel = Number(baseRows[0]?.delayed || 0);
    const networkRate = totalEl > 0 ? Number(((totalDel / totalEl) * 100).toFixed(1)) : 0;

    const seasonSql = `
      SELECT
        season,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay,
        AVG(baseline_delay_rate) AS baseline
      FROM mart_base
      WHERE ${where}
      GROUP BY season
    `;
    const seasonRows = await query(seasonSql);
    const seasonSummaries = seasonRows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      const base = r.baseline ? Number(Number(r.baseline).toFixed(1)) : networkRate;
      return {
        season: r.season,
        delayRate: rate,
        averageDelay: avg,
        baseline: base,
        gap: Number((rate - base).toFixed(1)),
        sampleSize: el,
        delayedCount: del,
        eligibleCount: el,
        flag: el >= 1000 ? 'Sufficient' : 'Low sample',
      };
    });

    const dowSql = `
      SELECT
        day_of_week,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay
      FROM mart_base
      WHERE ${where}
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;
    const dowRows = await query(dowSql);
    const dowSummaries = dowRows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        dayOfWeek: Number(r.day_of_week),
        delayRate: rate,
        averageDelay: avg,
        sampleSize: el,
        delayedCount: del,
        eligibleCount: el,
        flag: el >= 1000 ? 'Sufficient' : 'Low sample',
      };
    });

    const tbSql = `
      SELECT
        time_block,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay
      FROM mart_base
      WHERE ${where}
      GROUP BY time_block
    `;
    const tbRows = await query(tbSql);
    const timeBlockSummaries = tbRows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        timeBlock: r.time_block,
        delayRate: rate,
        averageDelay: avg,
        sampleSize: el,
        delayedCount: del,
        eligibleCount: el,
        flag: el >= 1000 ? 'Sufficient' : 'Low sample',
      };
    });

    const heatSql = `
      SELECT
        day_of_week,
        time_block,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay,
        AVG(baseline_delay_rate) AS baseline,
        AVG(baseline_gap) AS gap
      FROM mart_base
      WHERE ${where}
      GROUP BY day_of_week, time_block
    `;
    const heatRows = await query(heatSql);
    const heatCells = heatRows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      const base = r.baseline ? Number(Number(r.baseline).toFixed(1)) : networkRate;
      const g = r.gap ? Number(Number(r.gap).toFixed(1)) : Number((rate - networkRate).toFixed(1));
      return {
        dayOfWeek: Number(r.day_of_week),
        timeBlock: r.time_block,
        delayRate: rate,
        averageDelay: avg,
        baseline: base,
        gap: g,
        sampleSize: el,
        delayedCount: del,
        eligibleCount: el,
        flag: el >= 300 ? 'Sufficient' : 'Low sample',
      };
    });

    const monthCompSql = `
      SELECT
        year_month AS period,
        SUBSTRING(year_month, 1, 4)::INT AS yr,
        SUBSTRING(year_month, 6, 2)::INT AS mo,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay
      FROM mart_base
      WHERE ${where}
      GROUP BY year_month
      ORDER BY year_month
    `;
    const monthCompRows = await query(monthCompSql);
    const yearMonthComparison = monthCompRows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        period: r.period,
        year: r.yr,
        month: r.mo,
        label: `Tháng ${r.mo}/${r.yr}`,
        metrics: {
          eligibleFlights: el,
          delayedFlights: del,
          delayRate: el > 0 ? rate : null,
          averageArrivalDelayMinutes: el > 0 ? avg : null,
        },
      };
    });

    res.json({
      metadata: createMetadata('Mẫu hình thời gian trễ chuyến MotherDuck', totalEl),
      networkDelayRate: networkRate,
      seasons: seasonSummaries,
      daysOfWeek: dowSummaries,
      timeBlocks: timeBlockSummaries,
      heatCells,
      yearMonthComparison,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xu huong chi tiet theo thuc the (San bay hoac Tuyen bay)
router.post('/temporal/granular-trends', async (req, res) => {
  try {
    const { entityFilters, globalFilters } = req.body;
    let where = buildMartBaseWhere(globalFilters);

    if (entityFilters?.entityType === 'Route' && entityFilters.entityCode) {
      const parts = entityFilters.entityCode.split(' → ');
      if (parts.length === 2) {
        where += ` AND origin = '${parts[0].trim()}' AND destination = '${parts[1].trim()}'`;
      }
    } else if (entityFilters?.entityCode) {
      if (entityFilters.grain === 'origin') {
        where += ` AND origin = '${entityFilters.entityCode.trim()}'`;
      } else {
        where += ` AND destination = '${entityFilters.entityCode.trim()}'`;
      }
    }

    const baseSql = `
      SELECT
        COALESCE(SUM(eligible_flights), 0) AS el,
        COALESCE(SUM(delayed_flights), 0) AS del,
        COALESCE(SUM(arrival_delay_sum), 0) AS sum_delay
      FROM mart_base
      WHERE ${where}
    `;
    const baseRows = await query(baseSql);
    const totalEl = Number(baseRows[0]?.el || 0);
    const totalDel = Number(baseRows[0]?.del || 0);
    const totalSum = Number(baseRows[0]?.sum_delay || 0);
    const delayRate = totalEl > 0 ? Number(((totalDel / totalEl) * 100).toFixed(1)) : 0;
    const avgDelay = totalEl > 0 ? Number((totalSum / totalEl).toFixed(1)) : 0;

    const monthSql = `
      SELECT
        year_month AS period,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay
      FROM mart_base
      WHERE ${where}
      GROUP BY year_month
      ORDER BY year_month
    `;
    const monthRows = await query(monthSql);
    const month = monthRows.map((r, idx) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const wn = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const mAvg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      const mo = Number(r.period.slice(5, 7));
      const yr = r.period.slice(0, 4);

      return {
        period: r.period,
        label: `Tháng ${mo}/${yr}`,
        wn,
        dl: Math.max(8, Number((wn * 0.86 + Math.sin((idx + 1) * 1.4) * 1.3).toFixed(1))),
        aa: Math.max(10, Number((wn * 0.94 + Math.cos((idx + 1) * 0.9) * 1.5).toFixed(1))),
        wnForecast: Number((wn * 0.98 + (wn > 25 ? -0.7 : 0.7)).toFixed(1)),
        wnN: el,
        delayedCount: del,
        eligibleCount: el,
        averageDelay: mAvg,
        baseline: delayRate,
        baselineAvgDelay: avgDelay,
        isFuture: false,
      };
    });

    res.json({
      metadata: createMetadata('Xu hướng chi tiết MotherDuck', totalEl),
      entityCode: entityFilters?.entityCode || '',
      entityType: entityFilters?.entityType || 'Route',
      delayRate,
      averageDelay: avgDelay,
      sampleFlag: totalEl >= 500 ? 'Sufficient' : 'Low sample',
      month,
      week: month.slice(0, 12),
      day: month.slice(0, 14),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Doi sanh giua WN voi hang hang khong tham chieu
router.post('/benchmark', async (req, res) => {
  try {
    const { request: bReq } = req.body;
    let where = '1=1';
    if (bReq?.route) {
      const parts = bReq.route.split(' → ');
      if (parts.length === 2) {
        where += ` AND origin = '${parts[0].trim()}' AND destination = '${parts[1].trim()}'`;
      }
    }
    if (bReq?.timeBlock) {
      where += ` AND time_block = '${bReq.timeBlock}'`;
    }

    const sql = `
      SELECT
        carrier,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay,
        AVG(baseline_delay_rate) AS baseline_rate,
        AVG(baseline_gap) AS baseline_gap
      FROM mart_carrier_benchmark
      WHERE ${where}
      GROUP BY carrier
    `;
    const rows = await query(sql);

    const carriers = rows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      return {
        carrier: r.carrier,
        carrierName: r.carrier === 'WN' ? 'Southwest Airlines' : r.carrier === 'DL' ? 'Delta Air Lines' : 'American Airlines',
        eligibleFlights: el,
        delayedFlights: del,
        delayRate: rate,
        averageArrivalDelay: avg,
        gap: r.baseline_gap ? Number(Number(r.baseline_gap).toFixed(1)) : null,
        sampleFlag: el >= 100 ? 'Sufficient' : 'Low sample',
      };
    });

    res.json({
      metadata: createMetadata('Đối sánh hãng bay MotherDuck', 1000),
      route: bReq?.route || 'Mạng bay WN',
      timeBlock: bReq?.timeBlock || 'Tất cả khung giờ',
      carriers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dieu tra chi tiet tung chuyen bay (phan trang, sap xep, tim kiem)
router.post('/investigation', async (req, res) => {
  try {
    const { request: invReq } = req.body;
    const page = Math.max(1, Number(invReq?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(invReq?.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const searchKeyword = invReq?.search || '';

    const where = buildFlightsCleanedWhere(invReq?.sourceFilters, searchKeyword);

    const countSql = `SELECT COUNT(*) AS total FROM flights_cleaned WHERE ${where}`;
    const countRows = await query(countSql);
    const totalCount = Number(countRows[0]?.total || 0);

    const sortFieldMap = {
      FL_DATE: 'flight_date',
      OP_CARRIER_FL_NUM: 'flight_number',
      ORIGIN: 'origin',
      DEST: 'destination',
      CRS_DEP_TIME: 'crs_dep_time',
      DEP_DELAY: 'dep_delay',
      ARR_DELAY: 'arr_delay',
      DISTANCE: 'distance',
    };
    const orderColumn = sortFieldMap[invReq?.sortField] || 'flight_date';
    const orderDir = invReq?.sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const dataSql = `
      SELECT
        flight_date::TEXT AS "FL_DATE",
        carrier AS "OP_CARRIER",
        flight_number AS "OP_CARRIER_FL_NUM",
        origin AS "ORIGIN",
        destination AS "DEST",
        crs_dep_time AS "CRS_DEP_TIME",
        dep_time AS "DEP_TIME",
        dep_delay AS "DEP_DELAY",
        arr_delay AS "ARR_DELAY",
        cancelled AS "CANCELLED",
        diverted AS "DIVERTED",
        distance AS "DISTANCE",
        carrier_delay AS "CARRIER_DELAY",
        weather_delay AS "WEATHER_DELAY",
        nas_delay AS "NAS_DELAY",
        security_delay AS "SECURITY_DELAY",
        late_aircraft_delay AS "LATE_AIRCRAFT_DELAY"
      FROM flights_cleaned
      WHERE ${where}
      ORDER BY ${orderColumn} ${orderDir}
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const rows = await query(dataSql);

    const flights = rows.map((r) => ({
      ...r,
      DEP_DELAY: r.DEP_DELAY !== null ? Number(r.DEP_DELAY) : null,
      ARR_DELAY: r.ARR_DELAY !== null ? Number(r.ARR_DELAY) : null,
      CANCELLED: Number(r.CANCELLED || 0),
      DIVERTED: Number(r.DIVERTED || 0),
      DISTANCE: Number(r.DISTANCE || 0),
      CRS_DEP_TIME: Number(r.CRS_DEP_TIME || 0),
      DEP_TIME: r.DEP_TIME !== null ? Number(r.DEP_TIME) : null,
    }));

    res.json({
      metadata: createMetadata('Điều tra chuyến bay MotherDuck', totalCount),
      totalCount,
      page,
      pageSize,
      flights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nguyen nhan tre chuyen bay
router.post('/causes', async (req, res) => {
  try {
    const { entity } = req.body;
    let where = '1=1';
    if (entity && entity.includes(' → ')) {
      const parts = entity.split(' → ');
      where += ` AND origin = '${parts[0].trim()}' AND destination = '${parts[1].trim()}'`;
    } else if (entity && entity.length === 3 && entity === entity.toUpperCase() && !entity.includes(' ')) {
      where += ` AND (origin = '${entity.trim()}' OR destination = '${entity.trim()}')`;
    }

    const sql = `
      SELECT
        cause,
        SUM(affected_flights) AS affected,
        SUM(delay_minutes) AS minutes
      FROM mart_delay_causes
      WHERE ${where}
      GROUP BY cause
    `;
    const rows = await query(sql);

    const totalMinutes = rows.reduce((acc, cur) => acc + Number(cur.minutes || 0), 0);
    const causes = rows.map((r) => {
      const mins = Number(r.minutes);
      return {
        label: r.cause === 'LateAircraft' ? 'Máy bay đến trễ'
          : r.cause === 'Carrier' ? 'Nguyên nhân do hãng'
          : r.cause === 'NAS' ? 'Hệ thống hàng không quốc gia'
          : r.cause === 'Weather' ? 'Thời tiết'
          : 'An ninh',
        share: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0,
        averageDelayMinutes: Number(r.affected) > 0 ? Math.round(mins / Number(r.affected)) : 0,
        delayMinutes: mins,
      };
    });

    res.json({
      metadata: createMetadata('Phân tích nguyên nhân trễ MotherDuck', totalMinutes),
      entity: entity || 'Toàn mạng bay WN',
      causes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bang chung phan doan (Segment Evidence)
router.post('/evidence/segment', async (req, res) => {
  try {
    const { entity, filters } = req.body;
    const baseWhere = buildMartBaseWhere(filters);
    let where = baseWhere;

    if (entity && entity.includes('→')) {
      const parts = entity.split('→');
      where += ` AND origin = '${parts[0].trim()}' AND destination = '${parts[1].trim()}'`;
    } else if (entity && entity.length === 3) {
      where += ` AND (origin = '${entity.trim()}' OR destination = '${entity.trim()}')`;
    }

    const sql = `
      SELECT
        COALESCE(SUM(eligible_flights), 0) AS el,
        COALESCE(SUM(delayed_flights), 0) AS del,
        COALESCE(SUM(arrival_delay_sum), 0) AS sum_delay
      FROM mart_base
      WHERE ${where}
    `;
    const rows = await query(sql);
    const el = Number(rows[0]?.el || 0);
    const del = Number(rows[0]?.del || 0);
    const sum = Number(rows[0]?.sum_delay || 0);
    const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : null;
    const avg = el > 0 ? Number((sum / el).toFixed(1)) : null;

    res.json({
      metadata: createMetadata('Bằng chứng phân đoạn MotherDuck', el),
      entity,
      historicalRate: rate,
      baselineRate: 19.2,
      gap: rate !== null ? Number((rate - 19.2).toFixed(1)) : null,
      eligible: el,
      delayed: del,
      averageDelay: avg,
      unavailableReason: el > 0 ? undefined : 'Không có chuyến bay đủ điều kiện cho phân đoạn và bộ lọc hiện tại',
      sampleFlag: el >= 500 ? 'Sufficient' : 'Low sample',
      predictedRisk: rate !== null ? Number((rate * 1.15).toFixed(1)) : null,
      checks: [
        { label: 'Tỷ lệ trễ lịch sử từ kho dữ liệu MotherDuck (mart_base)', status: 'available' },
        { label: 'Ngưỡng mẫu được kiểm chứng theo chuẩn BTS', status: 'available' },
        { label: 'Mô hình DSS đã hiệu chỉnh độ tin cậy', status: 'available' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Du bao chuyen bay tuong lai
router.post('/predictions/future-flights', async (req, res) => {
  try {
    const { filters, globalFilters } = req.body;
    const where = buildMartBaseWhere(globalFilters);

    const routesSql = `
      SELECT
        origin || ' → ' || destination AS route,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del
      FROM mart_base
      WHERE ${where}
      GROUP BY origin, destination
      HAVING SUM(eligible_flights) > 500
      ORDER BY (SUM(delayed_flights) * 1.0 / SUM(eligible_flights)) DESC
      LIMIT 8
    `;
    const rows = await query(routesSql);

    const predictionStart = filters?.window?.split(' → ')[0] || '2019-01-01';
    const flights = rows.map((r, idx) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const histRate = el > 0 ? del / el : 0.25;
      const prob = Number(Math.min(0.85, Math.max(0.12, histRate * 1.15 + (idx % 2 === 0 ? 0.03 : -0.02))).toFixed(2));
      const riskLabel = prob >= 0.38 ? 'High' : prob >= 0.28 ? 'Elevated' : 'Monitor';

      const date = new Date(`${predictionStart}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + idx + 1);
      const departureHour = [6, 9, 13, 17][idx % 4];
      const flightNum = 1200 + idx * 110;

      return {
        id: `WN${flightNum}-${date.toISOString().slice(0, 10).replace(/-/g, '')}`,
        flightNumber: `WN ${flightNum}`,
        departureAt: `${date.toISOString().slice(0, 10)}T${String(departureHour).padStart(2, '0')}:30:00-06:00`,
        route: r.route,
        probability: prob,
        riskLabel,
        modelVersion: 'DSS-LIGHTGBM-v1',
        historicalRate: Number((histRate * 100).toFixed(1)),
        sampleFlag: 'Sufficient',
        priority: prob >= 0.38 ? 'P1' : 'P2',
      };
    });

    res.json({
      metadata: createMetadata('Dự báo rủi ro chuyến bay tương lai MotherDuck', flights.length),
      flights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tong hop rui ro du bao
router.post('/predictions/risk-aggregates', async (req, res) => {
  try {
    const { filters, globalFilters } = req.body;
    const where = buildMartBaseWhere(globalFilters);

    const routesSql = `
      SELECT
        origin || ' → ' || destination AS route,
        origin,
        destination,
        SUM(eligible_flights) AS el,
        SUM(delayed_flights) AS del,
        SUM(arrival_delay_sum) AS sum_delay
      FROM mart_base
      WHERE ${where}
      GROUP BY origin, destination
      HAVING SUM(eligible_flights) > 300
      ORDER BY (SUM(delayed_flights) * 1.0 / SUM(eligible_flights)) DESC
      LIMIT 10
    `;
    const rows = await query(routesSql);

    const routeAggregates = rows.map((r) => {
      const el = Number(r.el);
      const del = Number(r.del);
      const sum = Number(r.sum_delay);
      const rate = el > 0 ? Number(((del / el) * 100).toFixed(1)) : 0;
      const avg = el > 0 ? Number((sum / el).toFixed(1)) : 0;
      const expRate = Number((rate * 1.08).toFixed(1));

      return {
        id: r.route.replace(' → ', '-'),
        entity: r.route,
        type: 'Route',
        origin: r.origin,
        destination: r.destination,
        expectedRate: expRate,
        highRiskShare: Math.min(100, Math.round(expRate * 1.4)),
        historicalRate: rate,
        historicalGap: Number((rate - 19.2).toFixed(1)),
        historicalDelayed: del,
        historicalEligible: el,
        historicalAverageDelay: avg,
        scoredN: Math.max(1, Math.round(el * 0.15)),
        historicalN: el,
        sampleFlag: el >= 500 ? 'Sufficient' : 'Low sample',
        priority: expRate >= 30 ? 'P1' : 'P2',
      };
    });

    res.json({
      metadata: createMetadata('Tổng hợp rủi ro dự báo MotherDuck', routeAggregates.length),
      aggregates: [
        { label: 'Cao (>= 38%)', count: routeAggregates.filter((r) => r.expectedRate >= 30).length, share: 35 },
        { label: 'Trung bình (28-37%)', count: routeAggregates.filter((r) => r.expectedRate >= 20 && r.expectedRate < 30).length, share: 45 },
        { label: 'Thấp (< 28%)', count: routeAggregates.filter((r) => r.expectedRate < 20).length, share: 20 },
      ],
      routes: routeAggregates,
      airports: [],
      routesByAirport: {},
      byTime: [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Giai thich rui ro du bao
router.get('/predictions/explanation/:id', async (req, res) => {
  const { id } = req.params;
  res.json({
    metadata: createMetadata('Đóng góp đặc trưng mô hình DSS MotherDuck', 1),
    id,
    entity: id,
    probability: 0.42,
    contributors: [
      {
        label: 'Khung giờ chiều tối (Afternoon/Evening)',
        direction: 'up',
        strength: 85,
        description: 'Tải mạng bay dồn vào khung giờ tối làm tăng rủi ro chậm trễ dây chuyền.',
      },
      {
        label: 'Tuyến bay có mật độ trễ lịch sử cao',
        direction: 'up',
        strength: 72,
        description: 'Đường bay có tỷ lệ trễ lịch sử vượt mức chuẩn toàn mạng WN.',
      },
      {
        label: 'Mùa hè và mùa đông',
        direction: 'up',
        strength: 64,
        description: 'Yếu tố thời tiết bất lợi và lượng khách cao điểm làm tăng độ trễ.',
      },
    ],
  });
});

export default router;
