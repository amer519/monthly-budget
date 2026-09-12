import { useEffect, useState } from 'react'
import type { MonthlyBill } from '../types/models'
import { formatCents, parseDollarInputToCents } from '../lib/money'
import { formatDateReadable, todayIsoDate } from '../lib/dates'
import { useBudget } from '../context/BudgetContext'
import BottomSheet from './BottomSheet'
import { BoxIcon, CartIcon, PlusIcon, TrashIcon } from './icons'

function iconForBill(name: string) {
  return name.toLowerCase().includes('grocer') ? CartIcon : BoxIcon
}

export default function TrackedBillsCard({ bills, readOnly }: { bills: MonthlyBill[]; readOnly: boolean }) {
  const [activeBillId, setActiveBillId] = useState<string | null>(null)
  const activeBill = bills.find((b) => b.id === activeBillId) ?? null

  if (bills.length === 0) return null

  return (
    <div className="mt-6 px-5">
      <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Groceries &amp; Household</h2>
      <div className="flex flex-col gap-2.5">
        {bills.map((bill) => (
          <TrackedBillRow key={bill.id} bill={bill} onOpen={() => setActiveBillId(bill.id)} />
        ))}
      </div>
      <TrackedBillSheet bill={activeBill} readOnly={readOnly} onClose={() => setActiveBillId(null)} />
    </div>
  )
}

function TrackedBillRow({ bill, onOpen }: { bill: MonthlyBill; onOpen: () => void }) {
  const Icon = iconForBill(bill.name)
  const spent = bill.actual_amount_cents ?? 0
  const target = bill.expected_amount_cents
  const fraction = target > 0 ? Math.min(Math.max(spent / target, 0), 1) : spent > 0 ? 1 : 0
  const over = target > 0 && spent > target

  return (
    <button onClick={onOpen} className="w-full rounded-2xl bg-card p-4 text-left active:scale-[0.99] dark:bg-card-dark">
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <PlusIcon className="h-4 w-4" />
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
}

function TrackedBillSheet({ bill, readOnly, onClose }: { bill: MonthlyBill | null; readOnly: boolean; onClose: () => void }) {
  const budget = useBudget()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [busy, setBusy] = useState(false)

  const purchases = bill ? budget.billPurchases.filter((p) => p.monthly_bill_id === bill.id) : []

  useEffect(() => {
    if (bill) {
      setAmount('')
      setDescription('')
      setDate(todayIsoDate())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.id])

  const cents = parseDollarInputToCents(amount)
  const canSave = cents !== null && cents > 0

  async function handleSave() {
    if (!canSave || cents === null || !bill) return
    setBusy(true)
    await budget.addBillPurchase(bill.id, { description: description.trim() || null, amountCents: cents, date })
    setBusy(false)
    setAmount('')
    setDescription('')
  }

  if (!bill) return null

  const spent = bill.actual_amount_cents ?? 0
  const target = bill.expected_amount_cents

  return (
    <BottomSheet open={!!bill} onClose={onClose} title={bill.name}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 dark:bg-surface-dark">
          <div>
            <p className="text-xs text-muted dark:text-muted-dark">Spent this month</p>
            <p className="text-lg font-semibold text-ink dark:text-ink-dark">{formatCents(spent)}</p>
          </div>
          {target > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted dark:text-muted-dark">Budget</p>
              <p className="text-sm font-medium text-ink dark:text-ink-dark">{formatCents(target, { noCents: true })}</p>
            </div>
          )}
        </div>

        {!readOnly && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Amount</label>
              <div className="flex items-center rounded-2xl border border-border bg-surface px-4 py-3.5 dark:border-border-dark dark:bg-surface-dark">
                <span className="mr-1 text-lg text-muted dark:text-muted-dark">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-lg text-ink outline-none dark:text-ink-dark"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Walmart, Costco…"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-base text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-base text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave || busy}
              className="rounded-2xl bg-ink px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-40 dark:bg-ink-dark dark:text-surface-dark"
            >
              Add Purchase
            </button>

            {bill.status !== 'paid' && (
              <button
                onClick={() => budget.markBillPaid(bill.id)}
                className="rounded-2xl bg-flex/15 px-4 py-3 text-sm font-semibold text-flex active:scale-[0.98]"
              >
                Mark Paid for {formatCents(spent)}
              </button>
            )}
          </>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">This month's purchases</p>
          {purchases.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted dark:bg-surface-dark dark:text-muted-dark">
              None logged yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 dark:bg-surface-dark">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink dark:text-ink-dark">{p.description || bill.name}</p>
                    <p className="text-xs text-muted dark:text-muted-dark">{formatDateReadable(p.purchase_date)}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink dark:text-ink-dark">{formatCents(p.amount_cents)}</span>
                  {!readOnly && (
                    <button
                      onClick={() => budget.deleteBillPurchase(p.id)}
                      aria-label="Delete"
                      className="shrink-0 rounded-full p-1.5 text-muted active:scale-95 dark:text-muted-dark"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
