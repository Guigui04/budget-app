/** Row mappers between Postgres (snake_case) and domain types (camelCase). */
import type {
  Account,
  Alert,
  AlertType,
  BankConnection,
  Budget,
  Category,
  CategorySource,
  ConnectionStatus,
  Goal,
  Holding,
  HoldingEnvelope,
  HoldingKind,
  NetWorthSnapshot,
  Quote,
  Subscription,
  SubscriptionFrequency,
  Transaction,
} from '@/types'

export type Row = Record<string, unknown>

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asBoolean(value: unknown): boolean {
  return value === true
}

export const mapAccount = (r: Row): Account => ({
  id: asString(r.id),
  bankConnectionId: asString(r.bank_connection_id),
  householdId: asString(r.household_id),
  externalAccountId: asString(r.external_account_id),
  name: asString(r.name),
  iban: asString(r.iban),
  currency: asString(r.currency, 'EUR'),
  balance: Number(r.balance ?? 0),
  balanceUpdatedAt: asString(r.balance_updated_at),
  kind: asString(r.kind, 'checking') as Account['kind'],
})

export const mapTransaction = (r: Row): Transaction => ({
  id: asString(r.id),
  accountId: asString(r.account_id),
  householdId: asString(r.household_id),
  externalId: asString(r.external_id),
  bookingDate: asString(r.booking_date),
  amount: Number(r.amount ?? 0),
  currency: asString(r.currency, 'EUR'),
  rawLabel: asString(r.raw_label),
  cleanLabel: asString(r.clean_label),
  categoryId: asNullableString(r.category_id),
  categorySource: asString(r.category_source, 'auto') as CategorySource,
  isRecurring: asBoolean(r.is_recurring),
  subscriptionId: asNullableString(r.subscription_id),
  createdAt: asString(r.created_at),
})

export const mapCategory = (r: Row): Category => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  name: asString(r.name),
  icon: asString(r.icon, 'circle-dashed'),
  color: asString(r.color, '#a89e8c'),
  parentId: asNullableString(r.parent_id),
  isDefault: asBoolean(r.is_default),
})

export const mapBudget = (r: Row): Budget => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  categoryId: asString(r.category_id),
  amount: Number(r.amount ?? 0),
  period: 'monthly',
  createdAt: asString(r.created_at),
})

export const mapGoal = (r: Row): Goal => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  name: asString(r.name),
  targetAmount: Number(r.target_amount ?? 0),
  currentAmount: Number(r.current_amount ?? 0),
  targetDate: asNullableString(r.target_date),
  linkedAccountId: asNullableString(r.linked_account_id),
  color: asString(r.color, '#46c79a'),
})

export const mapHolding = (r: Row): Holding => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  kind: asString(r.kind, 'other') as HoldingKind,
  symbol: asNullableString(r.symbol),
  name: asString(r.name),
  quantity: Number(r.quantity ?? 0),
  costBasis: Number(r.cost_basis ?? 0),
  currency: asString(r.currency, 'EUR'),
  envelope: asString(r.envelope, 'autre') as HoldingEnvelope,
  manualValue: r.manual_value == null ? null : Number(r.manual_value),
  linkedAccountId: asNullableString(r.linked_account_id),
  createdAt: asString(r.created_at),
  updatedAt: asString(r.updated_at),
})

export const mapNetWorthSnapshot = (r: Row): NetWorthSnapshot => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  asOf: asString(r.as_of),
  total: Number(r.total ?? 0),
  cash: Number(r.cash ?? 0),
  invested: Number(r.invested ?? 0),
})

export const mapQuote = (r: Row): Quote => ({
  symbol: asString(r.symbol),
  price: Number(r.price ?? 0),
  currency: asString(r.currency, 'EUR'),
  changePct: Number(r.change_pct ?? 0),
  asOf: asString(r.as_of),
})

export const mapSubscription = (r: Row): Subscription => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  merchantLabel: asString(r.merchant_label),
  amount: Number(r.amount ?? 0),
  frequency: asString(r.frequency, 'monthly') as SubscriptionFrequency,
  nextExpectedDate: asString(r.next_expected_date),
  categoryId: asNullableString(r.category_id),
  isConfirmed: asBoolean(r.is_confirmed),
  isActive: asBoolean(r.is_active),
})

export const mapAlert = (r: Row): Alert => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  type: asString(r.type, 'sync_error') as AlertType,
  payload: typeof r.payload === 'object' && r.payload !== null ? r.payload as Record<string, unknown> : {},
  isRead: asBoolean(r.is_read),
  createdAt: asString(r.created_at),
})

export const mapConnection = (r: Row): BankConnection => ({
  id: asString(r.id),
  householdId: asString(r.household_id),
  ownerUserId: asString(r.owner_user_id),
  provider: asString(r.provider, 'enablebanking'),
  aspspName: asString(r.aspsp_name),
  externalSessionId: asString(r.external_session_id),
  consentExpiresAt: asString(r.consent_expires_at),
  status: asString(r.status, 'active') as ConnectionStatus,
  createdAt: asString(r.created_at),
})
