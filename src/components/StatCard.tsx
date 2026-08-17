import type { ReactNode } from 'react'

export default function StatCard({
  label,
  value,
  sublabel,
  barClassName,
  iconWrapperClassName,
  progress,
  icon,
}: {
  label: string
  value: string
  sublabel?: string
  /** static Tailwind class for the progress bar fill, e.g. "bg-flex" */
  barClassName: string
  /** static Tailwind class for the icon chip background + text, e.g. "bg-flex/15 text-flex" */
  iconWrapperClassName?: string
  progress?: number
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 dark:bg-card-dark">
      <div className="flex items-center gap-2">
        {icon && <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconWrapperClassName ?? ''}`}>{icon}</div>}
        <p className="text-sm font-medium text-muted dark:text-muted-dark">{label}</p>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-ink dark:text-ink-dark">{value}</p>
      {sublabel && <p className="text-xs text-muted dark:text-muted-dark">{sublabel}</p>}
      {progress !== undefined && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${barClassName}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, transition: 'width 0.6s ease-out' }}
          />
        </div>
      )}
    </div>
  )
}
