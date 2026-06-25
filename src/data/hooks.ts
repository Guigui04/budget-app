/**
 * Data-access hooks (React Query). Each read/write branches on whether a real
 * Supabase project is configured; otherwise it uses the in-memory demo store.
 * This is the single place the UI talks to data — swapping to live Supabase
 * requires no UI changes.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useSession } from '@/store/session'
import {
  clearPendingBankAuth,
  completeBankAuth,
  listInstitutions,
  manualBankSync,
  type AspspChoice,
  type CompleteBankAuthParams,
  type CompleteBankAuthResult,
  type ManualSyncResult,
} from '@/lib/bank/client'
import { fetchQuotes } from '@/lib/market/client'
import { demoStore } from './demoStore'
import {
  mapAccount,
  mapAlert,
  mapBudget,
  mapCategory,
  mapConnection,
  mapGoal,
  mapHolding,
  mapNetWorthSnapshot,
  mapSubscription,
  mapTransaction,
  type Row,
} from './mappers'
import type {
  Account,
  Alert,
  BankConnection,
  Budget,
  Category,
  Goal,
  Holding,
  NetWorthSnapshot,
  Quote,
  Subscription,
  Transaction,
} from '@/types'

const live = isSupabaseConfigured && supabase

/** Foyer courant — requis sur les écritures car la policy RLS exige
 *  `household_id = current_household_id()` (aucun défaut côté table). */
function requireHouseholdId(): string {
  const id = useSession.getState().household?.id
  if (!id) throw new Error('Foyer introuvable.')
  return id
}

async function select<T>(table: string, map: (r: Row) => T, order?: string): Promise<T[]> {
  let q = supabase!.from(table).select('*')
  if (order) q = q.order(order, { ascending: false })
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(map)
}

export const keys = {
  accounts: ['accounts'] as const,
  transactions: ['transactions'] as const,
  categories: ['categories'] as const,
  budgets: ['budgets'] as const,
  goals: ['goals'] as const,
  subscriptions: ['subscriptions'] as const,
  alerts: ['alerts'] as const,
  connections: ['connections'] as const,
  holdings: ['holdings'] as const,
  networth: ['networth'] as const,
}

const bankSyncKeys = [
  keys.accounts,
  keys.connections,
  keys.transactions,
  keys.alerts,
  keys.goals,
  keys.holdings,
] as const

export function useAccounts() {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: async (): Promise<Account[]> =>
      live ? select('accounts', mapAccount) : demoStore.snapshot().accounts,
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: keys.transactions,
    queryFn: async (): Promise<Transaction[]> =>
      live ? select('transactions', mapTransaction, 'booking_date') : demoStore.snapshot().transactions,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async (): Promise<Category[]> =>
      live ? select('categories', mapCategory) : demoStore.snapshot().categories,
  })
}

export function useBudgets() {
  return useQuery({
    queryKey: keys.budgets,
    queryFn: async (): Promise<Budget[]> =>
      live ? select('budgets', mapBudget) : demoStore.snapshot().budgets,
  })
}

export function useGoals() {
  return useQuery({
    queryKey: keys.goals,
    queryFn: async (): Promise<Goal[]> => (live ? select('goals', mapGoal) : demoStore.snapshot().goals),
  })
}

export function useHoldings() {
  return useQuery({
    queryKey: keys.holdings,
    queryFn: async (): Promise<Holding[]> =>
      live ? select('investment_holdings', mapHolding) : demoStore.snapshot().holdings,
  })
}

export function useNetWorthSnapshots() {
  return useQuery({
    queryKey: keys.networth,
    queryFn: async (): Promise<NetWorthSnapshot[]> =>
      live ? select('networth_snapshots', mapNetWorthSnapshot, 'as_of') : demoStore.snapshot().netWorthSnapshots,
  })
}

/** Enregistre le point de valeur nette du jour (un seul par jour, upsert). */
export function useRecordNetWorth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ total, cash, invested }: { total: number; cash: number; invested: number }) => {
      const asOf = new Date().toISOString().slice(0, 10)
      if (live) {
        const { error } = await supabase!.from('networth_snapshots').upsert(
          { household_id: requireHouseholdId(), as_of: asOf, total, cash, invested },
          { onConflict: 'household_id,as_of' },
        )
        if (error) throw new Error(error.message)
      } else {
        demoStore.recordNetWorth(total, cash, invested)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.networth }),
  })
}

/**
 * Cours de marché des symboles fournis. Rafraîchi toutes les 15 min (free-tier
 * du fournisseur respecté grâce au cache côté Edge Function).
 */
export function useQuotes(symbols: string[]) {
  const sorted = [...new Set(symbols.filter(Boolean))].sort()
  return useQuery({
    queryKey: ['quotes', sorted] as const,
    queryFn: async (): Promise<Quote[]> => fetchQuotes(sorted),
    enabled: sorted.length > 0,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  })
}

export function useSubscriptions() {
  return useQuery({
    queryKey: keys.subscriptions,
    queryFn: async (): Promise<Subscription[]> =>
      live ? select('subscriptions', mapSubscription) : demoStore.snapshot().subscriptions,
  })
}

export function useAlerts() {
  return useQuery({
    queryKey: keys.alerts,
    queryFn: async (): Promise<Alert[]> =>
      live ? select('alerts', mapAlert, 'created_at') : demoStore.snapshot().alerts,
  })
}

export function useConnections() {
  return useQuery({
    queryKey: keys.connections,
    queryFn: async (): Promise<BankConnection[]> =>
      live ? select('bank_connections', mapConnection) : demoStore.snapshot().connections,
  })
}

// ── Mutations ───────────────────────────────────────────────

export function useCategorizeTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ txnId, categoryId }: { txnId: string; categoryId: string | null }) => {
      if (live) {
        const { error } = await supabase!
          .from('transactions')
          .update({ category_id: categoryId, category_source: 'manual' })
          .eq('id', txnId)
        if (error) throw new Error(error.message)
      } else {
        demoStore.categorizeTransaction(txnId, categoryId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.transactions }),
  })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ txn, categoryId }: { txn: Transaction; categoryId: string }) => {
      if (live) {
        await supabase!.from('categorization_rules').insert({
          household_id: txn.householdId,
          match_pattern: txn.cleanLabel,
          category_id: categoryId,
          priority: 1,
        })
        await supabase!
          .from('transactions')
          .update({ category_id: categoryId, category_source: 'rule' })
          .ilike('clean_label', `%${txn.cleanLabel}%`)
          .neq('category_source', 'manual')
      } else {
        demoStore.createRuleFromTransaction(txn, categoryId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.transactions }),
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, amount }: { categoryId: string; amount: number }) => {
      if (live) {
        const { error } = await supabase!
          .from('budgets')
          .upsert(
            { household_id: requireHouseholdId(), category_id: categoryId, amount, period: 'monthly' },
            { onConflict: 'household_id,category_id,period' },
          )
        if (error) throw new Error(error.message)
      } else {
        demoStore.upsertBudget(categoryId, amount)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.budgets }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (live) await supabase!.from('budgets').delete().eq('id', budgetId)
      else demoStore.deleteBudget(budgetId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.budgets }),
  })
}

export function useSaveGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'householdId' | 'id'> & { id?: string }) => {
      if (live) {
        const { error } = await supabase!.from('goals').upsert({
          id: goal.id,
          household_id: requireHouseholdId(),
          name: goal.name,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount,
          target_date: goal.targetDate,
          linked_account_id: goal.linkedAccountId,
          color: goal.color,
        })
        if (error) throw new Error(error.message)
      } else {
        demoStore.upsertGoal(goal as Goal)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  })
}

export function useAddGoalContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, amount, currentAmount }: { goalId: string; amount: number; currentAmount: number }) => {
      if (live) {
        await supabase!.from('goals').update({ current_amount: currentAmount + amount }).eq('id', goalId)
      } else {
        demoStore.addGoalContribution(goalId, amount)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goalId: string) => {
      if (live) await supabase!.from('goals').delete().eq('id', goalId)
      else demoStore.deleteGoal(goalId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  })
}

export type HoldingInput = Omit<Holding, 'householdId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string }

export function useSaveHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (holding: HoldingInput) => {
      if (live) {
        const { error } = await supabase!.from('investment_holdings').upsert({
          id: holding.id,
          household_id: requireHouseholdId(),
          kind: holding.kind,
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity,
          cost_basis: holding.costBasis,
          currency: holding.currency,
          envelope: holding.envelope,
          manual_value: holding.manualValue,
          linked_account_id: holding.linkedAccountId,
          updated_at: new Date().toISOString(),
        })
        if (error) throw new Error(error.message)
      } else {
        demoStore.upsertHolding(holding)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.holdings }),
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (holdingId: string) => {
      if (live) {
        const { error } = await supabase!.from('investment_holdings').delete().eq('id', holdingId)
        if (error) throw new Error(error.message)
      } else {
        demoStore.deleteHolding(holdingId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.holdings }),
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isConfirmed, isActive }: { id: string; isConfirmed?: boolean; isActive?: boolean }) => {
      if (live) {
        const patch: Record<string, unknown> = {}
        if (isConfirmed !== undefined) patch.is_confirmed = isConfirmed
        if (isActive !== undefined) patch.is_active = isActive
        await supabase!.from('subscriptions').update(patch).eq('id', id)
      } else {
        if (isConfirmed !== undefined) demoStore.setSubscriptionConfirmed(id, isConfirmed)
        if (isActive !== undefined) demoStore.setSubscriptionActive(id, isActive)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.subscriptions }),
  })
}

export function useMarkAlertRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, all }: { id?: string; all?: boolean }) => {
      if (live) {
        const q = supabase!.from('alerts').update({ is_read: true })
        await (all ? q.neq('id', '') : q.eq('id', id!))
      } else {
        if (all) demoStore.markAllAlertsRead()
        else if (id) demoStore.markAlertRead(id)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  })
}

export function useManualSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<ManualSyncResult> => {
      if (live) return manualBankSync()
      demoStore.refreshBankData()
      return { synced: demoStore.snapshot().connections.length, report: [], demo: true }
    },
    onSuccess: () => {
      for (const queryKey of bankSyncKeys) {
        qc.invalidateQueries({ queryKey })
      }
    },
  })
}

export function useSavePushSubscription() {
  return useMutation({
    mutationFn: async (subscription: PushSubscriptionJSON) => {
      if (!live) return

      const { data: auth, error: authError } = await supabase!.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!auth.user) throw new Error('Session introuvable.')

      const { error } = await supabase!
        .from('users')
        .update({ push_subscription: subscription })
        .eq('id', auth.user.id)
      if (error) throw new Error(error.message)
    },
  })
}

export function useCompleteBankCallback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: CompleteBankAuthParams): Promise<CompleteBankAuthResult> => completeBankAuth(params),
    onSuccess: () => {
      clearPendingBankAuth()
      for (const queryKey of bankSyncKeys) {
        qc.invalidateQueries({ queryKey })
      }
    },
  })
}

/** Liste des banques disponibles (sélecteur de connexion). */
export function useInstitutions(country = 'FR') {
  return useQuery({
    queryKey: ['institutions', country] as const,
    queryFn: async (): Promise<AspspChoice[]> => listInstitutions(country),
    staleTime: 60 * 60 * 1000,
  })
}

export function useDeleteBankConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (live) {
        const { error } = await supabase!.from('bank_connections').delete().eq('id', connectionId)
        if (error) throw new Error(error.message)
      } else {
        demoStore.deleteBankConnection(connectionId)
      }
    },
    onSuccess: () => {
      for (const queryKey of bankSyncKeys) {
        qc.invalidateQueries({ queryKey })
      }
    },
  })
}

export interface ProfilePatch {
  userId: string
  displayName: string
  householdId: string | null
  householdName: string
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ userId, displayName, householdId, householdName }: ProfilePatch) => {
      if (!live) return { demo: true }

      const { error: userError } = await supabase!
        .from('users')
        .update({ display_name: displayName.trim() })
        .eq('id', userId)
      if (userError) throw new Error(userError.message)

      if (householdId && householdName.trim()) {
        const { error: householdError } = await supabase!
          .from('households')
          .update({ name: householdName.trim() })
          .eq('id', householdId)
        if (householdError) throw new Error(householdError.message)
      }

      return { demo: false }
    },
  })
}
