import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudget } from '../context/BudgetContext'
import { computeMonthSummary, confirmedBillsCount, flexUsedFraction, paidBillsCount } from '../lib/calculations'
import { formatCents } from '../lib/money'
import MonthNav from '../components/MonthNav'
import GaugeRing from '../components/GaugeRing'
import StatCard from '../components/StatCard'
import BillRow from '../components/BillRow'
import TrackedBillsCard from '../components/TrackedBillsCard'
import BudgetPlanCard from '../components/BudgetPlanCard'
import { PlusIcon, TrendingUpIcon, ShieldIcon, WalletIcon, WarningIcon } from '../components/icons'
import type { Season } from '../types/models'

export default function DashboardPage() {
  const budget = useBudget()
  const navigate = useNavigate()
  const [editingPast, setEditingPast] = useState(false)

  useEffect(() => setEditingPast(false), [budget.viewedYear, budget.viewedMonth])

  if (budget.loading || !budget.budget) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (budget.error) {
    return <div className="p-6 text-center text-danger">{budget.error}</div>
  }

  const { budget: month, bills, flexTransactions } = budget
  const readOnly = !budget.isViewingCurrentMonth && !editingPast

  const summary = computeMonthSummary({
    incomeCents: month.income_cents,
    bills,
    flexTargetCents: month.flex_target_cents,
    flexTransactions,
    savingsTargetCents: month.savings_target_cents,
  })

  const committedFraction = month.income_cents > 0 ? (summary.billsTotalCents + summary.flexSpentCents) / month.income_cents : 0
  const trackedBills = bills.filter((b) => b.is_tracked)
  const regularBills = bills.filter((b) => !b.is_tracked)
  const confirmedCount = confirmedBillsCount(regularBills)
  const paidCount = paidBillsCount(regularBills)

  async function handleSeasonToggle(season: Season) {
    if (readOnly) return
    if (season === month.season) return
    await budget.changeSeason(season)
  }

  return (
    <div className="pb-6">
      <MonthNav
        year={budget.viewedYear}
        month={budget.viewedMonth}
        onPrev={budget.goToPreviousMonth}
        onNext={budget.goToNextMonth}
        isCurrent={budget.isViewingCurrentMonth}
        rightSlot={
          !budget.isViewingCurrentMonth ? (
            <button
              onClick={() => setEditingPast((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                editingPast ? 'bg-brand text-white' : 'bg-card text-ink dark:bg-card-dark dark:text-ink-dark'
              }`}
            >
              {editingPast ? 'Done' : 'Edit'}
            </button>
          ) : undefined
        }
      />

      <div className="mt-3 flex justify-center px-5">
        <div className="flex rounded-full bg-card p-1 dark:bg-card-dark">
          {(['summer', 'winter'] as Season[]).map((s) => (
            <button
              key={s}
              onClick={() => handleSeasonToggle(s)}
              disabled={readOnly}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition disabled:opacity-60 ${
                month.season === s ? 'bg-ink text-white dark:bg-ink-dark dark:text-surface-dark' : 'text-muted dark:text-muted-dark'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {summary.isOverBudget && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <WarningIcon className="h-5 w-5 shrink-0" />
          You're over budget this month by {formatCents(Math.abs(summary.bufferCents))}.
        </div>
      )}

      <div className="mt-6 flex flex-col items-center">
        <GaugeRing fraction={committedFraction} overBudget={summary.isOverBudget}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted dark:text-muted-dark">
            {summary.isOverBudget ? 'Over Budget' : 'Remaining This Month'}
          </p>
          <p className={`mt-1 text-4xl font-bold tracking-tight ${summary.isOverBudget ? 'text-danger' : 'text-ink dark:text-ink-dark'}`}>
            {formatCents(summary.availableCents, { noCents: true })}
          </p>
          <p className="mt-1 text-xs text-muted dark:text-muted-dark">of {formatCents(month.income_cents, { noCents: true })} income</p>
        </GaugeRing>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 px-5">
        <StatCard
          label="Flex Fund"
          value={formatCents(summary.flexRemainingCents)}
          sublabel={`${formatCents(summary.flexSpentCents, { noCents: true })} / ${formatCents(summary.flexTargetCents, { noCents: true })} spent`}
          barClassName="bg-flex"
          iconWrapperClassName="bg-flex/15 text-flex"
          icon={<WalletIcon className="h-4 w-4" />}
          progress={flexUsedFraction(summary.flexTargetCents, summary.flexSpentCents)}
        />
        <StatCard
          label="Savings Potential"
          value={formatCents(summary.savingsPotentialCents)}
          sublabel={`goal ${formatCents(summary.savingsTargetCents, { noCents: true })}`}
          barClassName="bg-savings"
          iconWrapperClassName="bg-savings/15 text-savings"
          icon={<TrendingUpIcon className="h-4 w-4" />}
          progress={summary.savingsTargetCents > 0 ? summary.savingsPotentialCents / summary.savingsTargetCents : 0}
        />
        <div className="col-span-2">
          <StatCard
            label="Buffer"
            value={formatCents(summary.bufferCents)}
            sublabel="unallocated breathing room"
            barClassName="bg-buffer"
            iconWrapperClassName="bg-buffer/15 text-buffer"
            icon={<ShieldIcon className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mt-6 px-5">
        <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">This Month</h2>
        <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 text-sm dark:bg-card-dark">
          <Row label="Income" value={formatCents(summary.incomeCents)} />
          <Row label="Bills paid so far" value={formatCents(summary.billsPaidCents)} />
          <Row label="Bills still expected" value={formatCents(summary.billsOutstandingCents)} />
          <Row label="Flex spent" value={formatCents(summary.flexSpentCents)} />
          <div className="my-1 h-px bg-border dark:bg-border-dark" />
          <Row label="Projected savings" value={formatCents(summary.savingsPotentialCents)} emphasis="text-savings" />
          <Row label="Projected buffer" value={formatCents(summary.bufferCents)} emphasis={summary.bufferCents < 0 ? 'text-danger' : 'text-buffer'} />
        </div>
      </div>

      <BudgetPlanCard
        bills={bills}
        incomeCents={month.income_cents}
        flexTargetCents={month.flex_target_cents}
        savingsTargetCents={month.savings_target_cents}
      />

      <TrackedBillsCard bills={trackedBills} readOnly={readOnly} />

      <div className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink dark:text-ink-dark">Bills</h2>
          <p className="text-xs font-medium text-muted dark:text-muted-dark">
            {confirmedCount} of {regularBills.length} confirmed · {paidCount} of {regularBills.length} paid
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {regularBills.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              readOnly={readOnly}
              onNoChange={() => budget.markBillNoChange(bill.id)}
              onUpdate={(cents) => budget.updateBillActual(bill.id, cents)}
              onMarkPaid={() => budget.markBillPaid(bill.id)}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate('/flex?add=1')}
        aria-label="Add Flex purchase"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-savings text-white shadow-lg shadow-brand/40 active:scale-95"
      >
        <PlusIcon className="h-6 w-6" />
      </button>
    </div>
  )
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted dark:text-muted-dark">{label}</span>
      <span className={`font-semibold ${emphasis ?? 'text-ink dark:text-ink-dark'}`}>{value}</span>
    </div>
  )
}
