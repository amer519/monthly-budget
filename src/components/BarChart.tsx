export default function BarChart({
  data,
  barColor,
  formatValue,
}: {
  data: { label: string; value: number }[]
  /** static Tailwind class, e.g. "bg-brand" */
  barColor: string
  formatValue: (value: number) => string
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted dark:text-muted-dark">Not enough history yet.</p>
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1)

  return (
    <div className="flex items-end gap-2.5" style={{ height: 140 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted dark:text-muted-dark">{formatValue(d.value)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-lg ${barColor}`}
              style={{
                height: `${Math.max((Math.abs(d.value) / max) * 100, 4)}%`,
                transition: 'height 0.6s ease-out',
                opacity: d.value < 0 ? 0.4 : 1,
              }}
            />
          </div>
          <span className="text-[11px] text-muted dark:text-muted-dark">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
