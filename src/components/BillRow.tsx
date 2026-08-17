import { useState } from 'react'
import type { MonthlyBill } from '../types/models'
import { effectiveBillAmountCents } from '../lib/calculations'
import { formatCents, parseDollarInputToCents } from '../lib/money'
import BottomSheet from './BottomSheet'
import { CheckIcon } from './icons'

const STATUS_STYLES: Record<MonthlyBill['status'], string> = {
  pending: 'bg-buffer/15 text-buffer',
  confirmed: 'bg-savings/15 text-savings',
  paid: 'bg-flex/15 text-flex',
}

const STATUS_LABEL: Record<MonthlyBill['status'], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  paid: 'Paid',
}

export default function BillRow({
  bill,
  readOnly,
  onNoChange,
  onUpdate,
  onMarkPaid,
}: {
  bill: MonthlyBill
  readOnly: boolean
  onNoChange: () => Promise<void>
  onUpdate: (actualCents: number) => Promise<void>
  onMarkPaid: () => Promise<void>
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [inputValue, setInputValue] = useState(() => (bill.actual_amount_cents ?? bill.expected_amount_cents) / 100 + '')
  const [busy, setBusy] = useState(false)

  const amount = effectiveBillAmountCents(bill)
  const changedFromExpected = bill.actual_amount_cents !== null && bill.actual_amount_cents !== bill.expected_amount_cents

  async function handleSave() {
    const cents = parseDollarInputToCents(inputValue)
    if (cents === null || cents < 0) return
    setBusy(true)
    await onUpdate(cents)
    setBusy(false)
    setSheetOpen(false)
  }

  async function handleNoChange() {
    setBusy(true)
    await onNoChange()
    setBusy(false)
  }

  return (
    <div className="rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-medium leading-snug text-ink dark:text-ink-dark">{bill.name}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[bill.status]}`}>
          {STATUS_LABEL[bill.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted dark:text-muted-dark">
        {bill.status === 'pending' ? (
          <>Expected {formatCents(bill.expected_amount_cents)}</>
        ) : (
          <>
            {formatCents(amount)}
            {changedFromExpected && <span className="ml-1 text-xs">(expected {formatCents(bill.expected_amount_cents)})</span>}
          </>
        )}
      </p>

      {!readOnly && (
        <div className="mt-3 flex items-center gap-2">
          {bill.status === 'pending' && (
            <>
              <button
                onClick={handleNoChange}
                disabled={busy}
                className="flex-1 rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-ink active:scale-95 disabled:opacity-50 dark:bg-white/10 dark:text-ink-dark"
              >
                No Change
              </button>
              <button
                onClick={() => setSheetOpen(true)}
                disabled={busy}
                className="flex-1 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
              >
                Update
              </button>
            </>
          )}

          {bill.status === 'confirmed' && (
            <>
              <button
                onClick={() => setSheetOpen(true)}
                disabled={busy}
                className="flex-1 rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-ink active:scale-95 disabled:opacity-50 dark:bg-white/10 dark:text-ink-dark"
              >
                Edit
              </button>
              <button
                onClick={onMarkPaid}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-flex px-3 py-2 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" /> Paid
              </button>
            </>
          )}

          {bill.status === 'paid' && (
            <button
              onClick={() => setSheetOpen(true)}
              disabled={busy}
              className="w-full rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-ink active:scale-95 disabled:opacity-50 dark:bg-white/10 dark:text-ink-dark"
            >
              Edit
            </button>
          )}
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={bill.name}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Actual amount</label>
            <div className="flex items-center rounded-2xl border border-border bg-surface px-4 py-3.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="mr-1 text-lg text-muted dark:text-muted-dark">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-transparent text-lg text-ink outline-none dark:text-ink-dark"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted dark:text-muted-dark">Expected: {formatCents(bill.expected_amount_cents)}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={busy}
            className="rounded-2xl bg-ink px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50 dark:bg-ink-dark dark:text-surface-dark"
          >
            Save
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
