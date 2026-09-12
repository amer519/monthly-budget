import { useNavigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { budgetUsedFraction } from '../lib/calculations'
import { formatCents } from '../lib/money'

export interface FundItem {
  id: string
  name: string
  spentCents: number
  budgetCents: number
  linkTo: string
  icon: ComponentType<{ className?: string }>
}

/** "How much can I still spend" for Flex, Groceries, and Household — the three discretionary funds, shown as equal peers. */
export default function SpendingFundsCard({ funds }: { funds: FundItem[] }) {
  const navigate = useNavigate()

  if (funds.length === 0) return null

  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">What You Can Still Spend</h2>
      <div className="flex flex-col gap-2.5">
        {funds.map((fund) => {
          const remaining = fund.budgetCents - fund.spentCents
          const fraction = budgetUsedFraction(fund.budgetCents, fund.spentCents)
          const over = remaining < 0
          const Icon = fund.icon

          return (
            <button
              key={fund.id}
              onClick={() => navigate(fund.linkTo)}
              className="w-full rounded-2xl bg-card p-4 text-left active:scale-[0.99] dark:bg-card-dark"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flex/15 text-flex">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug text-ink dark:text-ink-dark">{fund.name}</p>
                  <p className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                    {formatCents(fund.spentCents, { noCents: true })} / {formatCents(fund.budgetCents, { noCents: true })} spent
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold leading-tight ${over ? 'text-danger' : 'text-flex'}`}>
                    {formatCents(Math.abs(remaining), { noCents: true })}
                  </p>
                  <p className="text-[11px] font-medium text-muted dark:text-muted-dark">{over ? 'over' : 'left'}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-flex'}`}
                  style={{ width: `${fraction * 100}%`, transition: 'width 0.6s ease-out' }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
