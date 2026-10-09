import { useState } from 'react'
import type { SeasonSummary } from '../../domain/types'
import { formatMonth, formatSeason } from '../../domain/formatters'

export interface SeasonalBarChartProps {
  seasons: SeasonSummary[]
  selectedSeason?: string
  selectedMonth?: string
  onSelectSeason?: (season: string) => void
  onSelectMonth?: (month: string) => void
  onClearSelection?: () => void
  onSeasonContextMenu?: (event: React.MouseEvent<SVGGElement>, season: SeasonSummary) => void
  onMonthContextMenu?: (event: React.MouseEvent<SVGGElement>, season: SeasonSummary, month: SeasonSummary['months'][number]) => void
}

const width = 800
const height = 200
const padding = { top: 28, right: 16, bottom: 36, left: 44 }

const seasonColors: Record<string, { bg: string; border: string; accent: string; bar: string }> = {
  Winter: {
    bg: 'rgba(224, 242, 254, 0.4)',
    border: '#bae6fd',
    accent: '#0284c7',
    bar: '#38bdf8',
  },
  Spring: {
    bg: 'rgba(220, 252, 231, 0.4)',
    border: '#bbf7d0',
    accent: '#16a34a',
    bar: '#4ade80',
  },
  Summer: {
    bg: 'rgba(254, 243, 199, 0.45)',
    border: '#fde68a',
    accent: '#d97706',
    bar: '#fbbf24',
  },
  Autumn: {
    bg: 'rgba(255, 237, 213, 0.45)',
    border: '#fed7aa',
    accent: '#ea580c',
    bar: '#fb923c',
  },
}

export function SeasonalBarChart({
  seasons,
  selectedSeason,
  selectedMonth,
  onSelectSeason,
  onSelectMonth,
  onClearSelection,
  onSeasonContextMenu,
  onMonthContextMenu,
}: SeasonalBarChartProps) {
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number
    y: number
    title: string
    rate: number
    gap: number
    delayedCount?: number
    n: number
    averageDelay?: number
  } | null>(null)

  const allMonths = seasons.flatMap((s) => s.months)
  const maxRate = Math.max(35, ...allMonths.map((m) => m.rate), ...seasons.map((s) => s.rate))
  const chartCeil = Math.ceil((maxRate + 5) / 5) * 5

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const seasonBlockWidth = innerWidth / Math.max(seasons.length, 1)
  const barWidth = 24
  const barGap = 8

  const gridTicks = [0, 10, 20, 30, chartCeil].filter((v, idx, arr) => arr.indexOf(v) === idx && v <= chartCeil)

  const calcY = (val: number) => padding.top + (chartCeil - val) * innerHeight / chartCeil
  const calcH = (val: number) => Math.max(2, (val / chartCeil) * innerHeight)

  return (
    <div className="seasonal-bar-chart-container" style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', padding: '0 4px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
          <span>Gợi ý: Nhấp cột để lọc theo tháng; nhấp tiêu đề mùa để lọc cả mùa</span>
        </div>
        {(selectedSeason || selectedMonth) && (
          <button
            type="button"
            className="btn btn-ghost btn--xs"
            onClick={onClearSelection}
            title="Xóa lựa chọn mùa hoặc tháng để hiển thị toàn bộ"
          >
            Bỏ chọn thời đoạn ({selectedMonth ? formatMonth(selectedMonth) : ''}{selectedSeason ? (selectedMonth ? ' · ' : '') + formatSeason(selectedSeason) : ''})
          </button>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="Biểu đồ tỷ lệ trễ 12 tháng phân tích gộp qua các năm chia theo 4 mùa"
      >
        {gridTicks.map((tick) => {
          const yPos = calcY(tick)
          return (
            <g key={`grid-${tick}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={yPos}
                y2={yPos}
                stroke="#e2e8f0"
                strokeDasharray={tick === 0 ? 'none' : '3 3'}
              />
              <text
                x={padding.left - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className="chart-axis-label"
                style={{ fontSize: '9.5px', fill: 'var(--muted)' }}
              >
                {tick}%
              </text>
            </g>
          )
        })}

        {seasons.map((season, sIdx) => {
          const sX = padding.left + sIdx * seasonBlockWidth
          const isSeasonActive = selectedSeason === season.season
          const isSeasonDimmed = Boolean(selectedSeason && !isSeasonActive)
          const colors = seasonColors[season.season] ?? {
            bg: '#f8fafc',
            border: '#e2e8f0',
            accent: '#475569',
            bar: '#94a3b8',
          }

          const sCenter = sX + seasonBlockWidth / 2

          return (
            <g
              key={season.season}
              data-analysis-unit={`season-${season.season}`}
              className={`season-band-group${isSeasonActive ? ' active' : ''}`}
              opacity={isSeasonDimmed ? 0.4 : 1}
              onContextMenu={(event) => onSeasonContextMenu?.(event, season)}
            >
              <rect
                x={sX + 3}
                y={padding.top - 18}
                width={seasonBlockWidth - 6}
                height={innerHeight + 34}
                rx={5}
                fill={colors.bg}
                stroke={isSeasonActive ? colors.accent : colors.border}
                strokeWidth={isSeasonActive ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => onSelectSeason?.(season.season)}
                onMouseEnter={() => {
                  setActiveTooltip({
                    x: sCenter,
                    y: padding.top - 4,
                    title: `${formatSeason(season.season)} (Tháng ${season.months.map((m) => formatMonth(m.month).replace('Tháng ', '')).join(', ')})`,
                    rate: season.rate,
                    gap: season.gap ?? 0,
                    delayedCount: season.delayedCount,
                    averageDelay: season.averageDelay,
                    n: season.n ?? 0,
                  })
                }}
                onMouseLeave={() => setActiveTooltip(null)}
                aria-label={`${formatSeason(season.season)}: nhấp để lọc`}
              />

              <g
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectSeason?.(season.season)}
                onMouseEnter={() => {
                  setActiveTooltip({
                    x: sCenter,
                    y: padding.top - 4,
                    title: `${formatSeason(season.season)} (Tháng ${season.months.map((m) => formatMonth(m.month).replace('Tháng ', '')).join(', ')})`,
                    rate: season.rate,
                    gap: season.gap ?? 0,
                    delayedCount: season.delayedCount,
                    averageDelay: season.averageDelay,
                    n: season.n ?? 0,
                  })
                }}
                onMouseLeave={() => setActiveTooltip(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectSeason?.(season.season)
                  }
                }}
                aria-label={`Chọn ${formatSeason(season.season)}, tỷ lệ trung bình ${season.rate.toFixed(1)}%`}
              >
                <rect
                  x={sCenter - 48}
                  y={padding.top - 17}
                  width={96}
                  height={15}
                  rx={7.5}
                  fill={isSeasonActive ? colors.accent : '#ffffff'}
                  stroke={colors.accent}
                  strokeWidth={1}
                />
                <text
                  x={sCenter}
                  y={padding.top - 6}
                  textAnchor="middle"
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    fill: isSeasonActive ? '#ffffff' : colors.accent,
                  }}
                >
                  {formatSeason(season.season)} · {season.rate.toFixed(1)}%
                </text>
              </g>

              {season.months.map((m, mIdx) => {
                const totalMonthsWidth = 3 * barWidth + 2 * barGap
                const startX = sCenter - totalMonthsWidth / 2
                const bX = startX + mIdx * (barWidth + barGap)
                const bH = calcH(m.rate)
                const bY = calcY(m.rate)
                const isMonthSelected = selectedMonth === m.month
                const isMonthDimmed = Boolean(selectedMonth && !isMonthSelected)

                return (
                  <g
                    key={m.month}
                    data-analysis-unit={`month-${m.month}`}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    opacity={isMonthDimmed ? 0.35 : 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectMonth?.(m.month)
                    }}
                    onContextMenu={(event) => onMonthContextMenu?.(event, season, m)}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      setActiveTooltip({
                        x: bX + barWidth / 2,
                        y: bY,
                        title: `${formatMonth(m.month)} · ${formatSeason(season.season)}`,
                        rate: m.rate,
                        gap: m.gap,
                        delayedCount: m.delayedCount,
                        averageDelay: m.averageDelay,
                        n: m.n,
                      })
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onFocus={() => {
                      setActiveTooltip({
                        x: bX + barWidth / 2,
                        y: bY,
                        title: `${formatMonth(m.month)} · ${formatSeason(season.season)}`,
                        rate: m.rate,
                        gap: m.gap,
                        delayedCount: m.delayedCount,
                        averageDelay: m.averageDelay,
                        n: m.n,
                      })
                    }}
                    onBlur={() => setActiveTooltip(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectMonth?.(m.month)
                      }
                    }}
                    aria-label={`${formatMonth(m.month)}: tỷ lệ trễ ${m.rate.toFixed(1)}%, cỡ mẫu n=${m.n}`}
                  >
                    <rect
                      x={bX}
                      y={bY}
                      width={barWidth}
                      height={bH}
                      rx={3}
                      fill={isMonthSelected ? '#1e293b' : colors.bar}
                      stroke={isMonthSelected ? '#0f172a' : colors.accent}
                      strokeWidth={isMonthSelected ? 2 : 1}
                      style={{ transition: 'all 0.15s ease' }}
                    />

                    <text
                      x={bX + barWidth / 2}
                      y={bY - 4}
                      textAnchor="middle"
                      style={{
                        fontSize: '9.5px',
                        fontWeight: isMonthSelected ? 800 : 600,
                        fill: isMonthSelected ? '#0f172a' : 'var(--ink)',
                      }}
                    >
                      {m.rate.toFixed(1)}%
                    </text>

                    <text
                      x={bX + barWidth / 2}
                      y={height - padding.bottom + 13}
                      textAnchor="middle"
                      style={{
                        fontSize: '10px',
                        fontWeight: isMonthSelected ? 700 : 500,
                        fill: isMonthSelected ? '#0f172a' : 'var(--ink)',
                      }}
                    >
                      {formatMonth(m.month).replace('Tháng ', 'T')}
                    </text>

                    <text
                      x={bX + barWidth / 2}
                      y={height - padding.bottom + 23}
                      textAnchor="middle"
                      style={{
                        fontSize: '8.5px',
                        fill: 'var(--muted)',
                      }}
                    >
                      {m.n > 999 ? `${Math.round(m.n / 1000)}k` : m.n}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>

      {activeTooltip && (
        <div
          className="seasonal-chart-tooltip"
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max((activeTooltip.x / width) * 100, 14), 86)}%`,
            top: `${Math.max(activeTooltip.y - 6, 4)}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(4px)',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.45',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            whiteSpace: 'nowrap',
            zIndex: 25,
          }}
        >
          <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '3px', marginBottom: '3px', color: '#ffffff' }}>
            {activeTooltip.title}
          </div>
          <div>Tỷ lệ trễ: {activeTooltip.rate.toFixed(1)}% ({activeTooltip.gap >= 0 ? '+' : ''}{activeTooltip.gap.toFixed(1)}%)</div>
          <div>Số chuyến trễ: {activeTooltip.delayedCount !== undefined ? `${activeTooltip.delayedCount.toLocaleString('vi-VN')} / ` : ''}{activeTooltip.n.toLocaleString('vi-VN')} chuyến</div>
          <div>Độ trễ trung bình: {activeTooltip.averageDelay !== undefined ? `${activeTooltip.averageDelay.toFixed(1)} phút` : '--'}</div>
          <div>Cỡ mẫu n: {activeTooltip.n.toLocaleString('vi-VN')} chuyến</div>
        </div>
      )}
    </div>
  )
}
