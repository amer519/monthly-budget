import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBudget } from '../context/BudgetContext'
import { flexSpentCents, budgetUsedFraction } from '../lib/calculations'
import { formatCents, parseDollarInputToCents } from '../lib/money'
import { formatDateReadable, todayIsoDate } from '../lib/dates'
import MonthNav from '../components/MonthNav'
import BottomSheet from '../components/BottomSheet'
import { PlusIcon, TrashIcon } from '../components/icons'

export default function FlexPage() {
  const budget = useBudget()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

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

  const { budget: month, flexTransactions } = budget
  const spent = flexSpentCents(flexTransactions)
  const remaining = month.flex_target_cents - spent
  const readOnly = !budget.isViewingCurrentMonth

  return (
    <div className="pb-6">
      <MonthNav
        year={budget.viewedYear}
        month={budget.viewedMonth}
        onPrev={budget.goToPreviousMonth}
        onNext={budget.goToNextMonth}
        isCurrent={budget.isViewingCurrentMonth}
      />

      <div className="mt-5 px-5">
        <div className="rounded-3xl bg-gradient-to-br from-flex to-savings p-5 text-white shadow-lg shadow-flex/20">
          <p className="text-sm font-medium text-white/80">Flex Fund Remaining</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatCents(remaining)}</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${budgetUsedFraction(month.flex_target_cents, spent) * 100}%`, transition: 'width 0.6s ease-out' }}
            />
          </div>
          <div className="mt-3 flex justify-between text-sm text-white/90">
            <span>{formatCents(spent, { noCents: true })} spent</span>
            <span>{formatCents(month.flex_target_cents, { noCents: true })} budget</span>
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Purchases</h2>
        {flexTransactions.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted dark:bg-card-dark dark:text-muted-dark">
            No purchases logged yet this month.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {flexTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink dark:text-ink-dark">{t.description}</p>
                  <p className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                    {formatDateReadable(t.transaction_date)}
                    {t.category && <> · {t.category}</>}
                    {t.person_tag && <> · {t.person_tag}</>}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-ink dark:text-ink-dark">{formatCents(t.amount_cents)}</span>
                {!readOnly && (
                  <button
                    onClick={() => budget.deleteFlexTransaction(t.id)}
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

      {!readOnly && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add purchase"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-savings text-white shadow-lg shadow-brand/40 active:scale-95"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      <AddFlexSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}

function ChipRow({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string | null
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onToggle(label)}
          className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
            selected === label
              ? 'bg-ink text-white dark:bg-ink-dark dark:text-surface-dark'
              : 'bg-surface text-muted dark:bg-surface-dark dark:text-muted-dark'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function AddFlexSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const budget = useBudget()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [personTag, setPersonTag] = useState<string | null>(null)
  const [date, setDate] = useState(todayIsoDate())
  const [busy, setBusy] = useState(false)

  const vendors = budget.flexTags.filter((t) => t.tag_type === 'vendor').map((t) => t.label)
  const categories = budget.flexTags.filter((t) => t.tag_type === 'category').map((t) => t.label)
  const people = budget.flexTags.filter((t) => t.tag_type === 'person').map((t) => t.label)

  useEffect(() => {
    if (open) {
      setAmount('')
      setDescription('')
      setCategory(null)
      setPersonTag(null)
      setDate(todayIsoDate())
    }
  }, [open])

  const cents = parseDollarInputToCents(amount)
  const canSave = cents !== null && cents > 0 && description.trim().length > 0

  async function handleSave() {
    if (!canSave || cents === null) return
    setBusy(true)
    await budget.addFlexTransaction({ description: description.trim(), amountCents: cents, category, personTag, date })
    setBusy(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Flex Purchase">
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

        {vendors.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Quick fill</label>
            <ChipRow options={vendors} selected={description} onToggle={(v) => setDescription((prev) => (prev === v ? '' : v))} />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Amazon, Dinner, Clothes…"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-base text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          />
        </div>

        {categories.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Type (optional)</label>
            <ChipRow options={categories} selected={category} onToggle={(v) => setCategory((prev) => (prev === v ? null : v))} />
          </div>
        )}

        {people.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Who (optional)</label>
            <ChipRow options={people} selected={personTag} onToggle={(v) => setPersonTag((prev) => (prev === v ? null : v))} />
          </div>
        )}

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
