export default function ProgressRing({ value = 0, label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const color = safeValue > 70 ? '#10b981' : safeValue > 40 ? '#f59e0b' : '#ef4444'
  const background = `conic-gradient(${color} ${safeValue * 3.6}deg, rgba(148,163,184,.25) 0deg)`

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background }}>
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-surface)]">
          <span className="text-2xl font-black">{Math.round(safeValue)}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-[var(--color-muted)]">{label}</p>
        <p className="text-2xl font-bold">{safeValue.toFixed(1)}%</p>
      </div>
    </div>
  )
}
