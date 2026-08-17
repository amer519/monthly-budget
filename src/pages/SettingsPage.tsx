import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { formatCents, parseDollarInputToCents } from '../lib/money'
import type { BillTemplate, FlexTagType, Season } from '../types/models'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '../components/icons'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const budget = useBudget()

  if (budget.loading || !budget.profile) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-semibold text-ink dark:text-ink-dark">Settings</h1>
      </div>

      <IncomeSection />
      <BillsSection />
      <SeasonSection season="summer" />
      <SeasonSection season="winter" />
      <FlexTagsSection tagType="vendor" title="Flex Quick Fills" hint="Shown as quick-fill chips for the purchase description." />
      <FlexTagsSection tagType="category" title="Flex Purchase Types" hint="Shown as optional “Type” chips when logging a purchase." />
      <FlexTagsSection tagType="person" title="Flex Who Tags" hint="Shown as optional “Who” chips when logging a purchase." />

      <div className="mt-8 px-5">
        <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">Account</h2>
        <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">
          <p className="text-sm text-muted dark:text-muted-dark">Signed in as</p>
          <p className="font-medium text-ink dark:text-ink-dark">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-3 w-full rounded-2xl bg-danger/10 px-4 py-3.5 text-base font-semibold text-danger active:scale-[0.98]"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="mb-3 text-base font-semibold text-ink dark:text-ink-dark">{title}</h2>
}

function IncomeSection() {
  const budget = useBudget()
  const [value, setValue] = useState(() => String((budget.profile!.monthly_income_cents / 100).toFixed(2)))
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const cents = parseDollarInputToCents(value)
    if (cents === null || cents < 0) return
    await budget.updateIncome(cents)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="mt-6 px-5">
      <SectionHeader title="Income" />
      <div className="rounded-2xl bg-card p-4 dark:bg-card-dark">
        <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">Default monthly income</label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
            <span className="mr-1 text-muted dark:text-muted-dark">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-transparent text-ink outline-none dark:text-ink-dark"
            />
          </div>
          <button
            onClick={handleSave}
            className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white active:scale-95 dark:bg-ink-dark dark:text-surface-dark"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BillsSection() {
  const budget = useBudget()
  const [addingOpen, setAddingOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState<'fixed' | 'variable'>('variable')

  const sorted = [...budget.billTemplates].sort((a, b) => a.sort_order - b.sort_order)

  async function handleAdd() {
    const cents = parseDollarInputToCents(newAmount) ?? 0
    if (newName.trim().length === 0) return
    await budget.addBillTemplate({ name: newName.trim(), defaultAmountCents: cents, type: newType })
    setNewName('')
    setNewAmount('')
    setNewType('variable')
    setAddingOpen(false)
  }

  function move(id: string, direction: -1 | 1) {
    const index = sorted.findIndex((t) => t.id === id)
    const swapWith = index + direction
    if (swapWith < 0 || swapWith >= sorted.length) return
    const reordered = [...sorted]
    ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]
    budget.reorderBillTemplates(reordered.map((t) => t.id))
  }

  return (
    <div className="mt-6 px-5">
      <div className="mb-3 flex items-center justify-between">
        <SectionHeader title="Bills" />
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white active:scale-95"
          aria-label="Add bill"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {addingOpen && (
        <div className="mb-3 flex flex-col gap-2.5 rounded-2xl bg-card p-4 dark:bg-card-dark">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Bill name"
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          />
          <input
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Default amount"
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          />
          <div className="flex gap-2">
            {(['fixed', 'variable'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
                  newType === t ? 'bg-ink text-white dark:bg-ink-dark dark:text-surface-dark' : 'bg-surface text-muted dark:bg-surface-dark dark:text-muted-dark'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={handleAdd} className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white active:scale-[0.98]">
            Add Bill
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {sorted.map((t, i) => (
          <BillTemplateRow key={t.id} template={t} onMoveUp={() => move(t.id, -1)} onMoveDown={() => move(t.id, 1)} isFirst={i === 0} isLast={i === sorted.length - 1} />
        ))}
      </div>
    </div>
  )
}

function BillTemplateRow({
  template,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  template: BillTemplate
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const budget = useBudget()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)
  const [amount, setAmount] = useState(String((template.default_amount_cents / 100).toFixed(2)))
  const [type, setType] = useState(template.type)

  async function handleSave() {
    const cents = template.is_gas ? template.default_amount_cents : (parseDollarInputToCents(amount) ?? template.default_amount_cents)
    await budget.updateBillTemplateFields(template.id, { name: name.trim() || template.name, default_amount_cents: cents, type })
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${template.name}"? This won't affect past months.`)) return
    await budget.deleteBillTemplateById(template.id)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 dark:bg-card-dark">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
        />
        {!template.is_gas && (
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          />
        )}
        {template.is_gas && (
          <p className="text-xs text-muted dark:text-muted-dark">Gas amount is set per season below, not here.</p>
        )}
        <div className="flex gap-2">
          {(['fixed', 'variable'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
                type === t ? 'bg-ink text-white dark:bg-ink-dark dark:text-surface-dark' : 'bg-surface text-muted dark:bg-surface-dark dark:text-muted-dark'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-black/5 py-2.5 text-sm font-medium text-ink dark:bg-white/10 dark:text-ink-dark">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card p-3.5 dark:bg-card-dark">
      <div className="flex flex-col">
        <button onClick={onMoveUp} disabled={isFirst} className="text-muted disabled:opacity-20 dark:text-muted-dark">
          <ChevronUpIcon className="h-4 w-4" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="text-muted disabled:opacity-20 dark:text-muted-dark">
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>

      <button onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium leading-snug text-ink dark:text-ink-dark">{template.name}</p>
          {!template.active && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-muted dark:bg-white/10 dark:text-muted-dark">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs capitalize text-muted dark:text-muted-dark">
          {template.type} · {template.is_gas ? 'set per season' : formatCents(template.default_amount_cents)}
        </p>
      </button>

      <button
        onClick={() => budget.updateBillTemplateFields(template.id, { active: !template.active })}
        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${template.active ? 'bg-flex' : 'bg-black/10 dark:bg-white/15'}`}
        aria-label="Toggle active"
      >
        <div className={`h-5 w-5 rounded-full bg-white transition ${template.active ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>

      <button onClick={handleDelete} className="shrink-0 rounded-full p-1.5 text-muted active:scale-95 dark:text-muted-dark" aria-label="Delete">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function SeasonSection({ season }: { season: Season }) {
  const budget = useBudget()
  const profile = budget.profile!
  const isSummer = season === 'summer'

  const [gas, setGas] = useState(String(((isSummer ? profile.summer_gas_cents : profile.winter_gas_cents) / 100).toFixed(2)))
  const [flexTarget, setFlexTarget] = useState(
    String(((isSummer ? profile.summer_flex_target_cents : profile.winter_flex_target_cents) / 100).toFixed(2)),
  )
  const [savingsTarget, setSavingsTarget] = useState(
    String(((isSummer ? profile.summer_savings_target_cents : profile.winter_savings_target_cents) / 100).toFixed(2)),
  )
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const gasCents = parseDollarInputToCents(gas)
    const flexCents = parseDollarInputToCents(flexTarget)
    const savingsCents = parseDollarInputToCents(savingsTarget)
    await budget.updateSeasonDefaults(season, {
      gasCents: gasCents ?? undefined,
      flexTargetCents: flexCents ?? undefined,
      savingsTargetCents: savingsCents ?? undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="mt-6 px-5">
      <SectionHeader title={`${isSummer ? 'Summer' : 'Winter'} Budget Profile`} />
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 dark:bg-card-dark">
        <Field label="Gas expected amount" value={gas} onChange={setGas} />
        <Field label="Flex Fund target" value={flexTarget} onChange={setFlexTarget} />
        <Field label="Savings goal" value={savingsTarget} onChange={setSavingsTarget} />
        <button
          onClick={handleSave}
          className="rounded-2xl bg-ink py-3 text-sm font-semibold text-white active:scale-[0.98] dark:bg-ink-dark dark:text-surface-dark"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function FlexTagsSection({ tagType, title, hint }: { tagType: FlexTagType; title: string; hint: string }) {
  const budget = useBudget()
  const [newLabel, setNewLabel] = useState('')

  const tags = budget.flexTags.filter((t) => t.tag_type === tagType).sort((a, b) => a.sort_order - b.sort_order)

  async function handleAdd() {
    const label = newLabel.trim()
    if (label.length === 0) return
    await budget.addFlexTag(tagType, label)
    setNewLabel('')
  }

  function move(id: string, direction: -1 | 1) {
    const index = tags.findIndex((t) => t.id === id)
    const swapWith = index + direction
    if (swapWith < 0 || swapWith >= tags.length) return
    const reordered = [...tags]
    ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]
    budget.reorderFlexTags(tagType, reordered.map((t) => t.id))
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Remove "${label}"? This won't affect past purchases.`)) return
    await budget.deleteFlexTag(id)
  }

  return (
    <div className="mt-6 px-5">
      <SectionHeader title={title} />
      <p className="-mt-2 mb-3 text-xs text-muted dark:text-muted-dark">{hint}</p>

      <div className="mb-3 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Add new…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
        />
        <button
          onClick={handleAdd}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white active:scale-95"
          aria-label={`Add ${title}`}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-4 text-center text-sm text-muted dark:bg-card-dark dark:text-muted-dark">None yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tags.map((tag, i) => (
            <div key={tag.id} className="flex items-center gap-2 rounded-2xl bg-card p-3 dark:bg-card-dark">
              <div className="flex flex-col">
                <button onClick={() => move(tag.id, -1)} disabled={i === 0} className="text-muted disabled:opacity-20 dark:text-muted-dark">
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(tag.id, 1)}
                  disabled={i === tags.length - 1}
                  className="text-muted disabled:opacity-20 dark:text-muted-dark"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="min-w-0 flex-1 font-medium text-ink dark:text-ink-dark">{tag.label}</p>
              <button onClick={() => handleDelete(tag.id, tag.label)} className="shrink-0 rounded-full p-1.5 text-muted active:scale-95 dark:text-muted-dark" aria-label="Delete">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted dark:text-muted-dark">{label}</label>
      <div className="flex items-center rounded-xl border border-border bg-surface px-3 py-2.5 dark:border-border-dark dark:bg-surface-dark">
        <span className="mr-1 text-muted dark:text-muted-dark">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-ink outline-none dark:text-ink-dark"
        />
      </div>
    </div>
  )
}
