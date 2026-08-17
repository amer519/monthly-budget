export type Season = 'summer' | 'winter'
export type BillType = 'fixed' | 'variable'
export type BillStatus = 'pending' | 'confirmed' | 'paid'
export type FlexTagType = 'vendor' | 'person' | 'category'

/** All money fields are integer cents to avoid floating point drift. */

export interface Profile {
  id: string
  user_id: string
  monthly_income_cents: number
  summer_gas_cents: number
  summer_flex_target_cents: number
  summer_savings_target_cents: number
  winter_gas_cents: number
  winter_flex_target_cents: number
  winter_savings_target_cents: number
  created_at: string
}

export interface BillTemplate {
  id: string
  user_id: string
  name: string
  default_amount_cents: number
  type: BillType
  active: boolean
  sort_order: number
  is_gas: boolean
  created_at: string
}

export interface MonthlyBudget {
  id: string
  user_id: string
  month: number // 1-12
  year: number
  season: Season
  income_cents: number
  flex_target_cents: number
  savings_target_cents: number
  created_at: string
}

export interface MonthlyBill {
  id: string
  monthly_budget_id: string
  user_id: string
  bill_template_id: string | null
  name: string
  type: BillType
  expected_amount_cents: number
  actual_amount_cents: number | null
  status: BillStatus
  sort_order: number
  created_at: string
}

export interface FlexTransaction {
  id: string
  monthly_budget_id: string
  user_id: string
  description: string
  amount_cents: number
  category: string | null
  person_tag: string | null
  transaction_date: string // ISO date
  created_at: string
}

export interface FlexTag {
  id: string
  user_id: string
  tag_type: FlexTagType
  label: string
  sort_order: number
  created_at: string
}

export interface MonthWithData {
  budget: MonthlyBudget
  bills: MonthlyBill[]
  flexTransactions: FlexTransaction[]
}
