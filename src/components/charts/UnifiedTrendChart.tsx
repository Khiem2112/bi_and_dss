import { useMemo, useState } from 'react'
import type { GranularTrendsData, GranularTrendSeries } from '../../domain/types'

export type Granularity = 'month' | 'week' | 'day'

interface UnifiedTrendChartProps {
  data: GranularTrendsData
  onSelectPeriod?: (period: string) => void
  onToast?: (message: string) => void
}

const chartWidth = 920
const lineChartHeight = 220
const barChartHeight = 160
const chartPadding = { top: 24, right: 36, bottom: 28, left: 54 }

export function UnifiedTrendChart({ data, onSelectPeriod, onToast }: UnifiedTrendChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [showWn, setShowWn] = useState(true)
  const [showDl, setShowDl] = useState(true)
  const [showAa, setShowAa] = useState(true)
  const [showForecast, setShowForecast] = useState(true)
  const [hoveredBaseline, setHoveredBaseline] = useState(false)
  const [hoveredBarBaseline, setHoveredBarBaseline] = useState(false)
  const [activePeriodIndex, setActivePeriodIndex] = useState<number | null>(null)

  const currentSeries: GranularTrendSeries[] = useMemo(() => {
    return data[granularity] ?? []
  }, [data, granularity])

  const baselineRate = data.baseline
  const baselineAvgDelay = data.baselineAvgDelay ?? 12.3

  const lineGeometry = useMemo(() => {
    const allValues: number[] = [baselineRate]
    currentSeries.forEach((pt) => {
      if (showWn && pt.wn !== null) allValues.push(pt.wn)
      if (showDl && pt.dl !== null) allValues.push(pt.dl)
      if (showAa && pt.aa !== null) allValues.push(pt.aa)
      if (showForecast && pt.wnForecast !== null) allValues.push(pt.wnForecast)
    })

    const minValue = Math.max(0, Math.floor(Math.min(...allValues, 0) / 5) * 5)
    const maxValue = Math.ceil(Math.max(...allValues, 25) / 5) * 5 + 2
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right
    const innerHeight = lineChartHeight - chartPadding.top - chartPadding.bottom

    const x = (index: number) =>
      chartPadding.left + (currentSeries.length <= 1 ? innerWidth / 2 : (index * innerWidth) / (currentSeries.length - 1))
    const y = (val: number) => chartPadding.top + ((maxValue - val) * innerHeight) / Math.max(maxValue - minValue, 1)

    const futureStartIndex = currentSeries.findIndex((pt) => pt.isFuture)
    const futureDividerX =
      futureStartIndex > 0
        ? (x(futureStartIndex - 1) + x(futureStartIndex)) / 2
        : null

    return { minValue, maxValue, innerWidth, innerHeight, x, y, futureStartIndex, futureDividerX }
  }, [currentSeries, showWn, showDl, showAa, showForecast, baselineRate])

  const barGeometry = useMemo(() => {
    const allDelays: number[] = [0, baselineAvgDelay]
    currentSeries.forEach((pt) => {
      if (pt.averageDelay !== undefined) allDelays.push(pt.averageDelay)
    })

    const minDelay = Math.min(0, Math.floor(Math.min(...allDelays, 0) / 5) * 5)
    const maxDelay = Math.ceil(Math.max(...allDelays, 20) / 5) * 5 + 4
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right
    const innerHeight = barChartHeight - chartPadding.top - chartPadding.bottom

    const y = (val: number) => chartPadding.top + ((maxDelay - val) * innerHeight) / Math.max(maxDelay - minDelay, 1)

    return { minDelay, maxDelay, innerWidth, innerHeight, y }
  }, [currentSeries, baselineAvgDelay])

  const lineGridValues = useMemo(() => {
    const steps = 4
    const stepSize = (lineGeometry.maxValue - lineGeometry.minValue) / steps
    return Array.from({ length: steps + 1 }, (_, i) => lineGeometry.minValue + i * stepSize)
  }, [lineGeometry.minValue, lineGeometry.maxValue])

  const barGridValues = useMemo(() => {
    const steps = 4
    const stepSize = (barGeometry.maxDelay - barGeometry.minDelay) / steps
    return Array.from({ length: steps + 1 }, (_, i) => barGeometry.minDelay + i * stepSize)
  }, [barGeometry.minDelay, barGeometry.maxDelay])

  const wnPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.wn !== null ? { pt, idx, x: lineGeometry.x(idx), y: lineGeometry.y(pt.wn) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, lineGeometry])

  const dlPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.dl !== null ? { pt, idx, x: lineGeometry.x(idx), y: lineGeometry.y(pt.dl) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, lineGeometry])

  const aaPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.aa !== null ? { pt, idx, x: lineGeometry.x(idx), y: lineGeometry.y(pt.aa) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, lineGeometry])

  const forecastPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) =>
        pt.wnForecast !== null ? { pt, idx, x: lineGeometry.x(idx), y: lineGeometry.y(pt.wnForecast) } : null
      )
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, lineGeometry])

  const lineBaselineY = lineGeometry.y(baselineRate)
  const barZeroY = barGeometry.y(0)
  const barBaselineY = barGeometry.y(baselineAvgDelay)

  const activePoint = activePeriodIndex !== null ? currentSeries[activePeriodIndex] : null

  return (
    <div className="unified-trend-container">
      <div className="trend-toolbar">
        <div className="granularity-tabs" role="tablist" aria-label="Chọn chu kỳ hiển thị">
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'month'}
            className={`tab-btn ${granularity === 'month' ? 'active' : ''}`}
            onClick={() => {
              setGranularity('month')
              setActivePeriodIndex(null)
            }}
          >
            Theo tháng
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'week'}
            className={`tab-btn ${granularity === 'week' ? 'active' : ''}`}
            onClick={() => {
              setGranularity('week')
              setActivePeriodIndex(null)
            }}
          >
            Theo tuần
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'day'}
            className={`tab-btn ${granularity === 'day' ? 'active' : ''}`}
            onClick={() => {
              setGranularity('day')
              setActivePeriodIndex(null)
            }}
          >
            Theo ngày
          </button>
        </div>

        <div className="trend-toggles" role="group" aria-label="Bật tắt các đường xu hướng">
          <button
            type="button"
            className={`toggle-chip chip-wn ${showWn ? 'active' : 'inactive'}`}
            onClick={() => setShowWn(!showWn)}
            aria-pressed={showWn}
          >
            <span className="chip-indicator wn-color" />
            <span>XH trễ của WN</span>
          </button>

          <button
            type="button"
            className={`toggle-chip chip-dl ${showDl ? 'active' : 'inactive'}`}
            onClick={() => setShowDl(!showDl)}
            aria-pressed={showDl}
          >
            <span className="chip-indicator dl-color" />
            <span>XH trễ của DL</span>
          </button>

          <button
            type="button"
            className={`toggle-chip chip-aa ${showAa ? 'active' : 'inactive'}`}
            onClick={() => setShowAa(!showAa)}
            aria-pressed={showAa}
          >
            <span className="chip-indicator aa-color" />
            <span>XH trễ của AA</span>
          </button>

          <button
            type="button"
            className={`toggle-chip chip-forecast ${showForecast ? 'active' : 'inactive'}`}
            onClick={() => setShowForecast(!showForecast)}
            aria-pressed={showForecast}
          >
            <span className="chip-indicator forecast-color" />
            <span>Dự báo xu hướng trễ WN (+1T)</span>
          </button>
        </div>
      </div>

      <div className="chart-section-title">
        <span className="section-title-tag">Biểu đồ đường</span>
        <strong>Xu hướng tỷ lệ trễ chuyến (%)</strong>
        <small className="chart-sub-note">Đối chiếu đa hãng (WN, DL, AA) và ước tính dự báo tương lai</small>
      </div>

      <div className="unified-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${chartWidth} ${lineChartHeight}`}
          className="unified-chart-svg"
          role="img"
          aria-label="Biểu đồ đường tỷ lệ trễ chuyến"
        >
          {lineGeometry.futureDividerX !== null && (
            <g className="future-forecast-zone">
              <rect
                x={lineGeometry.futureDividerX}
                y={chartPadding.top}
                width={chartWidth - chartPadding.right - lineGeometry.futureDividerX}
                height={lineGeometry.innerHeight}
                fill="rgba(217, 119, 6, 0.05)"
                rx="3"
              />
              <line
                x1={lineGeometry.futureDividerX}
                x2={lineGeometry.futureDividerX}
                y1={chartPadding.top}
                y2={lineChartHeight - chartPadding.bottom}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={(lineGeometry.futureDividerX + chartWidth - chartPadding.right) / 2}
                y={chartPadding.top - 8}
                textAnchor="middle"
                className="future-zone-label"
              >
                Dự báo tương lai (+1T)
              </text>
            </g>
          )}

          {lineGridValues.map((val) => {
            const y = lineGeometry.y(val)
            return (
              <g key={`lgrid-${val}`} className="chart-grid-row">
                <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">
                  {val.toFixed(0)}%
                </text>
              </g>
            )
          })}

          <g
            className={`baseline-interactive-layer ${hoveredBaseline ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredBaseline(true)}
            onMouseLeave={() => setHoveredBaseline(false)}
            tabIndex={0}
            role="button"
            aria-label={`Đường tham chiếu mạng lưới: ${baselineRate.toFixed(1).replace('.', ',')}%`}
          >
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={lineBaselineY}
              y2={lineBaselineY}
              stroke={hoveredBaseline ? '#0284c7' : '#64748b'}
              strokeWidth={hoveredBaseline ? 2.5 : 1.75}
              strokeDasharray="7 5"
              className="baseline-visual-line"
            />
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={lineBaselineY}
              y2={lineBaselineY}
              stroke="transparent"
              strokeWidth="18"
              style={{ cursor: 'pointer' }}
            />
            {hoveredBaseline && (
              <g className="baseline-tooltip">
                <rect
                  x={chartWidth / 2 - 135}
                  y={Math.max(lineBaselineY - 34, 4)}
                  width="270"
                  height="26"
                  rx="6"
                  fill="#0f172a"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
                />
                <text
                  x={chartWidth / 2}
                  y={Math.max(lineBaselineY - 17, 21)}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="700"
                >
                  Baseline mạng lưới: {baselineRate.toFixed(1).replace('.', ',')}% (Tỷ lệ chuẩn)
                </text>
              </g>
            )}
          </g>

          {activePeriodIndex !== null && (
            <line
              x1={lineGeometry.x(activePeriodIndex)}
              x2={lineGeometry.x(activePeriodIndex)}
              y1={chartPadding.top}
              y2={lineChartHeight - chartPadding.bottom}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {showDl && dlPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={dlPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              opacity="0.85"
            />
          )}

          {showAa && aaPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#9333ea"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={aaPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              opacity="0.85"
            />
          )}

          {showWn && wnPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#e11d48"
              strokeWidth="3.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={wnPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            />
          )}

          {showForecast && forecastPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={forecastPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            />
          )}

          {showDl &&
            dlPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`dl-${pt.period}`}
                cx={x}
                cy={y}
                r="3.5"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2"
                tabIndex={0}
                role="button"
                aria-label={`DL ${pt.label}: ${pt.dl?.toFixed(1).replace('.', ',')}%`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => {
                  onToast?.(`DL tại ${pt.label}: ${pt.dl?.toFixed(1).replace('.', ',')}%`)
                  onSelectPeriod?.(pt.period)
                }}
              />
            ))}

          {showAa &&
            aaPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`aa-${pt.period}`}
                cx={x}
                cy={y}
                r="3.5"
                fill="#ffffff"
                stroke="#9333ea"
                strokeWidth="2"
                tabIndex={0}
                role="button"
                aria-label={`AA ${pt.label}: ${pt.aa?.toFixed(1).replace('.', ',')}%`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => {
                  onToast?.(`AA tại ${pt.label}: ${pt.aa?.toFixed(1).replace('.', ',')}%`)
                  onSelectPeriod?.(pt.period)
                }}
              />
            ))}

          {showWn &&
            wnPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`wn-${pt.period}`}
                cx={x}
                cy={y}
                r={activePeriodIndex === idx ? 6 : 4}
                fill="#ffffff"
                stroke="#e11d48"
                strokeWidth="3"
                tabIndex={0}
                role="button"
                aria-label={`WN ${pt.label}: ${pt.wn?.toFixed(1).replace('.', ',')}%, trễ ${pt.delayedCount ?? 0} chuyến, TB ${pt.averageDelay ?? 0} phút`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => {
                  onToast?.(`WN tại ${pt.label}: ${pt.wn?.toFixed(1).replace('.', ',')}% · ${pt.delayedCount ?? 0} chuyến trễ`)
                  onSelectPeriod?.(pt.period)
                }}
              />
            ))}

          {showForecast &&
            forecastPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`fc-${pt.period}`}
                cx={x}
                cy={y}
                r={pt.isFuture ? 5.5 : 4}
                fill={pt.isFuture ? '#d97706' : '#ffffff'}
                stroke="#d97706"
                strokeWidth="2.5"
                tabIndex={0}
                role="button"
                aria-label={`Dự báo WN ${pt.label}: ${pt.wnForecast?.toFixed(1).replace('.', ',')}%`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => {
                  onToast?.(`Dự báo WN tại ${pt.label}: ${pt.wnForecast?.toFixed(1).replace('.', ',')}%`)
                  onSelectPeriod?.(pt.period)
                }}
              />
            ))}
        </svg>
      </div>

      <div className="chart-section-title" style={{ marginTop: '4px' }}>
        <span className="section-title-tag bar-tag">Biểu đồ cột</span>
        <strong>Độ trễ đến trung bình mỗi chuyến (phút)</strong>
        <small className="chart-sub-note">Thời gian trễ bình quân tính bằng phút trên toàn bộ chuyến bay đủ điều kiện theo từng kỳ</small>
      </div>

      <div className="unified-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${chartWidth} ${barChartHeight}`}
          className="unified-chart-svg"
          role="img"
          aria-label="Biểu đồ cột độ trễ đến trung bình mỗi chuyến"
        >
          {lineGeometry.futureDividerX !== null && (
            <g className="future-forecast-zone">
              <rect
                x={lineGeometry.futureDividerX}
                y={chartPadding.top}
                width={chartWidth - chartPadding.right - lineGeometry.futureDividerX}
                height={barGeometry.innerHeight}
                fill="rgba(217, 119, 6, 0.05)"
                rx="3"
              />
              <line
                x1={lineGeometry.futureDividerX}
                x2={lineGeometry.futureDividerX}
                y1={chartPadding.top}
                y2={barChartHeight - chartPadding.bottom}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </g>
          )}

          {barGridValues.map((val) => {
            const y = barGeometry.y(val)
            return (
              <g key={`bgrid-${val}`} className="chart-grid-row">
                <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">
                  {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}p
                </text>
              </g>
            )
          })}

          <line
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={barZeroY}
            y2={barZeroY}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          <g
            className={`baseline-interactive-layer ${hoveredBarBaseline ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredBarBaseline(true)}
            onMouseLeave={() => setHoveredBarBaseline(false)}
            tabIndex={0}
            role="button"
            aria-label={`Độ trễ trung bình mạng lưới: ${baselineAvgDelay.toFixed(1).replace('.', ',')} phút`}
          >
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={barBaselineY}
              y2={barBaselineY}
              stroke={hoveredBarBaseline ? '#0284c7' : '#64748b'}
              strokeWidth={hoveredBarBaseline ? 2.5 : 1.75}
              strokeDasharray="6 4"
            />
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={barBaselineY}
              y2={barBaselineY}
              stroke="transparent"
              strokeWidth="16"
              style={{ cursor: 'pointer' }}
            />
            {hoveredBarBaseline && (
              <g className="baseline-tooltip">
                <rect
                  x={chartWidth / 2 - 145}
                  y={Math.max(barBaselineY - 34, 4)}
                  width="290"
                  height="26"
                  rx="6"
                  fill="#0f172a"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
                />
                <text
                  x={chartWidth / 2}
                  y={Math.max(barBaselineY - 17, 21)}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="700"
                >
                  Baseline mạng lưới: +{baselineAvgDelay.toFixed(1).replace('.', ',')} phút/chuyến
                </text>
              </g>
            )}
          </g>

          {activePeriodIndex !== null && (
            <line
              x1={lineGeometry.x(activePeriodIndex)}
              x2={lineGeometry.x(activePeriodIndex)}
              y1={chartPadding.top}
              y2={barChartHeight - chartPadding.bottom}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {currentSeries.map((pt, idx) => {
            const x = lineGeometry.x(idx)
            const avg = pt.averageDelay ?? 0
            const yVal = barGeometry.y(avg)
            const barTop = Math.min(yVal, barZeroY)
            const barHeight = Math.max(3, Math.abs(yVal - barZeroY))
            const barWidth = Math.max(12, Math.min(30, (lineGeometry.innerWidth / currentSeries.length) * 0.52))

            const isWarning = avg >= 15
            const isNormal = avg >= 0 && avg < 15
            const isEarly = avg < 0

            const barFill = pt.isFuture
              ? 'rgba(217, 119, 6, 0.45)'
              : isWarning
                ? '#e11d48'
                : isNormal
                  ? '#f59e0b'
                  : '#10b981'

            const isFocused = activePeriodIndex === idx

            return (
              <g
                key={`bar-${pt.period}`}
                className={`avg-delay-bar-group ${isFocused ? 'active' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={`${pt.label}: Độ trễ đến trung bình ${avg.toFixed(1).replace('.', ',')} phút, tỷ lệ trễ ${pt.wn ?? 0}%, ${pt.delayedCount ?? 0} chuyến trễ`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => {
                  onToast?.(`${pt.label}: TB trễ ${avg.toFixed(1).replace('.', ',')} phút · ${pt.delayedCount ?? 0} chuyến trễ`)
                  onSelectPeriod?.(pt.period)
                }}
              >
                <rect
                  x={x - barWidth / 2}
                  y={barTop}
                  width={barWidth}
                  height={barHeight}
                  fill={barFill}
                  rx="3"
                  stroke={pt.isFuture ? '#d97706' : isFocused ? '#0f172a' : 'none'}
                  strokeWidth={pt.isFuture ? 1.5 : isFocused ? 2 : 0}
                  strokeDasharray={pt.isFuture ? '4 2' : 'none'}
                />

                <text
                  x={x}
                  y={avg >= 0 ? barTop - 5 : barTop + barHeight + 12}
                  textAnchor="middle"
                  className="bar-value-label"
                  fill={isWarning ? '#be123c' : isEarly ? '#047857' : '#475569'}
                  fontSize="10"
                  fontWeight="700"
                >
                  {avg > 0 ? `+${avg.toFixed(1).replace('.', ',')}` : avg.toFixed(1).replace('.', ',')}
                </text>
              </g>
            )
          })}

          {currentSeries.map((pt, idx) => {
            const x = lineGeometry.x(idx)
            const shouldShowLabel =
              granularity === 'month'
                ? true
                : granularity === 'week'
                  ? idx % 2 === 0 || idx === currentSeries.length - 1
                  : idx % 3 === 0 || idx === currentSeries.length - 1

            if (!shouldShowLabel) return null

            const displayLabel =
              granularity === 'month'
                ? pt.period === '2019-01'
                  ? 'T01/19 (DB)'
                  : `T${pt.period.slice(5)}`
                : granularity === 'week'
                  ? pt.period.includes('2019')
                    ? `${pt.period.slice(5)} (DB)`
                    : pt.period.slice(5)
                  : pt.label

            return (
              <text
                key={`baxis-${pt.period}`}
                x={x}
                y={barChartHeight - 8}
                textAnchor="middle"
                className={`chart-axis-label ${pt.isFuture ? 'axis-future' : ''}`}
              >
                {displayLabel}
              </text>
            )
          })}
        </svg>
      </div>

      {activePoint && (
        <div className="reconciled-bundle-card">
          <div className="bundle-header">
            <span className="bundle-period-tag">{activePoint.label}</span>
            {activePoint.isFuture && <span className="bundle-future-badge">Kỳ dự báo tương lai (+1T)</span>}
          </div>

          <div className="bundle-metrics-grid">
            <div className="bundle-metric-cell">
              <span className="bundle-cell-label">Tỷ lệ chuyến đến trễ</span>
              <strong className="bundle-cell-value">
                {activePoint.wn !== null ? `${activePoint.wn.toFixed(1).replace('.', ',')}%` : `${activePoint.wnForecast?.toFixed(1).replace('.', ',')}% (DB)`}
              </strong>
              <small className="bundle-cell-sub">
                Baseline: {baselineRate.toFixed(1).replace('.', ',')}%
                {activePoint.wn !== null && (
                  <span className={activePoint.wn >= baselineRate ? 'diff-higher' : 'diff-lower'}>
                    {' '}({activePoint.wn >= baselineRate ? '+' : ''}{(activePoint.wn - baselineRate).toFixed(1).replace('.', ',')}%)
                  </span>
                )}
              </small>
            </div>

            <div className="bundle-metric-cell">
              <span className="bundle-cell-label">Số chuyến đến trễ</span>
              <strong className="bundle-cell-value">
                {activePoint.delayedCount ? activePoint.delayedCount.toLocaleString('vi-VN') : '0'} chuyến
              </strong>
              <small className="bundle-cell-sub">
                Đủ điều kiện: {activePoint.eligibleCount?.toLocaleString('vi-VN') ?? activePoint.wnN?.toLocaleString('vi-VN')} chuyến
              </small>
            </div>

            <div className="bundle-metric-cell">
              <span className="bundle-cell-label">Độ trễ đến trung bình mỗi chuyến</span>
              <strong className={`bundle-cell-value ${(activePoint.averageDelay ?? 0) >= 15 ? 'warning-delay' : ''}`}>
                {(activePoint.averageDelay ?? 0) > 0 ? '+' : ''}
                {activePoint.averageDelay?.toFixed(1).replace('.', ',')} phút
              </strong>
              <small className="bundle-cell-sub">
                Mức chuẩn mạng lưới: +{baselineAvgDelay.toFixed(1).replace('.', ',')} phút
              </small>
            </div>
          </div>
        </div>
      )}

      <div className="trend-footer-legend">
        <div className="legend-items-list">
          <span className="legend-item">
            <span className="legend-dot wn-dot" />
            Tỷ lệ trễ WN (%)
          </span>
          <span className="legend-item">
            <span className="legend-dot dl-dot" />
            Tỷ lệ trễ DL (%)
          </span>
          <span className="legend-item">
            <span className="legend-dot aa-dot" />
            Tỷ lệ trễ AA (%)
          </span>
          <span className="legend-item">
            <span className="legend-line forecast-line" />
            Dự báo WN (+1 tháng)
          </span>
          <span className="legend-item">
            <span className="legend-dot red-bar-dot" />
            Độ trễ TB ≥ 15 phút (Cột)
          </span>
          <span className="legend-item">
            <span className="legend-dot amber-bar-dot" />
            Độ trễ TB 0–15 phút (Cột)
          </span>
          <span className="legend-item">
            <span className="legend-dot green-bar-dot" />
            Đến sớm &lt; 0 phút (Cột)
          </span>
        </div>
      </div>
    </div>
  )
}
