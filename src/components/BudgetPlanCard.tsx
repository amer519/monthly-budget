import type { MonthlyBill } from '../types/models'
import { computePlannedSummary } from '../lib/calculations'
import { formatCents } from '../lib/money'
import { WarningIcon } from './icons'

/**
 * "Exactly how much should go to X" — the season's target allocation, built
 * from expected bill amounts and targets only. Deliberately ignores actual
 * spending/confirmations so it reads the same all month: it's the plan,
 * not a live status (that's what the gauge and "This Month" card are for).
 */
export default function BudgetPlanCard({
  bills,
  incomeCents,
  flexTargetCents,
  savingsTargetCents,
}: {
  bills: MonthlyBill[]
  incomeCents: number
  flexTargetCents: number
  savingsTargetCents: number
}) {
  const plan = computePlannedSummary({ incomeCents, bills, flexTargetCents, savingsTargetCents })
  const sortedBills = [...bills].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Budget Plan</h2>
      <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 text-sm dark:bg-card-dark">
        <PlanRow label="Monthly Income" value={formatCents(plan.incomeCents)} bold />

        <div className="my-1 h-px bg-border dark:bg-border-dark" />

        {sortedBills.map((bill) => (
          <PlanRow
            key={bill.id}
            label={bill.name}
            value={formatCents(bill.expected_amount_cents)}
            emphasis={bill.is_tracked ? 'text-flex' : undefined}
            indent
          />
        ))}
        <PlanRow label="Bills Total" value={formatCents(plan.billsPlannedTotalCents)} bold />

        <div className="my-1 h-px bg-border dark:bg-border-dark" />

        <PlanRow label="Flex Fund" value={formatCents(plan.flexTargetCents)} emphasis="text-flex" bold />

        <div className="my-1 h-px bg-border dark:bg-border-dark" />

        <PlanRow
          label="Left for Savings & Buffer"
          value={formatCents(plan.plannedAvailableCents)}
          bold
          emphasis={plan.isPlanOverBudget ? 'text-danger' : undefined}
        />
        <PlanRow label="Savings Goal" value={formatCents(plan.plannedSavingsCents)} emphasis="text-savings" indent />
        <PlanRow
          label="Buffer"
          value={formatCents(plan.plannedBufferCents)}
          emphasis={plan.plannedBufferCents < 0 ? 'text-danger' : 'text-buffer'}
          indent
        />

        {plan.isPlanOverBudget && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-xs font-medium text-danger">
            <WarningIcon className="h-4 w-4 shrink-0" />
            Your planned bills and targets add up to more than your income — this season's plan doesn't fit yet.
          </div>
        )}
      </div>
    </div>
  )
}

function PlanRow({
  label,
  value,
  bold,
  indent,
  emphasis,
}: {
  label: string
  value: string
  bold?: boolean
  indent?: boolean
  emphasis?: string
}) {
  return (
    <div className={`flex items-center justify-between ${indent ? 'pl-3' : ''}`}>
      <span className={indent ? 'text-muted dark:text-muted-dark' : 'text-ink dark:text-ink-dark'}>{label}</span>
      <span className={`${bold ? 'font-semibold' : 'font-medium'} ${emphasis ?? 'text-ink dark:text-ink-dark'}`}>{value}</span>
    </div>
  )
}
