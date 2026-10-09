import { useState } from 'react'
import type { TimeBlockDelaySummary } from '../../domain/types'

interface TimeBlockDelayChartProps {
  blocks: TimeBlockDelaySummary[]
  selectedBlock?: string
  onSelect: (block: TimeBlockDelaySummary) => void
  onBlockContextMenu?: (event: React.MouseEvent, block: TimeBlockDelaySummary) => void
}

const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`
const formatMinutes = (value: number | null) => value === null ? '—' : `${value.toFixed(1).replace('.', ',')} phút`

export function TimeBlockDelayChart({ blocks, selectedBlock, onSelect, onBlockContextMenu }: TimeBlockDelayChartProps) {
  const [activeBlock, setActiveBlock] = useState(selectedBlock ?? blocks[0]?.block)
  const active = blocks.find((block) => block.block === activeBlock) ?? blocks[0]
  if (!active) return <p className="chart-empty">Không có dữ liệu theo khung giờ kế hoạch.</p>
  const maxRate = Math.max(1, ...blocks.map((block) => block.metrics.delayRate ?? 0))
  const activate = (block: TimeBlockDelaySummary) => {
    setActiveBlock(block.block)
    onSelect(block)
  }

  return (
    <div className="time-block-chart">
      <div className="time-block-bars" role="list" aria-label="Tỷ lệ chuyến đến trễ theo khung giờ kế hoạch">
        {blocks.map((block) => (
          <button
            key={block.block}
            type="button"
            role="listitem"
            data-analysis-unit={`overview-time-block-${block.block.toLowerCase().replace(/\s+/g, '-')}`}
            className={block.block === selectedBlock ? 'selected' : ''}
            aria-label={`${block.label}: tỷ lệ trễ ${formatPercent(block.metrics.delayRate)}; ${block.metrics.delayedFlights.toLocaleString('vi-VN')} chuyến trễ trên ${block.metrics.eligibleFlights.toLocaleString('vi-VN')} chuyến đủ điều kiện; độ trễ đến trung bình ${formatMinutes(block.metrics.averageArrivalDelayMinutes)}.`}
            onMouseEnter={() => setActiveBlock(block.block)}
            onFocus={() => activate(block)}
            onClick={() => activate(block)}
            onContextMenu={(event) => onBlockContextMenu?.(event, block)}
          >
            <span className="time-block-label">{block.label}</span>
            <span className="time-block-track"><i style={{ width: `${((block.metrics.delayRate ?? 0) / maxRate) * 100}%` }} /></span>
            <strong>{formatPercent(block.metrics.delayRate)}</strong>
          </button>
        ))}
      </div>
      <div className="chart-evidence-popover chart-evidence-popover--compact" role="status" aria-live="polite">
        <strong>{active.label}</strong>
        <span>Tỷ lệ chuyến đến trễ: <b>{formatPercent(active.metrics.delayRate)}</b></span>
        <span>Chuyến đến trễ: <b>{active.metrics.delayedFlights.toLocaleString('vi-VN')} / {active.metrics.eligibleFlights.toLocaleString('vi-VN')}</b></span>
        <span>Độ trễ đến TB: <b>{formatMinutes(active.metrics.averageArrivalDelayMinutes)}</b></span>
      </div>
    </div>
  )
}
