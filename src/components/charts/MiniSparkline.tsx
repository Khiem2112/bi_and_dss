interface SparklinePoint {
  label: string
  value: number
  delayedCount: number
  eligibleCount: number
  averageDelay: number
}

export function MiniSparkline({ values, details }: { values: number[]; details?: SparklinePoint[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values.map((value, index) => {
    const x = index * 72 / Math.max(values.length - 1, 1) + 4
    const y = 25 - (value - min) * 20 / Math.max(max - min, 1)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 80 30" aria-label="Xu hướng 6 kỳ" role="img">
      <polyline fill="none" stroke="#e11d48" strokeWidth="2.4" points={points} />
      {details?.map((point, index) => {
        const x = index * 72 / Math.max(values.length - 1, 1) + 4
        const y = 25 - (point.value - min) * 20 / Math.max(max - min, 1)
        return (
          <circle
            key={point.label}
            cx={x}
            cy={y}
            r="2.4"
            tabIndex={0}
            fill="#e11d48"
            stroke="white"
            strokeWidth="1"
            data-tooltip-multiline
            data-tooltip={`${point.label}\n• Tỷ lệ chuyến đến trễ: ${point.value.toFixed(1)}%\n• Số chuyến đến trễ: ${point.delayedCount.toLocaleString('vi-VN')} / ${point.eligibleCount.toLocaleString('vi-VN')}\n• Độ trễ đến trung bình: ${point.averageDelay.toFixed(1)} phút`}
            aria-label={`${point.label}, tỷ lệ chuyến đến trễ ${point.value.toFixed(1)}%, số chuyến đến trễ ${point.delayedCount} trên ${point.eligibleCount}, độ trễ đến trung bình ${point.averageDelay.toFixed(1)} phút`}
          />
        )
      })}
    </svg>
  )
}
