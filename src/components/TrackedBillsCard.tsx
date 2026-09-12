import { useNavigate } from 'react-router-dom'
import type { MonthlyBill } from '../types/models'
import { formatCents } from '../lib/money'
import { BoxIcon, CartIcon } from './icons'

function iconForBill(name: string) {
  return name.toLowerCase().includes('grocer') ? CartIcon : BoxIcon
}

/**
 * Read-only totals on the dashboard — adding purchases happens on the
 * dedicated Household tab, which has room for the full purchase list
 * without the amount/description fields getting pushed off-screen.
 */
export default function TrackedBillsCard({ bills }: { bills: MonthlyBill[]; readOnly: boolean }) {
  const navigate = useNavigate()

  if (bills.length === 0) return null

  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Groceries &amp; Household</h2>
      <div className="flex flex-col gap-2.5">
        {bills.map((bill) => {
          const Icon = iconForBill(bill.name)
          const spent = bill.actual_amount_cents ?? 0
          const target = bill.expected_amount_cents
          const fraction = target > 0 ? Math.min(Math.max(spent / target, 0), 1) : spent > 0 ? 1 : 0
          const over = target > 0 && spent > target

          return (
            <button
              key={bill.id}
              onClick={() => navigate('/household')}
              className="w-full rounded-2xl bg-card p-4 text-left active:scale-[0.99] dark:bg-card-dark"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flex/15 text-flex">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug text-ink dark:text-ink-dark">{bill.name}</p>
                  <p className="mt-0.5 text-sm text-muted dark:text-muted-dark">
                    {formatCents(spent, { noCents: true })}
                    {target > 0 && <> / {formatCents(target, { noCents: true })}</>} spent
                  </p>
                </div>
              </div>
              {target > 0 && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-flex'}`}
                    style={{ width: `${fraction * 100}%`, transition: 'width 0.6s ease-out' }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
