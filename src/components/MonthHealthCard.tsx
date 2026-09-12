import type { MonthSummary } from '../lib/calculations'
import { formatCents } from '../lib/money'

/**
 * The at-a-glance health readout: Buffer absorbs overspending first (from
 * Flex/Groceries/Household going over budget); once Buffer hits $0, Savings
 * itself starts shrinking below its goal. This card just narrates whichever
 * of those states computeMonthSummary already lands on.
 */
export default function MonthHealthCard({ summary }: { summary: MonthSummary }) {
  const savingsOnTrack = summary.savingsPotentialCents >= summary.savingsTargetCents

  const status = summary.isOverBudget
    ? {
        label: 'Over Budget',
        text: 'text-danger',
        bg: 'bg-danger/10',
        message: "You've spent more than you make this month — savings is gone and buffer is negative.",
      }
    : !savingsOnTrack
      ? {
          label: 'Dipping Into Savings',
          text: 'text-savings',
          bg: 'bg-savings/10',
          message: 'Buffer is used up — extra spending is now coming out of your savings goal.',
        }
      : {
          label: 'On Track',
          text: 'text-flex',
          bg: 'bg-flex/10',
          message: 'Buffer and savings goal are both healthy.',
        }

  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Month Health</h2>
      <div className={`rounded-2xl p-4 ${status.bg}`}>
        <p className={`text-sm font-semibold ${status.text}`}>{status.label}</p>
        <p className="mt-1 text-xs text-muted dark:text-muted-dark">{status.message}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted dark:text-muted-dark">Savings</p>
            <p className="text-2xl font-bold tracking-tight text-savings">{formatCents(summary.savingsPotentialCents, { noCents: true })}</p>
            <p className="text-xs text-muted dark:text-muted-dark">of {formatCents(summary.savingsTargetCents, { noCents: true })} goal</p>
          </div>
          <div>
            <p className="text-xs text-muted dark:text-muted-dark">Buffer</p>
            <p className={`text-2xl font-bold tracking-tight ${summary.bufferCents < 0 ? 'text-danger' : 'text-buffer'}`}>
              {formatCents(summary.bufferCents, { noCents: true })}
            </p>
            <p className="text-xs text-muted dark:text-muted-dark">unallocated</p>
          </div>
        </div>
      </div>
    </div>
  )
}
