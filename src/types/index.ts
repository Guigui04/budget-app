/**
 * Domain types — aligned with the Supabase schema (supabase/migrations).
 * Money amounts are in euros (numeric). Negative amount = dépense.
 */

export type UUID = string

export interface Household {
  id: UUID
  name: string
  createdAt: string
  /** Revenu mensuel prévu (salaire) du foyer, pour le budget prévisionnel. */
  monthlyIncome: number
}

export interface UserProfile {
  id: UUID
  householdId: UUID | null
  displayName: string
  avatarColor: string
  hasPushSubscription: boolean
}

export type ConnectionStatus = 'active' | 'expired' | 'error'

export interface BankConnection {
  id: UUID
  householdId: UUID
  ownerUserId: UUID
  provider: string
  aspspName: string
  externalSessionId: string
  consentExpiresAt: string
  status: ConnectionStatus
  createdAt: string
}

export interface Account {
  id: UUID
  bankConnectionId: UUID
  householdId: UUID
  externalAccountId: string
  name: string
  iban: string
  currency: string
  balance: number
  balanceUpdatedAt: string
  kind: 'checking' | 'savings'
}

export type CategorySource = 'auto' | 'manual' | 'rule'

export interface Transaction {
  id: UUID
  accountId: UUID
  householdId: UUID
  externalId: string
  bookingDate: string
  amount: number
  currency: string
  rawLabel: string
  cleanLabel: string
  categoryId: UUID | null
  categorySource: CategorySource
  isRecurring: boolean
  subscriptionId: UUID | null
  createdAt: string
}

export interface Category {
  id: UUID
  householdId: UUID
  name: string
  icon: string
  color: string
  parentId: UUID | null
  isDefault: boolean
}

export interface Budget {
  id: UUID
  householdId: UUID
  categoryId: UUID
  amount: number
  period: 'monthly'
  createdAt: string
}

export interface Goal {
  id: UUID
  householdId: UUID
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  linkedAccountId: UUID | null
  color: string
}

export type SubscriptionFrequency = 'monthly' | 'yearly' | 'weekly'

export interface Subscription {
  id: UUID
  householdId: UUID
  merchantLabel: string
  amount: number
  frequency: SubscriptionFrequency
  nextExpectedDate: string
  categoryId: UUID | null
  isConfirmed: boolean
  isActive: boolean
}

export interface CategorizationRule {
  id: UUID
  householdId: UUID
  matchPattern: string
  categoryId: UUID
  priority: number
}

export type AlertType =
  | 'budget_exceeded'
  | 'budget_warning'
  | 'large_transaction'
  | 'new_subscription'
  | 'consent_expiring'
  | 'sync_error'

export interface Alert {
  id: UUID
  householdId: UUID
  type: AlertType
  payload: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

/** Derived view model for a budget envelope with computed spending. */
export interface BudgetEnvelope {
  budget: Budget
  category: Category
  spent: number
  remaining: number
  ratio: number
}
