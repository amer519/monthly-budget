import { computeMonthSummary, type MonthSummary } from './calculations'
import type { FlexTransaction, MonthlyBill, MonthlyBudget } from '../types/models'

export interface MonthHistoryEntry {
  budget: MonthlyBudget
  bills: MonthlyBill[]
  flexTransactions: FlexTransaction[]
  summary: MonthSummary
}

export function buildMonthHistory(
  budgets: MonthlyBudget[],
  allBills: MonthlyBill[],
  allFlex: FlexTransaction[],
): MonthHistoryEntry[] {
  const billsByBudget = new Map<string, MonthlyBill[]>()
  for (const bill of allBills) {
    const list = billsByBudget.get(bill.monthly_budget_id) ?? []
    list.push(bill)
    billsByBudget.set(bill.monthly_budget_id, list)
  }

  const flexByBudget = new Map<string, FlexTransaction[]>()
  for (const tx of allFlex) {
    const list = flexByBudget.get(tx.monthly_budget_id) ?? []
    list.push(tx)
    flexByBudget.set(tx.monthly_budget_id, list)
  }

  return budgets
    .map((budget) => {
      const bills = billsByBudget.get(budget.id) ?? []
      const flexTransactions = flexByBudget.get(budget.id) ?? []
      const summary = computeMonthSummary({
        incomeCents: budget.income_cents,
        bills,
        flexTargetCents: budget.flex_target_cents,
        flexTransactions,
        savingsTargetCents: budget.savings_target_cents,
      })
      return { budget, bills, flexTransactions, summary }
    })
    .sort((a, b) => (a.budget.year !== b.budget.year ? b.budget.year - a.budget.year : b.budget.month - a.budget.month))
}
