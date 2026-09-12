import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBudget } from '../context/BudgetContext'
import { formatCents, parseDollarInputToCents } from '../lib/money'
import { formatDateReadable, todayIsoDate } from '../lib/dates'
import MonthNav from '../components/MonthNav'
import BottomSheet from '../components/BottomSheet'
import { PlusIcon, TrashIcon } from '../components/icons'
import type { MonthlyBill } from '../types/models'

export default function HouseholdPage() {
  const budget = useBudget()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const trackedBills = budget.bills.filter((b) => b.is_tracked)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)

  const trackedIds = trackedBills.map((b) => b.id).join(',')
  useEffect(() => {
    if (trackedBills.length > 0 && !trackedBills.some((b) => b.id === selectedBillId)) {
      setSelectedBillId(trackedBills[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedIds])

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setSheetOpen(true)
      searchParams.delete('add')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  if (budget.loading || !budget.budget) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  const selectedBill = trackedBills.find((b) => b.id === selectedBillId) ?? trackedBills[0] ?? null
  const readOnly = !budget.isViewingCurrentMonth

  if (!selectedBill) {
    return (
      <div className="pb-6">
        <MonthNav
          year={budget.viewedYear}
          month={budget.viewedMonth}
          onPrev={budget.goToPreviousMonth}
          onNext={budget.goToNextMonth}
          isCurrent={budget.isViewingCurrentMonth}
        />
        <p className="mt-10 px-5 text-center text-sm text-muted dark:text-muted-dark">
          No tracked bills yet. Turn on "Quick-add tracking" for a bill in Settings to use this tab.
        </p>
      </div>
    )
  }

  const purchases = budget.billPurchases.filter((p) => p.monthly_bill_id === selectedBill.id)
  const spent = selectedBill.actual_amount_cents ?? 0
  const target = selectedBill.expected_amount_cents
  const remaining = target - spent
  const fraction = target > 0 ? Math.min(Math.max(spent / target, 0), 1) : spent > 0 ? 1 : 0

  return (
    <div className="pb-6">
      <MonthNav
        year={budget.viewedYear}
        month={budget.viewedMonth}
        onPrev={budget.goToPreviousMonth}
        onNext={budget.goToNextMonth}
        isCurrent={budget.isViewingCurrentMonth}
      />

      {trackedBills.length > 1 && (
        <div className="mt-3 flex justify-center px-5">
          <div className="flex rounded-full bg-card p-1 dark:bg-card-dark">
            {trackedBills.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBillId(b.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedBill.id === b.id ? 'bg-ink text-white dark:bg-ink-dark dark:text-surface-dark' : 'text-muted dark:text-muted-dark'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 px-5">
        <div className="rounded-3xl bg-gradient-to-br from-flex to-savings p-5 text-white shadow-lg shadow-flex/20">
          <p className="text-sm font-medium text-white/80">{selectedBill.name} {target > 0 ? 'Remaining' : 'Spent'}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatCents(target > 0 ? remaining : spent)}</p>
          {target > 0 && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${fraction * 100}%`, transition: 'width 0.6s ease-out' }}
              />
            </div>
          )}
          <div className="mt-3 flex justify-between text-sm text-white/90">
            <span>{formatCents(spent, { noCents: true })} spent</span>
            {target > 0 && <span>{formatCents(target, { noCents: true })} budget</span>}
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Purchases</h2>
        {purchases.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted dark:bg-card-dark dark:text-muted-dark">
            No purchases logged yet this month.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink dark:text-ink-dark">{p.description || selectedBill.name}</p>
                  <p className="mt-0.5 text-xs text-muted dark:text-muted-dark">{formatDateReadable(p.purchase_date)}</p>
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

      {!readOnly && selectedBill.status !== 'paid' && (
        <div className="mt-4 px-5">
          <button
            onClick={() => budget.markBillPaid(selectedBill.id)}
            className="w-full rounded-2xl bg-flex/15 px-4 py-3 text-sm font-semibold text-flex active:scale-[0.98]"
          >
            Mark {selectedBill.name} Paid for {formatCents(spent)}
          </button>
        </div>
      )}

      {!readOnly && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add purchase"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-savings text-white shadow-lg shadow-brand/40 active:scale-95"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      <AddPurchaseSheet bill={selectedBill} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}

function AddPurchaseSheet({ bill, open, onClose }: { bill: MonthlyBill; open: boolean; onClose: () => void }) {
  const budget = useBudget()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount('')
      setDescription('')
      setDate(todayIsoDate())
    }
  }, [open])

  const cents = parseDollarInputToCents(amount)
  const canSave = cents !== null && cents > 0

  async function handleSave() {
    if (!canSave || cents === null) return
    setBusy(true)
    await budget.addBillPurchase(bill.id, { description: description.trim() || null, amountCents: cents, date })
    setBusy(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Add ${bill.name} Purchase`}>
      <div className="flex flex-col gap-4">
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
          <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Walmart, Costco, paper towels…"
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
          Save
        </button>
      </div>
    </BottomSheet>
  )
}
