/**
 * Mutable in-memory store backing DEMO mode (no Supabase).
 * All updates are immutable (new arrays/objects) per the project's coding style.
 */
import type {
  Account,
  Alert,
  BankConnection,
  Budget,
  Category,
  CategorizationRule,
  Goal,
  Holding,
  NetWorthSnapshot,
  Quote,
  Subscription,
  Transaction,
} from '@/types'
import {
  demoAccounts,
  demoAlerts,
  demoBudgets,
  demoCategories,
  demoConnections,
  demoGoals,
  demoHoldings,
  demoNetWorthSnapshots,
  demoQuote,
  demoSubscriptions,
  demoTransactions,
} from './demo'

interface DemoState {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  goals: Goal[]
  subscriptions: Subscription[]
  alerts: Alert[]
  connections: BankConnection[]
  rules: CategorizationRule[]
  holdings: Holding[]
  netWorthSnapshots: NetWorthSnapshot[]
}

const state: DemoState = {
  accounts: demoAccounts,
  transactions: demoTransactions,
  categories: demoCategories,
  budgets: demoBudgets,
  goals: demoGoals,
  subscriptions: demoSubscriptions,
  alerts: demoAlerts,
  connections: demoConnections,
  rules: [],
  holdings: demoHoldings,
  netWorthSnapshots: demoNetWorthSnapshots,
}

export const demoStore = {
  snapshot(): DemoState {
    return state
  },

  categorizeTransaction(txnId: string, categoryId: string | null): void {
    state.transactions = state.transactions.map((t) =>
      t.id === txnId ? { ...t, categoryId, categorySource: 'manual' } : t,
    )
  },

  createRuleFromTransaction(txn: Transaction, categoryId: string): void {
    const rule: CategorizationRule = {
      id: `rule-${Date.now()}`,
      householdId: txn.householdId,
      matchPattern: txn.cleanLabel,
      categoryId,
      priority: state.rules.length + 1,
    }
    state.rules = [...state.rules, rule]
    // Apply the rule to existing matching, non-manual transactions.
    const needle = txn.cleanLabel.toLowerCase()
    state.transactions = state.transactions.map((t) =>
      t.categorySource !== 'manual' && t.cleanLabel.toLowerCase().includes(needle)
        ? { ...t, categoryId, categorySource: 'rule' }
        : t,
    )
  },

  upsertBudget(categoryId: string, amount: number): void {
    const existing = state.budgets.find((b) => b.categoryId === categoryId)
    if (existing) {
      state.budgets = state.budgets.map((b) =>
        b.categoryId === categoryId ? { ...b, amount } : b,
      )
    } else {
      state.budgets = [
        ...state.budgets,
        {
          id: `bud-${categoryId}-${Date.now()}`,
          householdId: 'hh-foyer',
          categoryId,
          amount,
          period: 'monthly',
          createdAt: new Date().toISOString(),
        },
      ]
    }
  },

  deleteBudget(budgetId: string): void {
    state.budgets = state.budgets.filter((b) => b.id !== budgetId)
  },

  upsertGoal(goal: Omit<Goal, 'id' | 'householdId'> & { id?: string }): void {
    if (goal.id) {
      state.goals = state.goals.map((g) => (g.id === goal.id ? { ...g, ...goal } as Goal : g))
    } else {
      state.goals = [
        ...state.goals,
        { ...goal, id: `goal-${Date.now()}`, householdId: 'hh-foyer' } as Goal,
      ]
    }
  },

  addGoalContribution(goalId: string, amount: number): void {
    state.goals = state.goals.map((g) =>
      g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g,
    )
  },

  deleteGoal(goalId: string): void {
    state.goals = state.goals.filter((g) => g.id !== goalId)
  },

  upsertHolding(holding: Omit<Holding, 'id' | 'householdId' | 'createdAt' | 'updatedAt'> & { id?: string }): void {
    const now = new Date().toISOString()
    if (holding.id) {
      state.holdings = state.holdings.map((h) =>
        h.id === holding.id ? ({ ...h, ...holding, updatedAt: now } as Holding) : h,
      )
    } else {
      state.holdings = [
        ...state.holdings,
        { ...holding, id: `hold-${Date.now()}`, householdId: 'hh-foyer', createdAt: now, updatedAt: now } as Holding,
      ]
    }
  },

  deleteHolding(holdingId: string): void {
    state.holdings = state.holdings.filter((h) => h.id !== holdingId)
  },

  /** Cours simulés (déterministes) pour les symboles demandés. */
  quotesFor(symbols: string[]): Quote[] {
    return symbols.map(demoQuote)
  },

  /** Enregistre (ou met à jour) le point de valeur nette du jour. */
  recordNetWorth(total: number, cash: number, invested: number): void {
    const asOf = new Date().toISOString().slice(0, 10)
    const rest = state.netWorthSnapshots.filter((s) => s.asOf !== asOf)
    state.netWorthSnapshots = [
      ...rest,
      { id: `nw-${asOf}`, householdId: 'hh-foyer', asOf, total, cash, invested },
    ]
  },

  setSubscriptionConfirmed(subId: string, confirmed: boolean): void {
    state.subscriptions = state.subscriptions.map((s) =>
      s.id === subId ? { ...s, isConfirmed: confirmed } : s,
    )
  },

  setSubscriptionActive(subId: string, active: boolean): void {
    state.subscriptions = state.subscriptions.map((s) =>
      s.id === subId ? { ...s, isActive: active } : s,
    )
  },

  markAlertRead(alertId: string): void {
    state.alerts = state.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
  },

  markAllAlertsRead(): void {
    state.alerts = state.alerts.map((a) => ({ ...a, isRead: true }))
  },

  refreshBankData(): void {
    const refreshedAt = new Date().toISOString()
    state.accounts = state.accounts.map((a) => ({ ...a, balanceUpdatedAt: refreshedAt }))
    state.connections = state.connections.map((c) => ({ ...c, status: 'active' }))
  },

  deleteBankConnection(connectionId: string): void {
    const accountIds = new Set(
      state.accounts.filter((a) => a.bankConnectionId === connectionId).map((a) => a.id),
    )
    state.connections = state.connections.filter((c) => c.id !== connectionId)
    state.accounts = state.accounts.filter((a) => a.bankConnectionId !== connectionId)
    state.transactions = state.transactions.filter((t) => !accountIds.has(t.accountId))
    state.goals = state.goals.map((g) =>
      g.linkedAccountId && accountIds.has(g.linkedAccountId)
        ? { ...g, linkedAccountId: null }
        : g,
    )
    state.holdings = state.holdings.map((h) =>
      h.linkedAccountId && accountIds.has(h.linkedAccountId)
        ? { ...h, linkedAccountId: null }
        : h,
    )
  },
}
