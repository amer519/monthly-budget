import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import * as api from '../lib/api'
import { addMonths, guessSeason } from '../lib/dates'
import type { BillPurchase, BillStatus, BillTemplate, FlexTag, FlexTagType, FlexTransaction, MonthlyBill, MonthlyBudget, Profile, Season } from '../types/models'

interface BudgetContextValue {
  loading: boolean
  error: string | null

  profile: Profile | null
  billTemplates: BillTemplate[]
  flexTags: FlexTag[]

  viewedYear: number
  viewedMonth: number
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  goToCurrentMonth: () => void
  goToMonth: (year: number, month: number) => void
  isViewingCurrentMonth: boolean

  budget: MonthlyBudget | null
  bills: MonthlyBill[]
  flexTransactions: FlexTransaction[]
  billPurchases: BillPurchase[]

  refresh: () => Promise<void>

  changeSeason: (season: Season) => Promise<void>
  updateBillActual: (billId: string, actualCents: number) => Promise<void>
  markBillNoChange: (billId: string) => Promise<void>
  markBillPaid: (billId: string) => Promise<void>
  setBillStatus: (billId: string, status: BillStatus) => Promise<void>
  addFlexTransaction: (input: { description: string; amountCents: number; category: string | null; personTag: string | null; date: string }) => Promise<void>
  deleteFlexTransaction: (id: string) => Promise<void>

  addBillPurchase: (billId: string, input: { description: string | null; amountCents: number; date: string }) => Promise<void>
  deleteBillPurchase: (id: string) => Promise<void>

  updateIncome: (incomeCents: number) => Promise<void>
  updateSeasonDefaults: (season: Season, patch: { gasCents?: number; flexTargetCents?: number; savingsTargetCents?: number }) => Promise<void>

  addBillTemplate: (input: { name: string; defaultAmountCents: number; type: 'fixed' | 'variable' }) => Promise<void>
  updateBillTemplateFields: (id: string, patch: Partial<Pick<BillTemplate, 'name' | 'default_amount_cents' | 'type' | 'active' | 'is_tracked'>>) => Promise<void>
  deleteBillTemplateById: (id: string) => Promise<void>
  reorderBillTemplates: (orderedIds: string[]) => Promise<void>

  addFlexTag: (tagType: FlexTagType, label: string) => Promise<void>
  renameFlexTag: (id: string, label: string) => Promise<void>
  deleteFlexTag: (id: string) => Promise<void>
  reorderFlexTags: (tagType: FlexTagType, orderedIds: string[]) => Promise<void>
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

const now = new Date()
const CURRENT_YEAR = now.getFullYear()
const CURRENT_MONTH = now.getMonth() + 1

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [billTemplates, setBillTemplates] = useState<BillTemplate[]>([])
  const [flexTags, setFlexTags] = useState<FlexTag[]>([])

  const [viewedYear, setViewedYear] = useState(CURRENT_YEAR)
  const [viewedMonth, setViewedMonth] = useState(CURRENT_MONTH)

  const [budget, setBudget] = useState<MonthlyBudget | null>(null)
  const [bills, setBills] = useState<MonthlyBill[]>([])
  const [flexTransactions, setFlexTransactions] = useState<FlexTransaction[]>([])
  const [billPurchases, setBillPurchases] = useState<BillPurchase[]>([])

  const loadStaticData = useCallback(async () => {
    if (!user) return
    const [p, templates, tags] = await Promise.all([api.fetchProfile(user.id), api.fetchBillTemplates(user.id), api.fetchFlexTags(user.id)])
    setProfile(p)
    setBillTemplates(templates)
    setFlexTags(tags)
    return { profile: p, templates }
  }, [user])

  /**
   * Inserts a monthly_bills row for any active template that doesn't have
   * one yet in this month. Without this, a bill added (or reactivated) in
   * Settings after the current month's budget already exists would only
   * ever show up starting the following month.
   */
  const syncMissingBillsForMonth = useCallback(
    async (monthBudget: MonthlyBudget, templates: BillTemplate[], existingBills: MonthlyBill[]): Promise<MonthlyBill[]> => {
      const existingTemplateIds = new Set(existingBills.map((b) => b.bill_template_id).filter(Boolean))
      const missing = templates.filter((t) => t.active && !existingTemplateIds.has(t.id))
      if (missing.length === 0) return existingBills

      const gasCents = monthBudget.season === 'summer' ? profile?.summer_gas_cents : profile?.winter_gas_cents
      const created = await api.createMonthlyBills(
        missing.map((t) => ({
          monthly_budget_id: monthBudget.id,
          user_id: monthBudget.user_id,
          bill_template_id: t.id,
          name: t.name,
          type: t.type,
          expected_amount_cents: t.is_gas ? (gasCents ?? t.default_amount_cents) : t.default_amount_cents,
          sort_order: t.sort_order,
          is_tracked: t.is_tracked,
        })),
      )
      return [...existingBills, ...created].sort((a, b) => a.sort_order - b.sort_order)
    },
    [profile],
  )

  const loadMonth = useCallback(
    async (year: number, month: number, profileArg?: Profile, templatesArg?: BillTemplate[]) => {
      if (!user) return
      const activeProfile = profileArg ?? profile
      const activeTemplates = templatesArg ?? billTemplates
      if (!activeProfile) return

      let monthBudget = await api.fetchMonthlyBudget(user.id, year, month)

      if (!monthBudget) {
        const previous = await api.fetchMostRecentBudgetBefore(user.id, year, month)
        const season: Season = previous?.season ?? guessSeason(month)
        const flexTargetCents = season === 'summer' ? activeProfile.summer_flex_target_cents : activeProfile.winter_flex_target_cents
        const savingsTargetCents = season === 'summer' ? activeProfile.summer_savings_target_cents : activeProfile.winter_savings_target_cents
        const gasCents = season === 'summer' ? activeProfile.summer_gas_cents : activeProfile.winter_gas_cents

        monthBudget = await api.createMonthlyBudget({
          user_id: user.id,
          year,
          month,
          season,
          income_cents: activeProfile.monthly_income_cents,
          flex_target_cents: flexTargetCents,
          savings_target_cents: savingsTargetCents,
        })

        const activeTemplatesList = activeTemplates.filter((t) => t.active)
        if (activeTemplatesList.length > 0) {
          await api.createMonthlyBills(
            activeTemplatesList.map((t) => ({
              monthly_budget_id: monthBudget!.id,
              user_id: user.id,
              bill_template_id: t.id,
              name: t.name,
              type: t.type,
              expected_amount_cents: t.is_gas ? gasCents : t.default_amount_cents,
              sort_order: t.sort_order,
              is_tracked: t.is_tracked,
            })),
          )
        }
      }

      let [monthBills, monthFlex, monthPurchases] = await Promise.all([
        api.fetchMonthlyBills(monthBudget.id),
        api.fetchFlexTransactions(monthBudget.id),
        api.fetchBillPurchases(monthBudget.id),
      ])

      if (year === CURRENT_YEAR && month === CURRENT_MONTH) {
        monthBills = await syncMissingBillsForMonth(monthBudget, activeTemplates, monthBills)
      }

      setBudget(monthBudget)
      setBills(monthBills)
      setFlexTransactions(monthFlex)
      setBillPurchases(monthPurchases)
    },
    [user, profile, billTemplates, syncMissingBillsForMonth],
  )

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const staticData = await loadStaticData()
        if (cancelled || !staticData) return
        await loadMonth(viewedYear, viewedMonth, staticData.profile, staticData.templates)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load budget data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user || !profile) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        await loadMonth(viewedYear, viewedMonth)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load month')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedYear, viewedMonth])

  const refresh = useCallback(async () => {
    if (!budget) return
    const [monthBills, monthFlex, monthPurchases] = await Promise.all([
      api.fetchMonthlyBills(budget.id),
      api.fetchFlexTransactions(budget.id),
      api.fetchBillPurchases(budget.id),
    ])
    setBills(monthBills)
    setFlexTransactions(monthFlex)
    setBillPurchases(monthPurchases)
  }, [budget])

  const goToPreviousMonth = useCallback(() => {
    const { year, month } = addMonths(viewedYear, viewedMonth, -1)
    setViewedYear(year)
    setViewedMonth(month)
  }, [viewedYear, viewedMonth])

  const goToNextMonth = useCallback(() => {
    const { year, month } = addMonths(viewedYear, viewedMonth, 1)
    setViewedYear(year)
    setViewedMonth(month)
  }, [viewedYear, viewedMonth])

  const goToCurrentMonth = useCallback(() => {
    setViewedYear(CURRENT_YEAR)
    setViewedMonth(CURRENT_MONTH)
  }, [])

  const goToMonth = useCallback((year: number, month: number) => {
    setViewedYear(year)
    setViewedMonth(month)
  }, [])

  const isViewingCurrentMonth = viewedYear === CURRENT_YEAR && viewedMonth === CURRENT_MONTH

  const changeSeason = useCallback(
    async (season: Season) => {
      if (!budget || !profile || !user) return
      const flexTargetCents = season === 'summer' ? profile.summer_flex_target_cents : profile.winter_flex_target_cents
      const savingsTargetCents = season === 'summer' ? profile.summer_savings_target_cents : profile.winter_savings_target_cents
      const gasCents = season === 'summer' ? profile.summer_gas_cents : profile.winter_gas_cents

      const updated = await api.updateMonthlyBudget(budget.id, {
        season,
        flex_target_cents: flexTargetCents,
        savings_target_cents: savingsTargetCents,
      })
      setBudget(updated)

      const gasBill = bills.find((b) => b.name.toLowerCase() === 'gas')
      if (gasBill && gasBill.status === 'pending') {
        const updatedBill = await api.updateMonthlyBill(gasBill.id, { expected_amount_cents: gasCents })
        setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)))
      }
    },
    [budget, profile, user, bills],
  )

  const updateBillActual = useCallback(async (billId: string, actualCents: number) => {
    const updated = await api.updateMonthlyBill(billId, { actual_amount_cents: actualCents, status: 'confirmed' })
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [])

  const markBillNoChange = useCallback(async (billId: string) => {
    const bill = bills.find((b) => b.id === billId)
    if (!bill) return
    const updated = await api.updateMonthlyBill(billId, { actual_amount_cents: bill.expected_amount_cents, status: 'confirmed' })
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [bills])

  const markBillPaid = useCallback(async (billId: string) => {
    const bill = bills.find((b) => b.id === billId)
    if (!bill) return
    const patch: Partial<MonthlyBill> = { status: 'paid' }
    if (bill.actual_amount_cents === null) patch.actual_amount_cents = bill.expected_amount_cents
    const updated = await api.updateMonthlyBill(billId, patch)
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [bills])

  const setBillStatus = useCallback(async (billId: string, status: BillStatus) => {
    const updated = await api.updateMonthlyBill(billId, { status })
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [])

  const addBillPurchase = useCallback(
    async (billId: string, input: { description: string | null; amountCents: number; date: string }) => {
      if (!budget || !user) return
      const bill = bills.find((b) => b.id === billId)
      if (!bill) return

      const created = await api.createBillPurchase({
        monthly_bill_id: billId,
        monthly_budget_id: budget.id,
        user_id: user.id,
        description: input.description,
        amount_cents: input.amountCents,
        purchase_date: input.date,
      })
      setBillPurchases((prev) => [created, ...prev])

      const newTotal = (bill.actual_amount_cents ?? 0) + input.amountCents
      const patch: Partial<MonthlyBill> = { actual_amount_cents: newTotal }
      if (bill.status === 'pending') patch.status = 'confirmed'
      const updatedBill = await api.updateMonthlyBill(billId, patch)
      setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)))
    },
    [budget, user, bills],
  )

  const deleteBillPurchaseFn = useCallback(
    async (id: string) => {
      const purchase = billPurchases.find((p) => p.id === id)
      if (!purchase) return
      const bill = bills.find((b) => b.id === purchase.monthly_bill_id)

      await api.deleteBillPurchase(id)
      setBillPurchases((prev) => prev.filter((p) => p.id !== id))

      if (bill) {
        const newTotal = Math.max(0, (bill.actual_amount_cents ?? 0) - purchase.amount_cents)
        const updatedBill = await api.updateMonthlyBill(bill.id, { actual_amount_cents: newTotal })
        setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)))
      }
    },
    [billPurchases, bills],
  )

  const addFlexTransaction = useCallback(
    async (input: { description: string; amountCents: number; category: string | null; personTag: string | null; date: string }) => {
      if (!budget || !user) return
      const created = await api.createFlexTransaction({
        monthly_budget_id: budget.id,
        user_id: user.id,
        description: input.description,
        amount_cents: input.amountCents,
        category: input.category,
        person_tag: input.personTag,
        transaction_date: input.date,
      })
      setFlexTransactions((prev) => [created, ...prev])
    },
    [budget, user],
  )

  const deleteFlexTransactionFn = useCallback(async (id: string) => {
    await api.deleteFlexTransaction(id)
    setFlexTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateIncome = useCallback(
    async (incomeCents: number) => {
      if (!user) return
      const updated = await api.updateProfile(user.id, { monthly_income_cents: incomeCents })
      setProfile(updated)
      if (budget && isViewingCurrentMonth) {
        const updatedBudget = await api.updateMonthlyBudget(budget.id, { income_cents: incomeCents })
        setBudget(updatedBudget)
      }
    },
    [user, budget, isViewingCurrentMonth],
  )

  const updateSeasonDefaults = useCallback(
    async (season: Season, patch: { gasCents?: number; flexTargetCents?: number; savingsTargetCents?: number }) => {
      if (!user) return
      const dbPatch: Partial<Profile> = {}
      if (patch.gasCents !== undefined) dbPatch[season === 'summer' ? 'summer_gas_cents' : 'winter_gas_cents'] = patch.gasCents
      if (patch.flexTargetCents !== undefined)
        dbPatch[season === 'summer' ? 'summer_flex_target_cents' : 'winter_flex_target_cents'] = patch.flexTargetCents
      if (patch.savingsTargetCents !== undefined)
        dbPatch[season === 'summer' ? 'summer_savings_target_cents' : 'winter_savings_target_cents'] = patch.savingsTargetCents
      const updated = await api.updateProfile(user.id, dbPatch)
      setProfile(updated)
    },
    [user],
  )

  const addBillTemplate = useCallback(
    async (input: { name: string; defaultAmountCents: number; type: 'fixed' | 'variable' }) => {
      if (!user) return
      const sortOrder = billTemplates.length > 0 ? Math.max(...billTemplates.map((t) => t.sort_order)) + 1 : 1
      const created = await api.createBillTemplate(user.id, {
        name: input.name,
        default_amount_cents: input.defaultAmountCents,
        type: input.type,
        sort_order: sortOrder,
      })
      setBillTemplates((prev) => [...prev, created])
      if (budget && isViewingCurrentMonth) {
        const synced = await syncMissingBillsForMonth(budget, [created], bills)
        setBills(synced)
      }
    },
    [user, billTemplates, budget, isViewingCurrentMonth, bills, syncMissingBillsForMonth],
  )

  const updateBillTemplateFields = useCallback(
    async (id: string, patch: Partial<Pick<BillTemplate, 'name' | 'default_amount_cents' | 'type' | 'active' | 'is_tracked'>>) => {
      const updated = await api.updateBillTemplate(id, patch)
      setBillTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (patch.active === true && budget && isViewingCurrentMonth) {
        const synced = await syncMissingBillsForMonth(budget, [updated], bills)
        setBills(synced)
      }
    },
    [budget, isViewingCurrentMonth, bills, syncMissingBillsForMonth],
  )

  const deleteBillTemplateById = useCallback(async (id: string) => {
    await api.deleteBillTemplate(id)
    setBillTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const reorderBillTemplates = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => api.updateBillTemplate(id, { sort_order: index + 1 }))
    const updated = await Promise.all(updates)
    setBillTemplates((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]))
      updated.forEach((t) => map.set(t.id, t))
      return orderedIds.map((id) => map.get(id)!).filter(Boolean)
    })
  }, [])

  const addFlexTag = useCallback(
    async (tagType: FlexTagType, label: string) => {
      if (!user) return
      const sameType = flexTags.filter((t) => t.tag_type === tagType)
      const sortOrder = sameType.length > 0 ? Math.max(...sameType.map((t) => t.sort_order)) + 1 : 1
      const created = await api.createFlexTag(user.id, { tag_type: tagType, label, sort_order: sortOrder })
      setFlexTags((prev) => [...prev, created])
    },
    [user, flexTags],
  )

  const renameFlexTag = useCallback(async (id: string, label: string) => {
    const updated = await api.updateFlexTag(id, { label })
    setFlexTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  const deleteFlexTagFn = useCallback(async (id: string) => {
    await api.deleteFlexTag(id)
    setFlexTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const reorderFlexTags = useCallback(
    async (tagType: FlexTagType, orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => api.updateFlexTag(id, { sort_order: index + 1 }))
      const updated = await Promise.all(updates)
      setFlexTags((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]))
        updated.forEach((t) => map.set(t.id, t))
        const otherTypes = prev.filter((t) => t.tag_type !== tagType)
        const reordered = orderedIds.map((id) => map.get(id)!).filter(Boolean)
        return [...otherTypes, ...reordered]
      })
    },
    [],
  )

  const value = useMemo<BudgetContextValue>(
    () => ({
      loading,
      error,
      profile,
      billTemplates,
      flexTags,
      viewedYear,
      viewedMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      goToMonth,
      isViewingCurrentMonth,
      budget,
      bills,
      flexTransactions,
      billPurchases,
      refresh,
      changeSeason,
      updateBillActual,
      markBillNoChange,
      markBillPaid,
      setBillStatus,
      addBillPurchase,
      deleteBillPurchase: deleteBillPurchaseFn,
      addFlexTransaction,
      deleteFlexTransaction: deleteFlexTransactionFn,
      updateIncome,
      updateSeasonDefaults,
      addBillTemplate,
      updateBillTemplateFields,
      deleteBillTemplateById,
      reorderBillTemplates,
      addFlexTag,
      renameFlexTag,
      deleteFlexTag: deleteFlexTagFn,
      reorderFlexTags,
    }),
    [
      loading,
      error,
      profile,
      billTemplates,
      flexTags,
      viewedYear,
      viewedMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      goToMonth,
      isViewingCurrentMonth,
      budget,
      bills,
      flexTransactions,
      billPurchases,
      refresh,
      changeSeason,
      updateBillActual,
      markBillNoChange,
      markBillPaid,
      setBillStatus,
      addBillPurchase,
      deleteBillPurchaseFn,
      addFlexTransaction,
      deleteFlexTransactionFn,
      updateIncome,
      updateSeasonDefaults,
      addBillTemplate,
      updateBillTemplateFields,
      deleteBillTemplateById,
      reorderBillTemplates,
      addFlexTag,
      renameFlexTag,
      deleteFlexTagFn,
      reorderFlexTags,
    ],
  )

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}
