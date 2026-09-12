import { describe, expect, it } from 'vitest'
import { computeMonthSummary, effectiveBillAmountCents, flexRemainingCents } from './calculations'
import type { FlexTransaction, MonthlyBill } from '../types/models'

function bill(overrides: Partial<MonthlyBill>): MonthlyBill {
  return {
    id: 'b1',
    monthly_budget_id: 'm1',
    user_id: 'u1',
    bill_template_id: null,
    name: 'Test',
    type: 'fixed',
    expected_amount_cents: 10000,
    actual_amount_cents: null,
    status: 'pending',
    sort_order: 0,
    is_tracked: false,
    created_at: '2026-01-01',
    ...overrides,
  }
}

function flex(amountCents: number): FlexTransaction {
  return {
    id: 'f1',
    monthly_budget_id: 'm1',
    user_id: 'u1',
    description: 'Test',
    amount_cents: amountCents,
    category: null,
    person_tag: null,
    transaction_date: '2026-01-01',
    created_at: '2026-01-01',
  }
}

describe('effectiveBillAmountCents', () => {
  it('uses expected amount when pending', () => {
    expect(effectiveBillAmountCents(bill({ status: 'pending', expected_amount_cents: 40000, actual_amount_cents: null }))).toBe(40000)
  })

  it('uses actual amount when confirmed', () => {
    expect(effectiveBillAmountCents(bill({ status: 'confirmed', expected_amount_cents: 40000, actual_amount_cents: 32742 }))).toBe(32742)
  })

  it('uses actual amount when paid', () => {
    expect(effectiveBillAmountCents(bill({ status: 'paid', expected_amount_cents: 40000, actual_amount_cents: 32742 }))).toBe(32742)
  })

  it('falls back to expected if confirmed but actual missing', () => {
    expect(effectiveBillAmountCents(bill({ status: 'confirmed', expected_amount_cents: 40000, actual_amount_cents: null }))).toBe(40000)
  })
})

describe('computeMonthSummary — summer defaults reconcile exactly', () => {
  const bills: MonthlyBill[] = [
    bill({ id: '1', name: 'Mortgage', status: 'paid', expected_amount_cents: 194300, actual_amount_cents: 194300 }),
    bill({ id: '2', name: 'Tesla', status: 'paid', expected_amount_cents: 64600, actual_amount_cents: 64600 }),
    bill({ id: '3', name: 'Solar', status: 'confirmed', expected_amount_cents: 20000, actual_amount_cents: 20000 }),
    bill({ id: '4', name: 'Car Insurance', status: 'confirmed', expected_amount_cents: 35300, actual_amount_cents: 35300 }),
    bill({ id: '5', name: 'Comcast', status: 'pending', expected_amount_cents: 13000, actual_amount_cents: null }),
    bill({ id: '6', name: 'Water', status: 'pending', expected_amount_cents: 11000, actual_amount_cents: null }),
    bill({ id: '7', name: 'Groceries', status: 'pending', expected_amount_cents: 73700, actual_amount_cents: null }),
    bill({ id: '8', name: 'Electric', status: 'pending', expected_amount_cents: 40000, actual_amount_cents: null }),
    bill({ id: '9', name: 'Gas', status: 'pending', expected_amount_cents: 1200, actual_amount_cents: null }),
    bill({ id: '10', name: 'Streaming', status: 'pending', expected_amount_cents: 7000, actual_amount_cents: null }),
  ]
  // bills total = 1943+646+200+353+130+110+737+400+12+70 = 4601.00 -> 460100 cents
  const flexTransactions = [flex(55000)] // flex fully spent == target

  const summary = computeMonthSummary({
    incomeCents: 586462,
    bills,
    flexTargetCents: 55000,
    flexTransactions,
    savingsTargetCents: 60000,
  })

  it('bills total matches expected $4601.00', () => {
    expect(summary.billsTotalCents).toBe(460100)
  })

  it('savings potential hits the target when there is enough available', () => {
    expect(summary.savingsPotentialCents).toBe(60000)
  })

  it('buffer matches the documented ~$113.62', () => {
    expect(summary.bufferCents).toBe(11362)
  })

  it('reconciles exactly: income = bills + flex + savings + buffer', () => {
    const reconciled = summary.billsTotalCents + summary.flexSpentCents + summary.savingsPotentialCents + summary.bufferCents
    expect(reconciled).toBe(summary.incomeCents)
  })

  it('is not flagged over budget', () => {
    expect(summary.isOverBudget).toBe(false)
  })
})

describe('computeMonthSummary — electric bill comes in under expected', () => {
  it('increases available money by the exact difference', () => {
    const pendingBills: MonthlyBill[] = [bill({ id: '1', name: 'Electric', status: 'pending', expected_amount_cents: 40000 })]
    const confirmedLower: MonthlyBill[] = [bill({ id: '1', name: 'Electric', status: 'confirmed', expected_amount_cents: 40000, actual_amount_cents: 32742 })]

    const before = computeMonthSummary({ incomeCents: 586462, bills: pendingBills, flexTargetCents: 0, flexTransactions: [], savingsTargetCents: 0 })
    const after = computeMonthSummary({ incomeCents: 586462, bills: confirmedLower, flexTargetCents: 0, flexTransactions: [], savingsTargetCents: 0 })

    expect(after.availableCents - before.availableCents).toBe(7258) // $72.58
  })
})

describe('computeMonthSummary — over budget never hides negative numbers', () => {
  it('zeroes savings and shows a negative buffer when expenses exceed income', () => {
    const bills: MonthlyBill[] = [bill({ status: 'confirmed', expected_amount_cents: 500000, actual_amount_cents: 600000 })]
    const summary = computeMonthSummary({
      incomeCents: 586462,
      bills,
      flexTargetCents: 55000,
      flexTransactions: [flex(20000)],
      savingsTargetCents: 60000,
    })

    expect(summary.availableCents).toBeLessThan(0)
    expect(summary.savingsPotentialCents).toBe(0)
    expect(summary.bufferCents).toBeLessThan(0)
    expect(summary.isOverBudget).toBe(true)

    const reconciled = summary.billsTotalCents + summary.flexSpentCents + summary.savingsPotentialCents + summary.bufferCents
    expect(reconciled).toBe(summary.incomeCents)
  })
})

describe('computeMonthSummary — buffer absorbs overspend before savings does', () => {
  // Single bill standing in for the full $4601 core-bills total (including
  // Groceries), so bumping its actual amount simulates an overspend without
  // double-counting Groceries as a separate line.
  // Baseline: available = 586462 - 460100 - 55000 = 71362 -> savings hits full
  // target (60000), buffer is the last 11362.
  function billsTotaling(actualCents: number): MonthlyBill[] {
    return [bill({ expected_amount_cents: 460100, status: 'confirmed', actual_amount_cents: actualCents })]
  }

  it('a small overspend (still above the savings target) only eats into buffer, savings stays at goal', () => {
    const bills = billsTotaling(460100 + 5000) // $50 over
    const summary = computeMonthSummary({ incomeCents: 586462, bills, flexTargetCents: 55000, flexTransactions: [flex(55000)], savingsTargetCents: 60000 })

    expect(summary.savingsPotentialCents).toBe(60000) // untouched
    expect(summary.bufferCents).toBe(11362 - 5000) // absorbs the whole overspend
  })

  it('once buffer would go negative, savings itself starts shrinking instead', () => {
    const bills = billsTotaling(460100 + 20000) // $200 over — more than the $113.62 buffer can absorb
    const summary = computeMonthSummary({ incomeCents: 586462, bills, flexTargetCents: 55000, flexTransactions: [flex(55000)], savingsTargetCents: 60000 })

    expect(summary.bufferCents).toBe(0) // buffer floors at 0, never negative while savings can still absorb more
    expect(summary.savingsPotentialCents).toBeLessThan(60000) // savings took the excess instead
    expect(summary.savingsPotentialCents).toBe(71362 - 20000)
  })

  it('once savings is fully exhausted too, buffer finally goes negative and isOverBudget flips on', () => {
    const bills = billsTotaling(460100 + 100000) // $1000 over — blows through the entire $600 savings goal too
    const summary = computeMonthSummary({ incomeCents: 586462, bills, flexTargetCents: 55000, flexTransactions: [flex(55000)], savingsTargetCents: 60000 })

    expect(summary.savingsPotentialCents).toBe(0)
    expect(summary.bufferCents).toBeLessThan(0)
    expect(summary.isOverBudget).toBe(true)
  })
})

describe('flexRemainingCents', () => {
  it('goes negative when overspent, without clamping', () => {
    expect(flexRemainingCents(55000, [flex(60000)])).toBe(-5000)
  })
})
