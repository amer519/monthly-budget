import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import * as api from '../lib/api'
import { computeMonthSummary, confirmedBillsCount, paidBillsCount } from '../lib/calculations'
import { formatCents } from '../lib/money'
import { monthLabel } from '../lib/dates'
import { ChevronLeftIcon } from '../components/icons'
import type { FlexTransaction, MonthlyBill, MonthlyBudget } from '../types/models'

export default function MonthDetailPage() {
  const { year, month } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const budgetCtx = useBudget()

  const [data, setData] = useState<{ budget: MonthlyBudget; bills: MonthlyBill[]; flex: FlexTransaction[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const y = Number(year)
  const m = Number(month)

  useEffect(() => {
    if (!user || !Number.isFinite(y) || !Number.isFinite(m)) return
    let cancelled = false
    ;(async () => {
      try {
        const monthBudget = await api.fetchMonthlyBudget(user.id, y, m)
        if (!monthBudget) {
          if (!cancelled) setError('No budget found for this month.')
          return
        }
        const [bills, flex] = await Promise.all([api.fetchMonthlyBills(monthBudget.id), api.fetchFlexTransactions(monthBudget.id)])
        if (!cancelled) setData({ budget: monthBudget, bills, flex })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load month')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, y, m])

  if (error) return <div className="p-6 text-center text-danger">{error}</div>

  if (!data) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  const { budget, bills, flex } = data
  const summary = computeMonthSummary({
    incomeCents: budget.income_cents,
    bills,
    flexTargetCents: budget.flex_target_cents,
    flexTransactions: flex,
    savingsTargetCents: budget.savings_target_cents,
  })

  function handleEdit() {
    budgetCtx.goToMonth(y, m)
    navigate('/')
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 px-5 pt-6">
        <button
          onClick={() => navigate('/history')}
          aria-label="Back to history"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm active:scale-95 dark:bg-card-dark dark:text-ink-dark"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-ink dark:text-ink-dark">{monthLabel(m, y)}</h1>
      </div>

      <div className="mt-5 px-5">
        <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Income" value={formatCents(summary.incomeCents)} />
            <Row label="Season" value={budget.season} capitalize />
            <Row label="Bills Total" value={formatCents(summary.billsTotalCents)} />
            <Row label="Flex Spent" value={formatCents(summary.flexSpentCents)} tone="text-flex" />
            <Row label="Savings" value={formatCents(summary.savingsPotentialCents)} tone="text-savings" />
            <Row label="Buffer" value={formatCents(summary.bufferCents)} tone={summary.bufferCents < 0 ? 'text-danger' : 'text-buffer'} />
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink dark:text-ink-dark">Bills</h2>
          <p className="text-xs font-medium text-muted dark:text-muted-dark">
            {confirmedBillsCount(bills)} of {bills.length} confirmed · {paidBillsCount(bills)} of {bills.length} paid
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark">
              <p className="font-medium text-ink dark:text-ink-dark">{bill.name}</p>
              <div className="text-right">
                <p className="font-semibold text-ink dark:text-ink-dark">
                  {formatCents(bill.actual_amount_cents ?? bill.expected_amount_cents)}
                </p>
                <p className="text-xs capitalize text-muted dark:text-muted-dark">{bill.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {flex.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Flex Purchases</h2>
          <div className="flex flex-col gap-2.5">
            {flex.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark">
                <p className="font-medium text-ink dark:text-ink-dark">{t.description}</p>
                <span className="font-semibold text-ink dark:text-ink-dark">{formatCents(t.amount_cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 px-5">
        <button
          onClick={handleEdit}
          className="w-full rounded-2xl bg-ink px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] dark:bg-ink-dark dark:text-surface-dark"
        >
          Edit This Month
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, tone, capitalize }: { label: string; value: string; tone?: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-muted dark:text-muted-dark">{label}</p>
      <p className={`font-semibold ${capitalize ? 'capitalize' : ''} ${tone ?? 'text-ink dark:text-ink-dark'}`}>{value}</p>
    </div>
  )
}
