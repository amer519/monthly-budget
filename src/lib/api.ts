import { supabase } from './supabaseClient'
import type { BillPurchase, BillTemplate, FlexTag, FlexTagType, FlexTransaction, MonthlyBill, MonthlyBudget, Profile, Season } from '../types/models'

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('user_id', userId).select().single()
  if (error) throw error
  return data as Profile
}

// ---------------------------------------------------------------------------
// bill_templates
// ---------------------------------------------------------------------------

export async function fetchBillTemplates(userId: string): Promise<BillTemplate[]> {
  const { data, error } = await supabase
    .from('bill_templates')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as BillTemplate[]
}

export async function createBillTemplate(
  userId: string,
  input: Pick<BillTemplate, 'name' | 'default_amount_cents' | 'type' | 'sort_order'> & Partial<Pick<BillTemplate, 'active' | 'is_gas'>>,
): Promise<BillTemplate> {
  const { data, error } = await supabase
    .from('bill_templates')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as BillTemplate
}

export async function updateBillTemplate(id: string, patch: Partial<BillTemplate>): Promise<BillTemplate> {
  const { data, error } = await supabase.from('bill_templates').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as BillTemplate
}

export async function deleteBillTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('bill_templates').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// monthly_budgets
// ---------------------------------------------------------------------------

export async function fetchMonthlyBudget(userId: string, year: number, month: number): Promise<MonthlyBudget | null> {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data as MonthlyBudget | null
}

export async function fetchMostRecentBudgetBefore(userId: string, year: number, month: number): Promise<MonthlyBudget | null> {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as MonthlyBudget | null
}

export async function fetchAllMonthlyBudgets(userId: string): Promise<MonthlyBudget[]> {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data as MonthlyBudget[]
}

export async function createMonthlyBudget(input: {
  user_id: string
  year: number
  month: number
  season: Season
  income_cents: number
  flex_target_cents: number
  savings_target_cents: number
}): Promise<MonthlyBudget> {
  const { data, error } = await supabase.from('monthly_budgets').insert(input).select().single()
  if (error) throw error
  return data as MonthlyBudget
}

export async function updateMonthlyBudget(id: string, patch: Partial<MonthlyBudget>): Promise<MonthlyBudget> {
  const { data, error } = await supabase.from('monthly_budgets').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as MonthlyBudget
}

// ---------------------------------------------------------------------------
// monthly_bills
// ---------------------------------------------------------------------------

export async function fetchMonthlyBills(monthlyBudgetId: string): Promise<MonthlyBill[]> {
  const { data, error } = await supabase
    .from('monthly_bills')
    .select('*')
    .eq('monthly_budget_id', monthlyBudgetId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as MonthlyBill[]
}

export async function createMonthlyBills(
  rows: Array<{
    monthly_budget_id: string
    user_id: string
    bill_template_id: string | null
    name: string
    type: 'fixed' | 'variable'
    expected_amount_cents: number
    sort_order: number
    is_tracked?: boolean
  }>,
): Promise<MonthlyBill[]> {
  const { data, error } = await supabase.from('monthly_bills').insert(rows).select()
  if (error) throw error
  return data as MonthlyBill[]
}

export async function updateMonthlyBill(id: string, patch: Partial<MonthlyBill>): Promise<MonthlyBill> {
  const { data, error } = await supabase.from('monthly_bills').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as MonthlyBill
}

// ---------------------------------------------------------------------------
// bill_purchases — quick-add line items for tracked bills (Groceries, Household Items)
// ---------------------------------------------------------------------------

export async function fetchBillPurchases(monthlyBudgetId: string): Promise<BillPurchase[]> {
  const { data, error } = await supabase
    .from('bill_purchases')
    .select('*')
    .eq('monthly_budget_id', monthlyBudgetId)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as BillPurchase[]
}

export async function createBillPurchase(input: {
  monthly_bill_id: string
  monthly_budget_id: string
  user_id: string
  description: string | null
  amount_cents: number
  purchase_date: string
}): Promise<BillPurchase> {
  const { data, error } = await supabase.from('bill_purchases').insert(input).select().single()
  if (error) throw error
  return data as BillPurchase
}

export async function deleteBillPurchase(id: string): Promise<void> {
  const { error } = await supabase.from('bill_purchases').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// flex_transactions
// ---------------------------------------------------------------------------

export async function fetchFlexTransactions(monthlyBudgetId: string): Promise<FlexTransaction[]> {
  const { data, error } = await supabase
    .from('flex_transactions')
    .select('*')
    .eq('monthly_budget_id', monthlyBudgetId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as FlexTransaction[]
}

export async function createFlexTransaction(input: {
  monthly_budget_id: string
  user_id: string
  description: string
  amount_cents: number
  category: string | null
  person_tag: string | null
  transaction_date: string
}): Promise<FlexTransaction> {
  const { data, error } = await supabase.from('flex_transactions').insert(input).select().single()
  if (error) throw error
  return data as FlexTransaction
}

export async function deleteFlexTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('flex_transactions').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// flex_tags — user-editable quick-pick lists (vendor / person / category)
// ---------------------------------------------------------------------------

export async function fetchFlexTags(userId: string): Promise<FlexTag[]> {
  const { data, error } = await supabase
    .from('flex_tags')
    .select('*')
    .eq('user_id', userId)
    .order('tag_type', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as FlexTag[]
}

export async function createFlexTag(userId: string, input: { tag_type: FlexTagType; label: string; sort_order: number }): Promise<FlexTag> {
  const { data, error } = await supabase
    .from('flex_tags')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as FlexTag
}

export async function updateFlexTag(id: string, patch: Partial<Pick<FlexTag, 'label' | 'sort_order'>>): Promise<FlexTag> {
  const { data, error } = await supabase.from('flex_tags').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as FlexTag
}

export async function deleteFlexTag(id: string): Promise<void> {
  const { error } = await supabase.from('flex_tags').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// history aggregation — all bills + flex transactions for every month, used
// by the History/Insights screen. Small personal dataset, so one round trip
// per table is simpler and fast enough rather than a server-side view.
// ---------------------------------------------------------------------------

export async function fetchAllBillsForUser(userId: string): Promise<MonthlyBill[]> {
  const { data, error } = await supabase.from('monthly_bills').select('*').eq('user_id', userId)
  if (error) throw error
  return data as MonthlyBill[]
}

export async function fetchAllFlexTransactionsForUser(userId: string): Promise<FlexTransaction[]> {
  const { data, error } = await supabase.from('flex_transactions').select('*').eq('user_id', userId)
  if (error) throw error
  return data as FlexTransaction[]
}
