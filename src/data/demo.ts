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
  GoalContribution,
  Holding,
  Household,
  NetWorthSnapshot,
  Quote,
  Subscription,
  SymbolSearchResult,
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

/**
 * Historique de versements de démo — un rythme régulier sur les derniers mois,
 * pour que la courbe de projection et l'ETA aient de la matière. Attribué aux
 * deux membres du foyer (foyer partagé).
 */
export const demoGoalContributions: GoalContribution[] = [
  // Vacances Japon : ~430 €/mois à deux.
  { id: 'gc-v1', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 250, contributedAt: dateDaysAgo(95), authorUserId: 'u-guillaume', authorName: 'Guillaume' },
  { id: 'gc-v2', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 180, contributedAt: dateDaysAgo(92), authorUserId: 'u-maeva', authorName: 'Maëva' },
  { id: 'gc-v3', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 250, contributedAt: dateDaysAgo(64), authorUserId: 'u-guillaume', authorName: 'Guillaume' },
  { id: 'gc-v4', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 200, contributedAt: dateDaysAgo(61), authorUserId: 'u-maeva', authorName: 'Maëva' },
  { id: 'gc-v5', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 280, contributedAt: dateDaysAgo(32), authorUserId: 'u-guillaume', authorName: 'Guillaume' },
  { id: 'gc-v6', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 160, contributedAt: dateDaysAgo(30), authorUserId: 'u-maeva', authorName: 'Maëva' },
  { id: 'gc-v7', householdId: HOUSEHOLD_ID, goalId: 'goal-vacances', amount: 300, contributedAt: dateDaysAgo(4), authorUserId: 'u-guillaume', authorName: 'Guillaume' },
  // Canapé : ~180 €/mois.
  { id: 'gc-c1', householdId: HOUSEHOLD_ID, goalId: 'goal-canape', amount: 180, contributedAt: dateDaysAgo(70), authorUserId: 'u-maeva', authorName: 'Maëva' },
  { id: 'gc-c2', householdId: HOUSEHOLD_ID, goalId: 'goal-canape', amount: 180, contributedAt: dateDaysAgo(38), authorUserId: 'u-maeva', authorName: 'Maëva' },
  { id: 'gc-c3', householdId: HOUSEHOLD_ID, goalId: 'goal-canape', amount: 180, contributedAt: dateDaysAgo(7), authorUserId: 'u-guillaume', authorName: 'Guillaume' },
]

// ── Patrimoine / investissement ─────────────────────────────
// Positions réalistes d'un foyer : PEA (ETF + actions), crypto, assurance-vie,
// livret agrégé et un bien immobilier en valeur manuelle.
export const demoHoldings: Holding[] = [
  { id: 'hold-cw8', householdId: HOUSEHOLD_ID, kind: 'etf', symbol: 'CW8.PA', name: 'Amundi MSCI World', quantity: 18, costBasis: 8200, currency: 'EUR', envelope: 'PEA', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(400), updatedAt: isoDaysAgo(0) },
  { id: 'hold-ese', householdId: HOUSEHOLD_ID, kind: 'etf', symbol: 'ESE.PA', name: 'BNP S&P 500', quantity: 120, costBasis: 2350, currency: 'EUR', envelope: 'PEA', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(360), updatedAt: isoDaysAgo(0) },
  { id: 'hold-mc', householdId: HOUSEHOLD_ID, kind: 'stock', symbol: 'MC.PA', name: 'LVMH', quantity: 4, costBasis: 2640, currency: 'EUR', envelope: 'PEA', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(300), updatedAt: isoDaysAgo(0) },
  { id: 'hold-ai', householdId: HOUSEHOLD_ID, kind: 'stock', symbol: 'AI.PA', name: 'Air Liquide', quantity: 12, costBasis: 1980, currency: 'EUR', envelope: 'PEA', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(280), updatedAt: isoDaysAgo(0) },
  { id: 'hold-btc', householdId: HOUSEHOLD_ID, kind: 'crypto', symbol: 'BTC', name: 'Bitcoin', quantity: 0.12, costBasis: 5200, currency: 'EUR', envelope: 'crypto', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(220), updatedAt: isoDaysAgo(0) },
  { id: 'hold-eth', householdId: HOUSEHOLD_ID, kind: 'crypto', symbol: 'ETH', name: 'Ethereum', quantity: 1.4, costBasis: 3600, currency: 'EUR', envelope: 'crypto', manualValue: null, linkedAccountId: null, createdAt: isoDaysAgo(200), updatedAt: isoDaysAgo(0) },
  { id: 'hold-av', householdId: HOUSEHOLD_ID, kind: 'fund', symbol: null, name: 'Assurance-vie Linxea', quantity: 1, costBasis: 14000, currency: 'EUR', envelope: 'AV', manualValue: 15240, linkedAccountId: null, createdAt: isoDaysAgo(500), updatedAt: isoDaysAgo(0) },
  { id: 'hold-livret', householdId: HOUSEHOLD_ID, kind: 'livret', symbol: null, name: 'Livret A', quantity: 1, costBasis: 11200, currency: 'EUR', envelope: 'livret', manualValue: null, linkedAccountId: 'acc-ca-livret', createdAt: isoDaysAgo(600), updatedAt: isoDaysAgo(0) },
  { id: 'hold-immo', householdId: HOUSEHOLD_ID, kind: 'real_estate', symbol: null, name: 'Studio locatif Lyon', quantity: 1, costBasis: 132000, currency: 'EUR', envelope: 'autre', manualValue: 158000, linkedAccountId: null, createdAt: isoDaysAgo(800), updatedAt: isoDaysAgo(0) },
]

/**
 * Cours de référence (EUR) des symboles de démo. Les variations du jour sont
 * dérivées de façon DÉTERMINISTE du symbole (stables entre rechargements),
 * pour un rendu crédible sans appel réseau ni clé API.
 */
const demoPriceBase: Record<string, number> = {
  'CW8.PA': 521.4,
  'ESE.PA': 22.18,
  'MC.PA': 712.5,
  'AI.PA': 178.9,
  BTC: 61450,
  ETH: 3340,
}

/** Hash stable d'une chaîne → [0, 1). */
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/** Cours simulé d'un symbole (prix de référence + variation du jour déterministe). */
export function demoQuote(symbol: string): Quote {
  const base = demoPriceBase[symbol] ?? 100 + hash01(symbol) * 400
  const changePct = Math.round((hash01(symbol + 'd') * 6 - 3) * 100) / 100 // [-3 %, +3 %]
  const price = Math.round(base * (1 + changePct / 200) * 100) / 100
  return { symbol, price, currency: 'EUR', changePct, asOf: isoDaysAgo(0) }
}

/**
 * Historique de valeur nette de démo : 26 points hebdomadaires en tendance
 * haussière (déterministe). Le point du jour est (ré)écrit par l'app au montage
 * avec la valeur calculée en direct, donc la courbe reste cohérente avec le héro.
 */
export const demoNetWorthSnapshots: NetWorthSnapshot[] = Array.from({ length: 26 }, (_, i) => {
  const weeksAgo = 26 - i // 26 → 1
  const progress = i / 25 // 0 → 1
  const noise = (hash01(`nw${i}`) - 0.5) * 4000
  const total = Math.round(176000 + progress * 40000 + noise)
  const cash = Math.round(14000 + progress * 3000 + (hash01(`c${i}`) - 0.5) * 1500)
  return {
    id: `nw-${i}`,
    householdId: HOUSEHOLD_ID,
    asOf: dateDaysAgo(weeksAgo * 7),
    total,
    cash,
    invested: total - cash,
  }
})

/** Petit catalogue de symboles pour la recherche en mode démo. */
const demoSymbolCatalog: SymbolSearchResult[] = [
  { symbol: 'CW8.PA', name: 'Amundi MSCI World UCITS ETF', kind: 'etf', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'ESE.PA', name: 'BNP Paribas Easy S&P 500', kind: 'etf', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'PE500.PA', name: 'Amundi PEA S&P 500 ESG', kind: 'etf', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy', kind: 'stock', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'AI.PA', name: 'Air Liquide', kind: 'stock', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'OR.PA', name: "L'Oréal", kind: 'stock', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'TTE.PA', name: 'TotalEnergies', kind: 'stock', currency: 'EUR', exchange: 'Euronext Paris' },
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock', currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', kind: 'stock', currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'BTC', name: 'Bitcoin', kind: 'crypto', currency: 'EUR', exchange: 'Crypto' },
  { symbol: 'ETH', name: 'Ethereum', kind: 'crypto', currency: 'EUR', exchange: 'Crypto' },
]

export function demoSymbolSearch(query: string): SymbolSearchResult[] {
  const q = query.toLowerCase()
  return demoSymbolCatalog
    .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, 8)
}

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
