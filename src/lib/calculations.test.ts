import { describe, expect, it } from 'vitest'
import { computeMonthSummary, computePlannedSummary, effectiveBillAmountCents, flexRemainingCents } from './calculations'
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

describe('computePlannedSummary — summer defaults reconcile exactly', () => {
  const plannedBills: MonthlyBill[] = [
    bill({ id: '1', name: 'Mortgage', expected_amount_cents: 194300 }),
    bill({ id: '2', name: 'Tesla', expected_amount_cents: 64600 }),
    bill({ id: '3', name: 'Solar', expected_amount_cents: 20000 }),
    bill({ id: '4', name: 'Car Insurance', expected_amount_cents: 35300 }),
    bill({ id: '5', name: 'Comcast', expected_amount_cents: 13000 }),
    bill({ id: '6', name: 'Water', expected_amount_cents: 11000 }),
    bill({ id: '7', name: 'Groceries', expected_amount_cents: 73700, is_tracked: true }),
    bill({ id: '8', name: 'Electric', expected_amount_cents: 40000 }),
    bill({ id: '9', name: 'Gas', expected_amount_cents: 1200 }),
    bill({ id: '10', name: 'Streaming', expected_amount_cents: 7000 }),
  ]
  // matches the documented $4601.00 core bill total regardless of any actual/confirmed amounts
  const plan = computePlannedSummary({ incomeCents: 586462, bills: plannedBills, flexTargetCents: 55000, savingsTargetCents: 60000 })

  it('bills planned total matches expected $4601.00', () => {
    expect(plan.billsPlannedTotalCents).toBe(460100)
  })

  it('planned savings hits the full target', () => {
    expect(plan.plannedSavingsCents).toBe(60000)
  })

  it('planned buffer matches the documented ~$113.62', () => {
    expect(plan.plannedBufferCents).toBe(11362)
  })

  it('reconciles exactly: income = plannedBills + flexTarget + plannedSavings + plannedBuffer', () => {
    const reconciled = plan.billsPlannedTotalCents + plan.flexTargetCents + plan.plannedSavingsCents + plan.plannedBufferCents
    expect(reconciled).toBe(plan.incomeCents)
  })

  it('is not flagged over budget', () => {
    expect(plan.isPlanOverBudget).toBe(false)
  })

  it('ignores actual/confirmed amounts entirely', () => {
    const withActuals = plannedBills.map((b) => ({ ...b, status: 'confirmed' as const, actual_amount_cents: b.expected_amount_cents + 100000 }))
    const planWithActuals = computePlannedSummary({ incomeCents: 586462, bills: withActuals, flexTargetCents: 55000, savingsTargetCents: 60000 })
    expect(planWithActuals.billsPlannedTotalCents).toBe(plan.billsPlannedTotalCents)
  })
})

describe('computePlannedSummary — plan that does not fit the income', () => {
  it('flags over budget and shows a negative buffer instead of hiding it', () => {
    const bills: MonthlyBill[] = [bill({ expected_amount_cents: 600000 })]
    const plan = computePlannedSummary({ incomeCents: 586462, bills, flexTargetCents: 55000, savingsTargetCents: 60000 })

    expect(plan.isPlanOverBudget).toBe(true)
    expect(plan.plannedSavingsCents).toBe(0)
    expect(plan.plannedBufferCents).toBeLessThan(0)
  })
})

describe('flexRemainingCents', () => {
  it('goes negative when overspent, without clamping', () => {
    expect(flexRemainingCents(55000, [flex(60000)])).toBe(-5000)
  })
})
