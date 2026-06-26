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

/**
 * Un versement daté vers un objectif. Historise les apports manuels pour
 * estimer le rythme d'épargne (ETA) et afficher la chronologie. L'auteur est
 * conservé pour le suivi en foyer partagé.
 */
export interface GoalContribution {
  id: UUID
  householdId: UUID
  goalId: UUID
  amount: number
  /** Date du versement (YYYY-MM-DD). */
  contributedAt: string
  /** Membre du foyer à l'origine du versement (null si inconnu / agrégé). */
  authorUserId: UUID | null
  authorName: string | null
}

/** Classe d'actif d'une position de patrimoine. */
export type HoldingKind =
  | 'etf'
  | 'stock'
  | 'crypto'
  | 'fund'
  | 'livret'
  | 'real_estate'
  | 'cash'
  | 'other'

/** Enveloppe fiscale / contenant de la position. */
export type HoldingEnvelope = 'PEA' | 'AV' | 'CTO' | 'crypto' | 'livret' | 'autre'

/**
 * Une ligne de patrimoine (action, ETF, crypto, livret, immobilier…).
 * Les actifs cotés portent un `symbol` (valorisé via les cours réels) ; les
 * actifs non cotés (immo, livret manuel) portent une `manualValue`. Un actif
 * peut aussi refléter un compte agrégé via `linkedAccountId`.
 */
export interface Holding {
  id: UUID
  householdId: UUID
  kind: HoldingKind
  /** Symbole marché (ex. « CW8.PA », « BTC ») — null pour un actif non coté. */
  symbol: string | null
  name: string
  quantity: number
  /** Prix de revient total investi, en euros. */
  costBasis: number
  currency: string
  envelope: HoldingEnvelope
  /** Valeur saisie pour un actif non coté (immo, livret manuel) ; sinon null. */
  manualValue: number | null
  /** Compte bancaire reflété (livret agrégé) ; sinon null. */
  linkedAccountId: UUID | null
  createdAt: string
  updatedAt: string
}

/** Cours de marché instantané d'un symbole. */
export interface Quote {
  symbol: string
  price: number
  currency: string
  /** Variation du jour en pourcentage (ex. +1.8). */
  changePct: number
  asOf: string
}

/** Point d'historique de valeur nette (un par jour et par foyer). */
export interface NetWorthSnapshot {
  id: UUID
  householdId: UUID
  /** Date du point (YYYY-MM-DD). */
  asOf: string
  total: number
  cash: number
  invested: number
}

/** Résultat d'une recherche de symbole (ajout de position). */
export interface SymbolSearchResult {
  symbol: string
  name: string
  kind: HoldingKind
  currency: string
  exchange: string
}

/**
 * Type de règle d'épargne automatique. L'app ne peut pas initier de virement
 * (PISP hors périmètre) : ces règles produisent une **comptabilité** de l'argent
 * à mettre de côté, calculée sur les données déjà présentes — pas un transfert.
 */
export type SavingsRuleType = 'roundup' | 'surplus_sweep' | 'income_pct' | 'category_trigger'

export interface SavingsRule {
  id: UUID
  householdId: UUID
  type: SavingsRuleType
  enabled: boolean
  /** roundup : arrondi à l'euro/2/5… supérieur (défaut 1). */
  roundTo: number | null
  /** roundup : multiplicateur de l'arrondi mis de côté (×1, ×2…). */
  multiplier: number | null
  /** income_pct : pourcentage des revenus (ex. 10). */
  percent: number | null
  /** category_trigger : catégorie déclencheuse. */
  categoryId: UUID | null
  /** category_trigger : montant fixe mis de côté par opération. */
  amount: number | null
  /** Objectif alimenté par la règle (informatif) ; null = réserve générique. */
  targetGoalId: UUID | null
  createdAt: string
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
