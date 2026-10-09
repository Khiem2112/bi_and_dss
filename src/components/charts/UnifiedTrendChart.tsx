import { useMemo, useState } from 'react'
import type { GranularTrendsData, GranularTrendSeries } from '../../domain/types'

export type Granularity = 'month' | 'week' | 'day'

interface UnifiedTrendChartProps {
  data: GranularTrendsData
  onSelectPeriod?: (period: string) => void
  onToast?: (message: string) => void
  onPointContextMenu?: (event: React.MouseEvent<SVGRectElement>, point: GranularTrendSeries, granularity: Granularity) => void
}

const chartWidth = 920
const chartHeight = 350
const chartPadding = { top: 38, right: 64, bottom: 42, left: 54 }

export function UnifiedTrendChart({ data, onSelectPeriod, onToast, onPointContextMenu }: UnifiedTrendChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [showWn, setShowWn] = useState(true)
  const [showDl, setShowDl] = useState(true)
  const [showAa, setShowAa] = useState(true)
  const [showForecast, setShowForecast] = useState(true)
  const [showBars, setShowBars] = useState(true)
  const [hoveredBaseline, setHoveredBaseline] = useState(false)
  const [activePeriodIndex, setActivePeriodIndex] = useState<number | null>(null)

  const currentSeries: GranularTrendSeries[] = useMemo(() => {
    return data[granularity] ?? []
  }, [data, granularity])

  const baselineRate = data.baseline
  const baselineAvgDelay = data.baselineAvgDelay ?? 12.3

  const geometry = useMemo(() => {
    const allRates: number[] = [baselineRate]
    const allDelays: number[] = [0, baselineAvgDelay]

    currentSeries.forEach((pt) => {
      if (showWn && pt.wn !== null) allRates.push(pt.wn)
      if (showDl && pt.dl !== null) allRates.push(pt.dl)
      if (showAa && pt.aa !== null) allRates.push(pt.aa)
      if (showForecast && pt.wnForecast !== null) allRates.push(pt.wnForecast)
      if (pt.averageDelay !== undefined) allDelays.push(pt.averageDelay)
    })

    const minRate = 0
    const maxRate = Math.ceil(Math.max(...allRates, 30) / 5) * 5 + 5

    const minDelay = Math.min(0, Math.floor(Math.min(...allDelays, 0) / 5) * 5)
    const maxDelay = Math.ceil(Math.max(...allDelays, 20) / 5) * 5 + 5

    const innerWidth = chartWidth - chartPadding.left - chartPadding.right
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom

    const colWidth = innerWidth / Math.max(currentSeries.length, 1)

    const x = (index: number) => chartPadding.left + (index + 0.5) * colWidth
    const yRate = (val: number) =>
      chartPadding.top + ((maxRate - val) * innerHeight) / Math.max(maxRate - minRate, 1)
    const yDelay = (val: number) =>
      chartPadding.top + ((maxDelay - val) * innerHeight) / Math.max(maxDelay - minDelay, 1)

    const yDelayZero = yDelay(0)
    const yRateBaseline = yRate(baselineRate)
    const yDelayBaseline = yDelay(baselineAvgDelay)

    const futureStartIndex = currentSeries.findIndex((pt) => pt.isFuture)
    const futureDividerX =
      futureStartIndex > 0
        ? chartPadding.left + futureStartIndex * colWidth
        : null

    const barWidth = Math.max(8, Math.min(26, colWidth * 0.48))

    return {
      minRate,
      maxRate,
      minDelay,
      maxDelay,
      innerWidth,
      innerHeight,
      colWidth,
      barWidth,
      x,
      yRate,
      yDelay,
      yDelayZero,
      yRateBaseline,
      yDelayBaseline,
      futureStartIndex,
      futureDividerX,
    }
  }, [currentSeries, showWn, showDl, showAa, showForecast, baselineRate, baselineAvgDelay])

  const rateGridValues = useMemo(() => {
    const steps = 4
    const stepSize = (geometry.maxRate - geometry.minRate) / steps
    return Array.from({ length: steps + 1 }, (_, i) => geometry.minRate + i * stepSize)
  }, [geometry.minRate, geometry.maxRate])

  const delayGridValues = useMemo(() => {
    const steps = 4
    const stepSize = (geometry.maxDelay - geometry.minDelay) / steps
    return Array.from({ length: steps + 1 }, (_, i) => geometry.minDelay + i * stepSize)
  }, [geometry.minDelay, geometry.maxDelay])

  const wnPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.wn !== null ? { pt, idx, x: geometry.x(idx), y: geometry.yRate(pt.wn) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, geometry])

  const dlPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.dl !== null ? { pt, idx, x: geometry.x(idx), y: geometry.yRate(pt.dl) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, geometry])

  const aaPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) => (pt.aa !== null ? { pt, idx, x: geometry.x(idx), y: geometry.yRate(pt.aa) } : null))
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, geometry])

  const forecastPoints = useMemo(() => {
    return currentSeries
      .map((pt, idx) =>
        pt.wnForecast !== null
          ? { pt, idx, x: geometry.x(idx), y: geometry.yRate(pt.wnForecast) }
          : null
      )
      .filter((p): p is { pt: GranularTrendSeries; idx: number; x: number; y: number } => p !== null)
  }, [currentSeries, geometry])

  const activePoint = activePeriodIndex !== null ? currentSeries[activePeriodIndex] : null

  const handlePeriodClick = (pt: GranularTrendSeries) => {
    const delayVal = pt.averageDelay !== undefined ? `${pt.averageDelay.toFixed(1).replace('.', ',')} phút` : 'N/A'
    const wnVal = pt.wn !== null ? `${pt.wn.toFixed(1).replace('.', ',')}%` : 'N/A'
    onToast?.(`${pt.label}: WN ${wnVal} · TB trễ ${delayVal}`)
    onSelectPeriod?.(pt.period)
  }

  const activeX = activePeriodIndex !== null ? geometry.x(activePeriodIndex) : 0
  const activePctX = (activeX / chartWidth) * 100

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

        <div className="trend-toggles" role="group" aria-label="Bật tắt các đường xu hướng và cột dữ liệu">
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
            <span>Dự báo xu hướng trễ WN</span>
          </button>

          <button
            type="button"
            className={`toggle-chip chip-bar ${showBars ? 'active' : 'inactive'}`}
            onClick={() => setShowBars(!showBars)}
            aria-pressed={showBars}
          >
            <span className="chip-indicator bar-color" />
            <span>Độ trễ TB (Cột)</span>
          </button>
        </div>
      </div>

      <div className="combo-chart-header">
        <div className="combo-chart-titles">
          <span className="section-title-tag">Đồ thị tích hợp kết hợp</span>
          <strong>Xu hướng tỷ lệ trễ (%) &amp; Độ trễ đến trung bình mỗi chuyến (phút)</strong>
          <small className="chart-sub-note">
            Trục trái: Tỷ lệ trễ theo hãng (%) · Trục phải: Thời gian trễ bình quân (phút) · Rà chuột lên điểm để xem toàn bộ thông số
          </small>
        </div>
      </div>

      <div className="combo-chart-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="combo-chart-svg"
          role="img"
          aria-label="Đồ thị tích hợp tỷ lệ trễ và độ trễ trung bình"
          onMouseLeave={() => setActivePeriodIndex(null)}
        >
          {geometry.futureDividerX !== null && (
            <g className="future-forecast-zone">
              <rect
                x={geometry.futureDividerX}
                y={chartPadding.top}
                width={chartWidth - chartPadding.right - geometry.futureDividerX}
                height={geometry.innerHeight}
                fill="rgba(217, 119, 6, 0.05)"
                rx="3"
              />
              <line
                x1={geometry.futureDividerX}
                x2={geometry.futureDividerX}
                y1={chartPadding.top}
                y2={chartHeight - chartPadding.bottom}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={(geometry.futureDividerX + chartWidth - chartPadding.right) / 2}
                y={chartPadding.top - 12}
                textAnchor="middle"
                className="future-zone-label"
              >
                Dự báo tương lai (+1T)
              </text>
            </g>
          )}

          {rateGridValues.map((val) => {
            const y = geometry.yRate(val)
            return (
              <g key={`lgrid-${val}`} className="chart-grid-row">
                <line
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label rate-axis-label">
                  {val.toFixed(0)}%
                </text>
              </g>
            )
          })}

          <text
            x={chartPadding.left - 8}
            y={chartPadding.top - 14}
            textAnchor="start"
            className="axis-title-label left-axis-title"
          >
            Tỷ lệ trễ (%)
          </text>

          {delayGridValues.map((val) => {
            const y = geometry.yDelay(val)
            return (
              <text
                key={`rlabel-${val}`}
                x={chartWidth - chartPadding.right + 10}
                y={y + 4}
                textAnchor="start"
                className="chart-axis-label delay-axis-label"
              >
                {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}p
              </text>
            )
          })}

          <text
            x={chartWidth - chartPadding.right + 8}
            y={chartPadding.top - 14}
            textAnchor="start"
            className="axis-title-label right-axis-title"
          >
            Độ trễ TB (phút)
          </text>

          <line
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={geometry.yDelayZero}
            y2={geometry.yDelayZero}
            stroke="#94a3b8"
            strokeWidth="1"
          />

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
              y1={geometry.yRateBaseline}
              y2={geometry.yRateBaseline}
              stroke={hoveredBaseline ? '#0284c7' : '#64748b'}
              strokeWidth={hoveredBaseline ? 2.5 : 1.5}
              strokeDasharray="7 5"
              className="baseline-visual-line"
            />
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={geometry.yRateBaseline}
              y2={geometry.yRateBaseline}
              stroke="transparent"
              strokeWidth="18"
              style={{ cursor: 'pointer' }}
            />
            {hoveredBaseline && (
              <g className="baseline-tooltip">
                <rect
                  x={chartWidth / 2 - 135}
                  y={Math.max(geometry.yRateBaseline - 32, 6)}
                  width="270"
                  height="24"
                  rx="4"
                  fill="#0f172a"
                />
                <text
                  x={chartWidth / 2}
                  y={Math.max(geometry.yRateBaseline - 16, 22)}
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
            <g className="active-column-indicator">
              <rect
                x={chartPadding.left + activePeriodIndex * geometry.colWidth}
                y={chartPadding.top}
                width={geometry.colWidth}
                height={geometry.innerHeight}
                fill="rgba(15, 23, 42, 0.05)"
                rx="3"
              />
              <line
                x1={geometry.x(activePeriodIndex)}
                x2={geometry.x(activePeriodIndex)}
                y1={chartPadding.top}
                y2={chartHeight - chartPadding.bottom}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </g>
          )}

          {showBars &&
            currentSeries.map((pt, idx) => {
              const xCenter = geometry.x(idx)
              const avg = pt.averageDelay ?? 0
              const yVal = geometry.yDelay(avg)
              const barTop = Math.min(yVal, geometry.yDelayZero)
              const barHeight = Math.max(2, Math.abs(yVal - geometry.yDelayZero))
              const isFocused = activePeriodIndex === idx

              const isWarning = avg >= 15
              const isNormal = avg >= 5 && avg < 15
              const isEarly = avg < 0

              const barFill = pt.isFuture
                ? 'rgba(217, 119, 6, 0.35)'
                : isWarning
                  ? 'rgba(225, 29, 72, 0.45)'
                  : isNormal
                    ? 'rgba(245, 158, 11, 0.45)'
                    : isEarly
                      ? 'rgba(16, 185, 129, 0.45)'
                      : 'rgba(59, 130, 246, 0.35)'

              const barStroke = pt.isFuture
                ? '#d97706'
                : isFocused
                  ? '#0f172a'
                  : isWarning
                    ? '#e11d48'
                    : isNormal
                      ? '#f59e0b'
                      : isEarly
                        ? '#10b981'
                        : '#3b82f6'

              return (
                <g key={`bar-${pt.period}`} className={`combo-bar-group ${isFocused ? 'active' : ''}`}>
                  <rect
                    x={xCenter - geometry.barWidth / 2}
                    y={barTop}
                    width={geometry.barWidth}
                    height={barHeight}
                    fill={barFill}
                    stroke={barStroke}
                    strokeWidth={isFocused ? 2 : 1}
                    strokeDasharray={pt.isFuture ? '4 2' : 'none'}
                    rx="3"
                  />
                  {granularity === 'month' && (
                    <text
                      x={xCenter}
                      y={avg >= 0 ? barTop - 5 : barTop + barHeight + 11}
                      textAnchor="middle"
                      className="combo-bar-label"
                      fill={isWarning ? '#be123c' : isEarly ? '#047857' : '#64748b'}
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {avg > 0 ? `+${avg.toFixed(1).replace('.', ',')}` : avg.toFixed(1).replace('.', ',')}
                    </text>
                  )}
                </g>
              )
            })}

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
                r={activePeriodIndex === idx ? 5 : 3.5}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth={activePeriodIndex === idx ? 2.5 : 2}
              />
            ))}

          {showAa &&
            aaPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`aa-${pt.period}`}
                cx={x}
                cy={y}
                r={activePeriodIndex === idx ? 5 : 3.5}
                fill="#ffffff"
                stroke="#9333ea"
                strokeWidth={activePeriodIndex === idx ? 2.5 : 2}
              />
            ))}

          {showWn &&
            wnPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`wn-${pt.period}`}
                cx={x}
                cy={y}
                r={activePeriodIndex === idx ? 6.5 : 4}
                fill="#ffffff"
                stroke="#e11d48"
                strokeWidth={activePeriodIndex === idx ? 3.5 : 2.5}
              />
            ))}

          {showForecast &&
            forecastPoints.map(({ pt, idx, x, y }) => (
              <circle
                key={`fc-${pt.period}`}
                cx={x}
                cy={y}
                r={activePeriodIndex === idx ? 6 : pt.isFuture ? 5 : 3.5}
                fill={pt.isFuture ? '#d97706' : '#ffffff'}
                stroke="#d97706"
                strokeWidth={2.5}
              />
            ))}

          <line
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={chartHeight - chartPadding.bottom}
            y2={chartHeight - chartPadding.bottom}
            stroke="#94a3b8"
            strokeWidth="1.25"
          />

          {currentSeries.map((pt, idx) => {
            const x = geometry.x(idx)
            const shouldShowLabel =
              granularity === 'month'
                ? true
                : granularity === 'week'
                  ? idx % 3 === 0 || idx === currentSeries.length - 1
                  : idx % 4 === 0 || idx === currentSeries.length - 1

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
                y={chartHeight - chartPadding.bottom + 18}
                textAnchor="middle"
                className={`chart-axis-label ${pt.isFuture ? 'axis-future' : ''}`}
              >
                {displayLabel}
              </text>
            )
          })}

          {currentSeries.map((pt, idx) => {
            const colX = chartPadding.left + idx * geometry.colWidth
            return (
              <rect
                key={`hit-${pt.period}`}
                data-analysis-unit={`trend-${pt.period}`}
                x={colX}
                y={chartPadding.top}
                width={geometry.colWidth}
                height={geometry.innerHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                role="button"
                aria-label={`${pt.label}: WN ${pt.wn ?? 'N/A'}%, DL ${pt.dl ?? 'N/A'}%, AA ${pt.aa ?? 'N/A'}%, TB trễ ${pt.averageDelay ?? 0} phút`}
                onMouseEnter={() => setActivePeriodIndex(idx)}
                onFocus={() => setActivePeriodIndex(idx)}
                onClick={() => handlePeriodClick(pt)}
                onContextMenu={(event) => onPointContextMenu?.(event, pt, granularity)}
              />
            )
          })}
        </svg>

        {activePoint && (
          <div
            className="combo-chart-floating-tooltip"
            style={{
              left: `${activePctX}%`,
              top: '20px',
              transform: `translate(${activePctX > 68 ? '-104%' : activePctX < 32 ? '6%' : '-50%'}, 0)`,
            }}
            role="tooltip"
          >
            <div className="tooltip-period-header">
              <span className="tooltip-period-name">{activePoint.label}</span>
              {activePoint.isFuture && (
                <span className="tooltip-future-tag">Dự báo tương lai (+1T)</span>
              )}
            </div>

            <div className="tooltip-content-rows">
              {showWn && (
                <div className="tooltip-item-row wn-row">
                  <span className="tooltip-row-label">
                    <span className="legend-indicator dot-wn" />
                    XH trễ của WN:
                  </span>
                  <span className="tooltip-row-val">
                    <strong>{activePoint.wn !== null ? `${activePoint.wn.toFixed(1).replace('.', ',')}%` : 'N/A'}</strong>
                    {activePoint.delayedCount !== undefined && activePoint.eligibleCount !== undefined && (
                      <small className="tooltip-sub-metric">
                        ({activePoint.delayedCount.toLocaleString('vi-VN')}/{activePoint.eligibleCount.toLocaleString('vi-VN')} chuyến)
                      </small>
                    )}
                  </span>
                </div>
              )}

              {showDl && (
                <div className="tooltip-item-row dl-row">
                  <span className="tooltip-row-label">
                    <span className="legend-indicator dot-dl" />
                    XH trễ của DL:
                  </span>
                  <span className="tooltip-row-val">
                    <strong>{activePoint.dl !== null ? `${activePoint.dl.toFixed(1).replace('.', ',')}%` : 'N/A'}</strong>
                  </span>
                </div>
              )}

              {showAa && (
                <div className="tooltip-item-row aa-row">
                  <span className="tooltip-row-label">
                    <span className="legend-indicator dot-aa" />
                    XH trễ của AA:
                  </span>
                  <span className="tooltip-row-val">
                    <strong>{activePoint.aa !== null ? `${activePoint.aa.toFixed(1).replace('.', ',')}%` : 'N/A'}</strong>
                  </span>
                </div>
              )}

              {showForecast && activePoint.wnForecast !== null && (
                <div className="tooltip-item-row forecast-row">
                  <span className="tooltip-row-label">
                    <span className="legend-indicator dot-forecast" />
                    Dự báo xu hướng trễ của WN:
                  </span>
                  <span className="tooltip-row-val">
                    <strong>{activePoint.wnForecast.toFixed(1).replace('.', ',')}%</strong>
                  </span>
                </div>
              )}

              <div className="tooltip-item-row delay-row">
                <span className="tooltip-row-label">
                  <span className="legend-indicator dot-delay" />
                  Số phút trễ trên từng chuyến của WN:
                </span>
                <span className="tooltip-row-val highlight-delay">
                  <strong>{activePoint.averageDelay !== undefined
                    ? `${activePoint.averageDelay > 0 ? '+' : ''}${activePoint.averageDelay.toFixed(1).replace('.', ',')} phút`
                    : '—'}</strong>
                </span>
              </div>

              {activePoint.isFuture && activePoint.delayedCount === undefined && (
                <div className="tooltip-item-row">
                  <span className="tooltip-row-label">Bằng chứng lịch sử:</span>
                  <span className="tooltip-row-val">Không áp dụng cho điểm dự báo</span>
                </div>
              )}

              <div className="tooltip-divider" />

              <div className="tooltip-item-row baseline-row">
                <span className="tooltip-row-label">Mức chuẩn mạng lưới:</span>
                <span className="tooltip-row-val">
                  <span>{baselineRate.toFixed(1).replace('.', ',')}% tỷ lệ · +{baselineAvgDelay.toFixed(1).replace('.', ',')}p TB</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="trend-footer-legend">
        <div className="legend-items-list">
          <span className="legend-item">
            <span className="legend-dot wn-dot" />
            XH trễ WN (%)
          </span>
          <span className="legend-item">
            <span className="legend-dot dl-dot" />
            XH trễ DL (%)
          </span>
          <span className="legend-item">
            <span className="legend-dot aa-dot" />
            XH trễ AA (%)
          </span>
          <span className="legend-item">
            <span className="legend-line forecast-line" />
            Dự báo WN (+1 tháng)
          </span>
          <span className="legend-item">
            <span className="legend-dot bar-legend-dot" />
            Độ trễ TB mỗi chuyến (Cột)
          </span>
          <span className="legend-item">
            <span className="legend-line baseline-line" />
            Baseline mạng lưới
          </span>
        </div>
      </div>
    </div>
  )
}
