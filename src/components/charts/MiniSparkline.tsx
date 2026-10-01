export function MiniSparkline({ values }: { values: number[] }) {
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
    </svg>
  )
}
