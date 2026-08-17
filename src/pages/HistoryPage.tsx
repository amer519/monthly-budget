import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import { buildMonthHistory, type MonthHistoryEntry } from '../lib/history'
import { formatCents, formatCentsCompact } from '../lib/money'
import { MONTH_NAMES } from '../lib/dates'
import BarChart from '../components/BarChart'

export default function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<MonthHistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const [budgets, bills, flex] = await Promise.all([
          api.fetchAllMonthlyBudgets(user.id),
          api.fetchAllBillsForUser(user.id),
          api.fetchAllFlexTransactionsForUser(user.id),
        ])
        if (!cancelled) setEntries(buildMonthHistory(budgets, bills, flex))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load history')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (error) return <div className="p-6 text-center text-danger">{error}</div>

  if (!entries) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  const chartMonths = [...entries].reverse().slice(-6)
  const spendingData = chartMonths.map((e) => ({
    label: MONTH_NAMES[e.budget.month - 1].slice(0, 3),
    value: e.summary.billsTotalCents / 100,
  }))
  const savingsData = chartMonths.map((e) => ({
    label: MONTH_NAMES[e.budget.month - 1].slice(0, 3),
    value: e.summary.savingsPotentialCents / 100,
  }))
  const flexData = chartMonths.map((e) => ({
    label: MONTH_NAMES[e.budget.month - 1].slice(0, 3),
    value: e.summary.flexSpentCents / 100,
  }))

  const avgSpendingCents = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.summary.billsTotalCents, 0) / entries.length) : 0
  const totalSavedCents = entries.reduce((s, e) => s + e.summary.savingsPotentialCents, 0)

  return (
    <div className="pb-6">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-semibold text-ink dark:text-ink-dark">History</h1>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-5">
        <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">
          <p className="text-sm font-medium text-muted dark:text-muted-dark">Avg Monthly Spending</p>
          <p className="mt-1 text-xl font-semibold text-ink dark:text-ink-dark">{formatCentsCompact(avgSpendingCents)}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">
          <p className="text-sm font-medium text-muted dark:text-muted-dark">Total Saved</p>
          <p className="mt-1 text-xl font-semibold text-savings">{formatCentsCompact(totalSavedCents)}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-8 px-5 text-center text-sm text-muted dark:text-muted-dark">
          No months recorded yet. Your first month will appear here automatically.
        </p>
      ) : (
        <>
          <Section title="Monthly Spending">
            <BarChart data={spendingData} barColor="bg-brand" formatValue={(v) => `$${Math.round(v)}`} />
          </Section>

          <Section title="Savings">
            <BarChart data={savingsData} barColor="bg-savings" formatValue={(v) => `$${Math.round(v)}`} />
          </Section>

          <Section title="Flex Fund Spending">
            <BarChart data={flexData} barColor="bg-flex" formatValue={(v) => `$${Math.round(v)}`} />
          </Section>

          <div className="mt-6 px-5">
            <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">By Month</h2>
            <div className="flex flex-col gap-2.5">
              {entries.map((e) => (
                <button
                  key={e.budget.id}
                  onClick={() => navigate(`/history/${e.budget.year}/${e.budget.month}`)}
                  className="w-full rounded-2xl bg-card p-4 text-left active:scale-[0.98] dark:bg-card-dark"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink dark:text-ink-dark">
                      {MONTH_NAMES[e.budget.month - 1]} {e.budget.year}
                    </p>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium capitalize text-muted dark:bg-white/10 dark:text-muted-dark">
                      {e.budget.season}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <Stat label="Spent" value={formatCents(e.summary.billsTotalCents, { noCents: true })} />
                    <Stat label="Saved" value={formatCents(e.summary.savingsPotentialCents, { noCents: true })} tone="text-savings" />
                    <Stat label="Flex" value={formatCents(e.summary.flexSpentCents, { noCents: true })} tone="text-flex" />
                    <Stat
                      label="Buffer"
                      value={formatCents(e.summary.bufferCents, { noCents: true })}
                      tone={e.summary.bufferCents < 0 ? 'text-danger' : 'text-buffer'}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">{title}</h2>
      <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">{children}</div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-muted dark:text-muted-dark">{label}</p>
      <p className={`font-semibold ${tone ?? 'text-ink dark:text-ink-dark'}`}>{value}</p>
    </div>
  )
}
