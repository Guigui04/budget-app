/**
 * In-memory demo dataset — a realistic shared household ("foyer").
 * Used when Supabase is not configured, so the full UI is explorable offline.
 * Deterministic (seeded) so the data is stable between reloads.
 */
import type {
  Account,
  Alert,
  BankConnection,
  Budget,
  Category,
  Goal,
  Household,
  Subscription,
  Transaction,
  UserProfile,
} from '@/types'

const HOUSEHOLD_ID = 'hh-foyer'

export const demoHousehold: Household = {
  id: HOUSEHOLD_ID,
  name: 'Foyer Guillaume & Maëva',
  createdAt: '2025-09-01T10:00:00Z',
  monthlyIncome: 3200,
}

export const demoUsers: UserProfile[] = [
  { id: 'u-guillaume', householdId: HOUSEHOLD_ID, displayName: 'Guillaume', avatarColor: '#46c79a', hasPushSubscription: true },
  { id: 'u-maeva', householdId: HOUSEHOLD_ID, displayName: 'Maëva', avatarColor: '#f0784a', hasPushSubscription: false },
]

const now = new Date()
function isoDaysAgo(days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10)
}
function dateInDays(days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const demoConnections: BankConnection[] = [
  {
    id: 'bc-ca', householdId: HOUSEHOLD_ID, ownerUserId: 'u-guillaume', provider: 'enablebanking',
    aspspName: 'Crédit Agricole', externalSessionId: 'sess-ca', consentExpiresAt: isoDaysAgo(-78),
    status: 'active', createdAt: '2025-09-02T09:00:00Z',
  },
  {
    id: 'bc-borso', householdId: HOUSEHOLD_ID, ownerUserId: 'u-maeva', provider: 'enablebanking',
    aspspName: 'BoursoBank', externalSessionId: 'sess-borso', consentExpiresAt: isoDaysAgo(-5),
    status: 'active', createdAt: '2025-09-02T09:30:00Z',
  },
  {
    id: 'bc-revolut', householdId: HOUSEHOLD_ID, ownerUserId: 'u-guillaume', provider: 'enablebanking',
    aspspName: 'Revolut', externalSessionId: 'sess-rev', consentExpiresAt: isoDaysAgo(-40),
    status: 'active', createdAt: '2025-09-05T18:00:00Z',
  },
]

export const demoAccounts: Account[] = [
  { id: 'acc-ca-courant', bankConnectionId: 'bc-ca', householdId: HOUSEHOLD_ID, externalAccountId: 'ca-1', name: 'Compte courant', iban: 'FR7612345678901234567890123', currency: 'EUR', balance: 3284.51, balanceUpdatedAt: isoDaysAgo(0), kind: 'checking' },
  { id: 'acc-ca-livret', bankConnectionId: 'bc-ca', householdId: HOUSEHOLD_ID, externalAccountId: 'ca-2', name: 'Livret A', iban: 'FR7612345678901234567899999', currency: 'EUR', balance: 11200.0, balanceUpdatedAt: isoDaysAgo(0), kind: 'savings' },
  { id: 'acc-borso', bankConnectionId: 'bc-borso', householdId: HOUSEHOLD_ID, externalAccountId: 'bo-1', name: 'Compte Bourso', iban: 'FR7640618802001234567890115', currency: 'EUR', balance: 1742.18, balanceUpdatedAt: isoDaysAgo(0), kind: 'checking' },
  { id: 'acc-revolut', bankConnectionId: 'bc-revolut', householdId: HOUSEHOLD_ID, externalAccountId: 'rv-1', name: 'Revolut', iban: 'GB33REVO00997012345678', currency: 'EUR', balance: 412.9, balanceUpdatedAt: isoDaysAgo(2), kind: 'checking' },
]

export const demoCategories: Category[] = [
  { id: 'cat-courses', householdId: HOUSEHOLD_ID, name: 'Courses', icon: 'shopping-cart', color: '#46c79a', parentId: null, isDefault: true },
  { id: 'cat-resto', householdId: HOUSEHOLD_ID, name: 'Restaurants', icon: 'utensils', color: '#f0784a', parentId: null, isDefault: true },
  { id: 'cat-transport', householdId: HOUSEHOLD_ID, name: 'Transport', icon: 'car', color: '#6fa8dc', parentId: null, isDefault: true },
  { id: 'cat-logement', householdId: HOUSEHOLD_ID, name: 'Logement', icon: 'home', color: '#b58df1', parentId: null, isDefault: true },
  { id: 'cat-energie', householdId: HOUSEHOLD_ID, name: 'Énergie', icon: 'zap', color: '#e8b24c', parentId: null, isDefault: true },
  { id: 'cat-abos', householdId: HOUSEHOLD_ID, name: 'Abonnements', icon: 'repeat', color: '#ef6f9c', parentId: null, isDefault: true },
  { id: 'cat-loisirs', householdId: HOUSEHOLD_ID, name: 'Loisirs', icon: 'party-popper', color: '#4ec5d4', parentId: null, isDefault: true },
  { id: 'cat-sante', householdId: HOUSEHOLD_ID, name: 'Santé', icon: 'heart-pulse', color: '#f2647d', parentId: null, isDefault: true },
  { id: 'cat-shopping', householdId: HOUSEHOLD_ID, name: 'Shopping', icon: 'shopping-bag', color: '#d99ad6', parentId: null, isDefault: true },
  { id: 'cat-voyages', householdId: HOUSEHOLD_ID, name: 'Voyages', icon: 'plane', color: '#5fb0c9', parentId: null, isDefault: true },
  { id: 'cat-salaire', householdId: HOUSEHOLD_ID, name: 'Salaire', icon: 'briefcase', color: '#46c79a', parentId: null, isDefault: true },
  { id: 'cat-epargne', householdId: HOUSEHOLD_ID, name: 'Épargne', icon: 'piggy-bank', color: '#7fd1a8', parentId: null, isDefault: true },
  { id: 'cat-autres', householdId: HOUSEHOLD_ID, name: 'Autres', icon: 'circle-dashed', color: '#a89e8c', parentId: null, isDefault: true },
]

export const demoBudgets: Budget[] = [
  { id: 'bud-courses', householdId: HOUSEHOLD_ID, categoryId: 'cat-courses', amount: 600, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'bud-resto', householdId: HOUSEHOLD_ID, categoryId: 'cat-resto', amount: 250, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'bud-transport', householdId: HOUSEHOLD_ID, categoryId: 'cat-transport', amount: 180, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'bud-loisirs', householdId: HOUSEHOLD_ID, categoryId: 'cat-loisirs', amount: 150, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'bud-shopping', householdId: HOUSEHOLD_ID, categoryId: 'cat-shopping', amount: 200, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'bud-abos', householdId: HOUSEHOLD_ID, categoryId: 'cat-abos', amount: 90, period: 'monthly', createdAt: '2025-09-01T00:00:00Z' },
]

export const demoGoals: Goal[] = [
  { id: 'goal-vacances', householdId: HOUSEHOLD_ID, name: 'Vacances Japon', targetAmount: 6000, currentAmount: 3850, targetDate: dateInDays(210), linkedAccountId: null, color: '#f0784a' },
  { id: 'goal-secours', householdId: HOUSEHOLD_ID, name: "Fonds d'urgence", targetAmount: 12000, currentAmount: 11200, targetDate: null, linkedAccountId: 'acc-ca-livret', color: '#46c79a' },
  { id: 'goal-canape', householdId: HOUSEHOLD_ID, name: 'Nouveau canapé', targetAmount: 1500, currentAmount: 540, targetDate: dateInDays(90), linkedAccountId: null, color: '#e8b24c' },
]

export const demoSubscriptions: Subscription[] = [
  { id: 'sub-netflix', householdId: HOUSEHOLD_ID, merchantLabel: 'Netflix', amount: 19.99, frequency: 'monthly', nextExpectedDate: dateInDays(8), categoryId: 'cat-abos', isConfirmed: true, isActive: true },
  { id: 'sub-spotify', householdId: HOUSEHOLD_ID, merchantLabel: 'Spotify Duo', amount: 14.99, frequency: 'monthly', nextExpectedDate: dateInDays(3), categoryId: 'cat-abos', isConfirmed: true, isActive: true },
  { id: 'sub-salle', householdId: HOUSEHOLD_ID, merchantLabel: 'Basic-Fit', amount: 29.98, frequency: 'monthly', nextExpectedDate: dateInDays(12), categoryId: 'cat-loisirs', isConfirmed: true, isActive: true },
  { id: 'sub-icloud', householdId: HOUSEHOLD_ID, merchantLabel: 'iCloud+', amount: 2.99, frequency: 'monthly', nextExpectedDate: dateInDays(5), categoryId: 'cat-abos', isConfirmed: true, isActive: true },
  { id: 'sub-assur', householdId: HOUSEHOLD_ID, merchantLabel: 'Assurance habitation', amount: 18.4, frequency: 'monthly', nextExpectedDate: dateInDays(15), categoryId: 'cat-logement', isConfirmed: true, isActive: true },
  { id: 'sub-amazon', householdId: HOUSEHOLD_ID, merchantLabel: 'Amazon Prime', amount: 69.9, frequency: 'yearly', nextExpectedDate: dateInDays(48), categoryId: 'cat-abos', isConfirmed: false, isActive: true },
]

// ── Transaction generation ──────────────────────────────────
interface Merchant {
  label: string
  categoryId: string
  min: number
  max: number
  accountId: string
}

const merchants: Merchant[] = [
  { label: 'Carrefour Market', categoryId: 'cat-courses', min: 18, max: 95, accountId: 'acc-ca-courant' },
  { label: 'Monoprix', categoryId: 'cat-courses', min: 12, max: 70, accountId: 'acc-borso' },
  { label: 'Biocoop', categoryId: 'cat-courses', min: 15, max: 55, accountId: 'acc-ca-courant' },
  { label: 'Le Bistrot du Coin', categoryId: 'cat-resto', min: 24, max: 78, accountId: 'acc-ca-courant' },
  { label: 'Sushi Shop', categoryId: 'cat-resto', min: 18, max: 42, accountId: 'acc-borso' },
  { label: 'Boulangerie Pichard', categoryId: 'cat-resto', min: 4, max: 16, accountId: 'acc-ca-courant' },
  { label: 'Total Energies', categoryId: 'cat-transport', min: 45, max: 80, accountId: 'acc-ca-courant' },
  { label: 'SNCF Connect', categoryId: 'cat-transport', min: 20, max: 120, accountId: 'acc-revolut' },
  { label: 'Uber', categoryId: 'cat-transport', min: 8, max: 28, accountId: 'acc-revolut' },
  { label: 'Decathlon', categoryId: 'cat-shopping', min: 20, max: 140, accountId: 'acc-borso' },
  { label: 'Zara', categoryId: 'cat-shopping', min: 30, max: 110, accountId: 'acc-borso' },
  { label: 'Fnac', categoryId: 'cat-loisirs', min: 12, max: 60, accountId: 'acc-ca-courant' },
  { label: 'Pharmacie Centrale', categoryId: 'cat-sante', min: 8, max: 45, accountId: 'acc-ca-courant' },
  { label: 'Cinéma Pathé', categoryId: 'cat-loisirs', min: 12, max: 32, accountId: 'acc-borso' },
]

const recurring: { label: string; categoryId: string; amount: number; day: number; accountId: string; subscriptionId?: string }[] = [
  { label: 'Loyer SCI Belleville', categoryId: 'cat-logement', amount: -1150, day: 3, accountId: 'acc-ca-courant' },
  { label: 'EDF Électricité', categoryId: 'cat-energie', amount: -84.3, day: 6, accountId: 'acc-ca-courant' },
  { label: 'Netflix.com', categoryId: 'cat-abos', amount: -19.99, day: 12, accountId: 'acc-ca-courant', subscriptionId: 'sub-netflix' },
  { label: 'Spotify P12345', categoryId: 'cat-abos', amount: -14.99, day: 18, accountId: 'acc-borso', subscriptionId: 'sub-spotify' },
  { label: 'BASIC FIT FRANCE', categoryId: 'cat-loisirs', amount: -29.98, day: 9, accountId: 'acc-borso', subscriptionId: 'sub-salle' },
  { label: 'APPLE.COM/BILL', categoryId: 'cat-abos', amount: -2.99, day: 22, accountId: 'acc-ca-courant', subscriptionId: 'sub-icloud' },
  { label: 'Assurance MAIF', categoryId: 'cat-logement', amount: -18.4, day: 14, accountId: 'acc-ca-courant' },
]

// Mulberry32 seeded PRNG for stable demo data.
function makeRng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildTransactions(): Transaction[] {
  const rng = makeRng(42)
  const txns: Transaction[] = []
  let seq = 0
  const id = () => `tx-${(seq++).toString().padStart(4, '0')}`

  // Salaries: two incomes per month for 3 months.
  for (let m = 0; m < 3; m++) {
    const base = m * 30
    txns.push({
      id: id(), accountId: 'acc-ca-courant', householdId: HOUSEHOLD_ID, externalId: `sal-g-${m}`,
      bookingDate: dateDaysAgo(base + 2), amount: 2650, currency: 'EUR',
      rawLabel: 'VIR SALAIRE ATELIER NOVA', cleanLabel: 'Salaire Guillaume', categoryId: 'cat-salaire',
      categorySource: 'rule', isRecurring: true, subscriptionId: null, createdAt: isoDaysAgo(base + 2),
    })
    txns.push({
      id: id(), accountId: 'acc-borso', householdId: HOUSEHOLD_ID, externalId: `sal-m-${m}`,
      bookingDate: dateDaysAgo(base + 1), amount: 2380, currency: 'EUR',
      rawLabel: 'VIR SALAIRE CLINIQUE ST JEAN', cleanLabel: 'Salaire Maëva', categoryId: 'cat-salaire',
      categorySource: 'rule', isRecurring: true, subscriptionId: null, createdAt: isoDaysAgo(base + 1),
    })
    // Recurring charges
    for (const r of recurring) {
      const days = base + (30 - r.day)
      if (days < 0) continue
      txns.push({
        id: id(), accountId: r.accountId, householdId: HOUSEHOLD_ID, externalId: `rec-${r.label}-${m}`,
        bookingDate: dateDaysAgo(days), amount: r.amount, currency: 'EUR',
        rawLabel: r.label.toUpperCase(), cleanLabel: r.label.replace(/\.com.*| P\d+|\/BILL|\sFRANCE/gi, ''),
        categoryId: r.categoryId, categorySource: 'rule', isRecurring: true,
        subscriptionId: r.subscriptionId ?? null, createdAt: isoDaysAgo(days),
      })
    }
  }

  // Variable spending across ~88 days.
  for (let d = 0; d < 88; d++) {
    const count = Math.floor(rng() * 3) // 0–2 purchases per day
    for (let i = 0; i < count; i++) {
      const merchant = merchants[Math.floor(rng() * merchants.length)]
      const amount = -(merchant.min + rng() * (merchant.max - merchant.min))
      txns.push({
        id: id(), accountId: merchant.accountId, householdId: HOUSEHOLD_ID, externalId: `var-${d}-${i}`,
        bookingDate: dateDaysAgo(d), amount: Math.round(amount * 100) / 100, currency: 'EUR',
        rawLabel: `CB ${merchant.label.toUpperCase()} ${dateDaysAgo(d).replace(/-/g, '')}`,
        cleanLabel: merchant.label, categoryId: merchant.categoryId,
        categorySource: rng() > 0.85 ? 'manual' : 'auto', isRecurring: false,
        subscriptionId: null, createdAt: isoDaysAgo(d),
      })
    }
  }

  // A few uncategorised transactions ("À classer").
  for (let k = 0; k < 4; k++) {
    txns.push({
      id: id(), accountId: 'acc-revolut', householdId: HOUSEHOLD_ID, externalId: `unc-${k}`,
      bookingDate: dateDaysAgo(k * 4 + 1), amount: -(8 + rng() * 60), currency: 'EUR',
      rawLabel: `SUMUP *MARCHE LOCAL`, cleanLabel: 'SumUp Marché local', categoryId: null,
      categorySource: 'auto', isRecurring: false, subscriptionId: null, createdAt: isoDaysAgo(k * 4 + 1),
    })
  }

  // One unusually large transaction (triggers a "large_transaction" alert).
  txns.push({
    id: id(), accountId: 'acc-ca-courant', householdId: HOUSEHOLD_ID, externalId: 'big-1',
    bookingDate: dateDaysAgo(4), amount: -689, currency: 'EUR',
    rawLabel: 'CB DARTY ELECTROMENAGER', cleanLabel: 'Darty', categoryId: 'cat-shopping',
    categorySource: 'auto', isRecurring: false, subscriptionId: null, createdAt: isoDaysAgo(4),
  })

  return txns.map((t) => ({ ...t, amount: Math.round(t.amount * 100) / 100 }))
}

export const demoTransactions: Transaction[] = buildTransactions()

export const demoAlerts: Alert[] = [
  { id: 'al-1', householdId: HOUSEHOLD_ID, type: 'large_transaction', payload: { merchant: 'Darty', amount: -689 }, isRead: false, createdAt: isoDaysAgo(4) },
  { id: 'al-2', householdId: HOUSEHOLD_ID, type: 'budget_warning', payload: { category: 'Restaurants', ratio: 0.86 }, isRead: false, createdAt: isoDaysAgo(2) },
  { id: 'al-3', householdId: HOUSEHOLD_ID, type: 'new_subscription', payload: { merchant: 'Amazon Prime', amount: -69.9 }, isRead: false, createdAt: isoDaysAgo(1) },
  { id: 'al-4', householdId: HOUSEHOLD_ID, type: 'consent_expiring', payload: { bank: 'BoursoBank', days: 5 }, isRead: true, createdAt: isoDaysAgo(3) },
  { id: 'al-5', householdId: HOUSEHOLD_ID, type: 'budget_exceeded', payload: { category: 'Shopping', ratio: 1.12 }, isRead: true, createdAt: isoDaysAgo(5) },
]
