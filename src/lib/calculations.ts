import type { FlexTransaction, MonthlyBill } from '../types/models'

/**
 * Single source of truth for all budget math. Every figure shown on the
 * dashboard is derived from these functions so the numbers always reconcile:
 *
 *   income = billsTotal + flexSpent + savingsPotential + buffer
 */

/** For pending bills, use the expected amount. For confirmed/paid, use the actual amount. */
export function effectiveBillAmountCents(bill: Pick<MonthlyBill, 'status' | 'expected_amount_cents' | 'actual_amount_cents'>): number {
  if (bill.status === 'pending') return bill.expected_amount_cents
  return bill.actual_amount_cents ?? bill.expected_amount_cents
}

export function billsTotalCents(bills: MonthlyBill[]): number {
  return bills.reduce((sum, b) => sum + effectiveBillAmountCents(b), 0)
}

export function billsPaidTotalCents(bills: MonthlyBill[]): number {
  return bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + effectiveBillAmountCents(b), 0)
}

export function billsOutstandingTotalCents(bills: MonthlyBill[]): number {
  return bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + effectiveBillAmountCents(b), 0)
}

export function confirmedBillsCount(bills: MonthlyBill[]): number {
  return bills.filter((b) => b.status === 'confirmed' || b.status === 'paid').length
}

export function paidBillsCount(bills: MonthlyBill[]): number {
  return bills.filter((b) => b.status === 'paid').length
}

export function flexSpentCents(transactions: FlexTransaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount_cents, 0)
}

export function flexRemainingCents(flexTargetCents: number, transactions: FlexTransaction[]): number {
  return flexTargetCents - flexSpentCents(transactions)
}

export interface MonthSummary {
  incomeCents: number
  billsTotalCents: number
  billsPaidCents: number
  billsOutstandingCents: number
  flexSpentCents: number
  flexTargetCents: number
  flexRemainingCents: number
  /** income - bills - flexSpent; can be negative when over budget */
  availableCents: number
  /** portion of `availableCents` allocated toward the savings goal, capped at the target and never negative */
  savingsPotentialCents: number
  savingsTargetCents: number
  /** whatever is left after bills, flex spending, and savings — can be negative when over budget */
  bufferCents: number
  isOverBudget: boolean
}

export function computeMonthSummary(params: {
  incomeCents: number
  bills: MonthlyBill[]
  flexTargetCents: number
  flexTransactions: FlexTransaction[]
  savingsTargetCents: number
}): MonthSummary {
  const { incomeCents, bills, flexTargetCents, flexTransactions, savingsTargetCents } = params

  const bTotal = billsTotalCents(bills)
  const fSpent = flexSpentCents(flexTransactions)
  const available = incomeCents - bTotal - fSpent

  const savingsPotential = Math.min(savingsTargetCents, Math.max(available, 0))
  const buffer = available - savingsPotential

  return {
    incomeCents,
    billsTotalCents: bTotal,
    billsPaidCents: billsPaidTotalCents(bills),
    billsOutstandingCents: billsOutstandingTotalCents(bills),
    flexSpentCents: fSpent,
    flexTargetCents,
    flexRemainingCents: flexTargetCents - fSpent,
    availableCents: available,
    savingsPotentialCents: savingsPotential,
    savingsTargetCents,
    bufferCents: buffer,
    isOverBudget: available < 0,
  }
}

/** 0-1 fraction of the flex fund used, clamped for progress bars/gauges. */
export function flexUsedFraction(flexTargetCents: number, spentCents: number): number {
  if (flexTargetCents <= 0) return spentCents > 0 ? 1 : 0
  return Math.min(Math.max(spentCents / flexTargetCents, 0), 1)
}

export function savingsGoalFraction(savingsTargetCents: number, savingsPotentialCents: number): number {
  if (savingsTargetCents <= 0) return 0
  return Math.min(Math.max(savingsPotentialCents / savingsTargetCents, 0), 1)
}
