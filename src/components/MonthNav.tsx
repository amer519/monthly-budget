import { monthLabel } from '../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export default function MonthNav({
  year,
  month,
  onPrev,
  onNext,
  isCurrent,
  rightSlot,
}: {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  isCurrent: boolean
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-6">
      <button
        onClick={onPrev}
        aria-label="Previous month"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm active:scale-95 dark:bg-card-dark dark:text-ink-dark"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center">
        <h1 className="text-lg font-semibold text-ink dark:text-ink-dark">{monthLabel(month, year)}</h1>
        {!isCurrent && <span className="text-xs text-muted dark:text-muted-dark">Read-only</span>}
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        <button
          onClick={onNext}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm active:scale-95 dark:bg-card-dark dark:text-ink-dark"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
