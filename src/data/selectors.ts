/** Pure computation helpers over the domain data (no I/O). */
import type {
  Account,
  Budget,
  BudgetEnvelope,
  Category,
  Goal,
  Holding,
  HoldingEnvelope,
  HoldingKind,
  NetWorthSnapshot,
  Quote,
  Subscription,
  Transaction,
} from '@/types'

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isInMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function monthOffset(ref: Date, offset: number): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + offset, 1)
}

/** Total spent (positive number) in a category for the given month. */
export function spentForCategory(txns: Transaction[], categoryId: string, ref = new Date()): number {
  return txns
    .filter((t) => t.categoryId === categoryId && t.amount < 0 && isInMonth(t.bookingDate, ref))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function buildEnvelopes(
  budgets: Budget[],
  categories: Category[],
  txns: Transaction[],
  ref = new Date(),
): BudgetEnvelope[] {
  return budgets
    .map((budget) => {
      const category = categories.find((c) => c.id === budget.categoryId)
      if (!category) return null
      const spent = spentForCategory(txns, budget.categoryId, ref)
      const remaining = budget.amount - spent
      const ratio = budget.amount > 0 ? spent / budget.amount : 0
      return { budget, category, spent, remaining, ratio }
    })
    .filter((e): e is BudgetEnvelope => e !== null)
    .sort((a, b) => b.ratio - a.ratio)
}

export function totalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

export function monthSpending(txns: Transaction[], ref = new Date()): number {
  return txns
    .filter((t) => t.amount < 0 && isInMonth(t.bookingDate, ref))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function monthIncome(txns: Transaction[], ref = new Date()): number {
  return txns
    .filter((t) => t.amount > 0 && isInMonth(t.bookingDate, ref))
    .reduce((sum, t) => sum + t.amount, 0)
}

export interface CategorySlice {
  category: Category
  amount: number
  ratio: number
}

/** Spending breakdown by category for the month (sorted desc). */
export function categoryBreakdown(
  txns: Transaction[],
  categories: Category[],
  ref = new Date(),
): CategorySlice[] {
  const totals = new Map<string, number>()
  for (const t of txns) {
    if (t.amount >= 0 || !isInMonth(t.bookingDate, ref)) continue
    const key = t.categoryId ?? 'uncategorized'
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(t.amount))
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0) || 1
  const slices: CategorySlice[] = []
  for (const [key, amount] of totals) {
    const category =
      categories.find((c) => c.id === key) ??
      ({ id: 'uncategorized', name: 'À classer', icon: 'circle-dashed', color: '#a89e8c', householdId: '', parentId: null, isDefault: true } as Category)
    slices.push({ category, amount, ratio: amount / grand })
  }
  return slices.sort((a, b) => b.amount - a.amount)
}

export interface MonthPoint {
  label: string
  monthIso: string
  spending: number
  income: number
}

/** Spending & income for the last `count` months (oldest → newest). */
export function monthlyEvolution(txns: Transaction[], count = 6): MonthPoint[] {
  const now = new Date()
  const points: MonthPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const ref = monthOffset(now, -i)
    points.push({
      label: ref.toLocaleDateString('fr-FR', { month: 'short' }),
      monthIso: ref.toISOString(),
      spending: monthSpending(txns, ref),
      income: monthIncome(txns, ref),
    })
  }
  return points
}

export function activeSubscriptionsMonthlyCost(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive && s.isConfirmed)
    .reduce((sum, s) => {
      if (s.frequency === 'monthly') return sum + s.amount
      if (s.frequency === 'yearly') return sum + s.amount / 12
      if (s.frequency === 'weekly') return sum + (s.amount * 52) / 12
      return sum
    }, 0)
}

// ─────────────────────────────────────────────────────────────────────────
// Prévision de fin de mois (cashflow forecast)
// Projection 100 % déterministe : aucune IA. On combine trois signaux déjà
// présents dans les données :
//   • revenus récurrents à venir (salaires) — détectés sur l'historique
//   • charges fixes à venir (loyer, énergie, abonnements) — idem
//   • dépenses variables — moyenne journalière sur 90 j glissants
//
// La récurrence est détectée STATISTIQUEMENT (pas via le flag isRecurring, qui
// n'est posé que sur les dépenses côté serveur — jamais sur les salaires).
// ─────────────────────────────────────────────────────────────────────────

const MONTH_WORDS = new Set([
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'aout', 'septembre', 'octobre', 'novembre', 'decembre',
])

/**
 * Clé de regroupement d'un libellé, robuste au bruit mensuel : on retire
 * accents, chiffres (références/dates), ponctuation, noms de mois et tokens
 * trop courts, puis on trie les tokens (insensible à l'ordre des mots).
 * Ex. « VIR SALAIRE NOVA REF 8841 » et « SALAIRE NOVA — JUIN » → « nova salaire ».
 */
function labelKey(s: string): string {
  const cleaned = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // retire chiffres et ponctuation
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = cleaned
    .split(' ')
    .filter((t) => t.length >= 3 && !MONTH_WORDS.has(t))
    .sort()
  return tokens.join(' ')
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

interface RecurringEvent {
  /** Clé libellé (charges uniquement) — sert à exclure du « burn » variable. */
  key: string
  /** Libellé lisible (charges) ; vide pour les revenus (résolu via la catégorie). */
  label: string
  /** Catégorie de l'opération (pour afficher un nom dans le détail). */
  categoryId: string | null
  /** Montant signé médian (négatif = charge). */
  amount: number
  /** Prochaine occurrence projetée = dernière occurrence + 1 période. */
  nextDateIso: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Détecte un virement (interne au foyer ou vers un proche) plutôt qu'une dépense
 * de consommation. Ces mouvements d'argent ne doivent pas alimenter l'estimation
 * des dépenses (ni être comptés comme charges fixes).
 */
function isTransferLabel(label: string): boolean {
  const s = label.toLowerCase()
  return /\b(emis|virement|vir)\b/.test(s) || s.includes('en votre faveur')
}
const INCOME_WINDOW_DAYS = 150
const MONTHLY_REGULARITY = 0.6 // présent dans ≥ 60 % des mois couverts

/** Nombre de mois couverts entre deux clés « YYYY-MM » (inclus). */
function monthSpan(firstMonth: string, lastMonth: string): number {
  const [ay, am] = firstMonth.split('-').map(Number)
  const [by, bm] = lastMonth.split('-').map(Number)
  return (by - ay) * 12 + (bm - am) + 1
}

/**
 * À partir des revenus d'une catégorie, raisonne PAR MOIS (et non par
 * transaction) : on somme par mois civil, on vérifie une présence mensuelle
 * régulière, puis on projette le mois suivant. Robuste aux compléments du même
 * jour et au cas couple (somme des deux salaires d'un mois).
 */
function monthlyIncomeFrom(arr: Transaction[]): { amount: number; nextDateIso: string } | null {
  const sums = new Map<string, number>()
  const txByMonth = new Map<string, Transaction[]>()
  for (const t of arr) {
    const m = t.bookingDate.slice(0, 7)
    sums.set(m, (sums.get(m) ?? 0) + t.amount)
    const list = txByMonth.get(m)
    if (list) list.push(t)
    else txByMonth.set(m, [t])
  }
  const months = [...sums.keys()].sort()
  if (months.length < 2) return null
  const span = monthSpan(months[0], months[months.length - 1])
  if (months.length / span < MONTHLY_REGULARITY) return null // pas une présence mensuelle

  // Montant mensuel typique = médiane des totaux par mois (résiste aux mois doublés).
  const amount = median([...sums.values()])

  // Prochaine échéance : jour du plus gros versement du dernier mois, reporté au mois suivant.
  const lastMonth = months[months.length - 1]
  const repr = [...txByMonth.get(lastMonth)!].sort((a, b) => b.amount - a.amount)[0]
  const reprDay = new Date(repr.bookingDate).getDate()
  const [ly, lm] = lastMonth.split('-').map(Number)
  const ny = lm === 12 ? ly + 1 : ly
  const nm = lm === 12 ? 1 : lm + 1
  const daysInNext = new Date(ny, nm, 0).getDate()
  const next = new Date(ny, nm - 1, Math.min(reprDay, daysInNext))
  return { amount, nextDateIso: next.toISOString() }
}

/**
 * Détecte les REVENUS récurrents. Signal stable = la CATÉGORIE (« Salaire »),
 * car le montant et le libellé d'un salaire varient souvent d'un mois à l'autre.
 * On regroupe par catégorie sur 150 j puis on raisonne par mois (cf.
 * monthlyIncomeFrom) — le cumul mensuel gère naturellement le cas couple.
 */
function detectRecurringIncome(txns: Transaction[], ref: Date): RecurringEvent[] {
  const cutoff = ref.getTime() - INCOME_WINDOW_DAYS * DAY_MS
  const byCategory = new Map<string, Transaction[]>()
  for (const t of txns) {
    if (t.amount <= 0 || t.categoryId === null) continue // sans catégorie : aucun signal fiable
    if (new Date(t.bookingDate).getTime() < cutoff) continue
    const arr = byCategory.get(t.categoryId)
    if (arr) arr.push(t)
    else byCategory.set(t.categoryId, [t])
  }

  const events: RecurringEvent[] = []
  for (const [categoryId, arr] of byCategory.entries()) {
    const ev = monthlyIncomeFrom(arr)
    if (ev) events.push({ key: '', label: '', categoryId, ...ev })
  }
  return events
}

/** Regroupe les charges par libellé normalisé. */
function groupChargesByLabel(txns: Transaction[]): Transaction[][] {
  const groups = new Map<string, Transaction[]>()
  for (const t of txns) {
    const key = labelKey(t.cleanLabel || t.rawLabel)
    if (!key) continue
    const arr = groups.get(key)
    if (arr) arr.push(t)
    else groups.set(key, [t])
  }
  return [...groups.values()]
}

const CHARGE_STABILITY_MAX = 0.25 // écart médian relatif max : au-delà = dépense variable
const CHARGE_ACTIVE_DAYS = 45 // dernière occurrence plus ancienne = charge terminée

/** Écart médian relatif (MAD/médiane) — robuste pour juger la stabilité d'un montant. */
function relativeSpread(values: number[]): number {
  const m = median(values)
  if (m === 0) return Infinity
  const deviations = values.map((v) => Math.abs(v - m))
  return median(deviations) / Math.abs(m)
}

/**
 * Détecte les CHARGES récurrentes à cadence ~mensuelle : regroupement par
 * libellé, intervalle médian régulier (~24–38 j), MONTANT STABLE (sinon c'est
 * une dépense variable type magasin), et charge encore ACTIVE (récente).
 */
function detectRecurringCharges(txns: Transaction[], ref: Date): RecurringEvent[] {
  const candidates = txns.filter((t) => t.amount < 0 && !isTransferLabel(t.cleanLabel || t.rawLabel))
  const events: RecurringEvent[] = []
  for (const arr of groupChargesByLabel(candidates)) {
    if (arr.length < 2) continue
    arr.sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))

    const gaps: number[] = []
    for (let i = 1; i < arr.length; i++) {
      gaps.push((new Date(arr[i].bookingDate).getTime() - new Date(arr[i - 1].bookingDate).getTime()) / DAY_MS)
    }
    const medGap = median(gaps)
    if (medGap < 24 || medGap > 38) continue // pas mensuel

    const amounts = arr.map((t) => Math.abs(t.amount))
    if (relativeSpread(amounts) > CHARGE_STABILITY_MAX) continue // montant trop variable → pas une charge fixe

    const last = arr[arr.length - 1]
    const lastTime = new Date(last.bookingDate).getTime()
    if ((ref.getTime() - lastTime) / DAY_MS > CHARGE_ACTIVE_DAYS) continue // charge terminée (plus prélevée)

    const next = new Date(lastTime + Math.round(medGap) * DAY_MS)
    events.push({
      key: labelKey(last.cleanLabel || last.rawLabel),
      label: last.cleanLabel || last.rawLabel,
      categoryId: last.categoryId,
      amount: median(arr.map((t) => t.amount)),
      nextDateIso: next.toISOString(),
    })
  }
  return events
}

export interface ForecastPoint {
  dateIso: string
  /** Jour du mois (1–31). */
  day: number
  /** Solde projeté à la fin de ce jour. */
  balance: number
  isToday: boolean
}

/** Une échéance datée du détail de prévision (revenu ou charge à venir). */
export interface ForecastItem {
  /** Clé de la charge (pour masquage manuel) ; vide pour les revenus. */
  key: string
  label: string
  categoryId: string | null
  /** Montant positif (magnitude). */
  amount: number
  dateIso: string
  day: number
  /** Charge masquée manuellement (listée mais non comptée dans la projection). */
  excluded: boolean
}

export interface ForecastResult {
  points: ForecastPoint[]
  /** Solde total aujourd'hui (point de départ). */
  startBalance: number
  /** Solde projeté au dernier jour du mois. */
  endBalance: number
  /** endBalance − startBalance. */
  delta: number
  /** Jour le plus bas de la projection (risque de découvert). */
  lowestPoint: ForecastPoint
  /** Revenus récurrents encore attendus ce mois-ci. */
  upcomingIncome: number
  /** Charges fixes récurrentes encore attendues ce mois-ci. */
  upcomingFixed: number
  /** Dépenses variables projetées sur les jours restants. */
  variableProjected: number
  /** Dépense variable moyenne par jour (90 j glissants). */
  dailyBurn: number
  /** Nombre de jours restants jusqu'à la fin du mois. */
  remainingDays: number
  /** Détail des revenus à venir (pour le panneau de détail). */
  incomeItems: ForecastItem[]
  /** Détail des charges fixes à venir. */
  fixedItems: ForecastItem[]
}

const VARIABLE_WINDOW_DAYS = 90

/**
 * Projette le solde du foyer jour par jour jusqu'à la fin du mois courant.
 * Purement arithmétique et reproductible.
 */
export function monthForecast(
  accounts: Account[],
  txns: Transaction[],
  ref = new Date(),
  excludedChargeKeys: ReadonlySet<string> = new Set(),
): ForecastResult {
  const start = totalBalance(accounts)
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const today = ref.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const outEvents = detectRecurringCharges(txns, ref)
  const inEvents = detectRecurringIncome(txns, ref)
  // Clés des charges récurrentes, pour les exclure du « burn » variable.
  const chargeKeys = new Set(outEvents.map((e) => e.key))

  // Dépense variable moyenne / jour = dépenses NON récurrentes sur 90 j.
  const cutoff = new Date(ref)
  cutoff.setDate(cutoff.getDate() - VARIABLE_WINDOW_DAYS)
  let variableSum = 0
  for (const t of txns) {
    if (t.amount >= 0 || t.subscriptionId) continue
    if (chargeKeys.has(labelKey(t.cleanLabel || t.rawLabel))) continue
    if (isTransferLabel(t.cleanLabel || t.rawLabel)) continue // virements : pas de la consommation
    const d = new Date(t.bookingDate)
    if (d >= cutoff && d <= ref) variableSum += Math.abs(t.amount)
  }
  const dailyBurn = variableSum / VARIABLE_WINDOW_DAYS

  // Revenus : on RATTRAPE une échéance un peu en retard (un salaire finit par tomber).
  // Plancher à demain : la boucle n'applique les flux que pour day > today.
  const scheduleIncomeDay = (nextDateIso: string): number | null => {
    const d = new Date(nextDateIso)
    if (d.getFullYear() !== year || d.getMonth() !== month) return null
    return Math.min(Math.max(d.getDate(), today + 1), daysInMonth)
  }
  // Charges : PAS de rattrapage — une échéance déjà passée est soit déjà payée,
  // soit une charge terminée. On ne projette que les prélèvements strictement à venir.
  const scheduleChargeDay = (nextDateIso: string): number | null => {
    const d = new Date(nextDateIso)
    if (d.getFullYear() !== year || d.getMonth() !== month) return null
    if (d.getDate() <= today) return null
    return Math.min(d.getDate(), daysInMonth)
  }
  const dayIso = (day: number) => new Date(year, month, day).toISOString()
  const outByDay = new Map<number, number>()
  const inByDay = new Map<number, number>()
  const fixedItems: ForecastItem[] = []
  const incomeItems: ForecastItem[] = []
  let upcomingFixed = 0
  let upcomingIncome = 0
  for (const e of outEvents) {
    const day = scheduleChargeDay(e.nextDateIso)
    if (day === null) continue
    const excluded = excludedChargeKeys.has(e.key)
    fixedItems.push({ key: e.key, label: e.label, categoryId: e.categoryId, amount: Math.abs(e.amount), dateIso: dayIso(day), day, excluded })
    if (excluded) continue // masquée : listée mais non comptée dans la projection
    outByDay.set(day, (outByDay.get(day) ?? 0) + e.amount)
    upcomingFixed += Math.abs(e.amount)
  }
  for (const e of inEvents) {
    const day = scheduleIncomeDay(e.nextDateIso)
    if (day === null) continue
    inByDay.set(day, (inByDay.get(day) ?? 0) + e.amount)
    upcomingIncome += e.amount
    incomeItems.push({ key: '', label: e.label, categoryId: e.categoryId, amount: e.amount, dateIso: dayIso(day), day, excluded: false })
  }
  fixedItems.sort((a, b) => a.day - b.day)
  incomeItems.sort((a, b) => a.day - b.day)

  const points: ForecastPoint[] = []
  let balance = start
  let variableProjected = 0

  for (let day = today; day <= daysInMonth; day++) {
    if (day > today) {
      balance -= dailyBurn
      variableProjected += dailyBurn
      balance += outByDay.get(day) ?? 0 // montants négatifs
      balance += inByDay.get(day) ?? 0
    }
    points.push({
      dateIso: new Date(year, month, day).toISOString(),
      day,
      balance,
      isToday: day === today,
    })
  }

  const lowestPoint = points.reduce((min, p) => (p.balance < min.balance ? p : min), points[0])
  return {
    points,
    startBalance: start,
    endBalance: balance,
    delta: balance - start,
    lowestPoint,
    upcomingIncome,
    upcomingFixed,
    variableProjected,
    dailyBurn,
    remainingDays: daysInMonth - today,
    incomeItems,
    fixedItems,
  }
}

export interface GoalProgress {
  goal: Goal
  ratio: number
  remaining: number
  monthlyNeeded: number | null
}

export function goalProgress(goal: Goal): GoalProgress {
  const ratio = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
  let monthlyNeeded: number | null = null
  if (goal.targetDate && remaining > 0) {
    const months = Math.max(
      1,
      Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)),
    )
    monthlyNeeded = remaining / months
  }
  return { goal, ratio, remaining, monthlyNeeded }
}

// ─────────────────────────────────────────────────────────────────────────
// Patrimoine & investissement
// Valorisation 100 % déterministe : un actif coté vaut quantité × cours réel,
// un actif lié à un compte vaut le solde du compte, sinon sa valeur manuelle.
// ─────────────────────────────────────────────────────────────────────────

export interface HoldingValuation {
  holding: Holding
  quote: Quote | null
  /** Valeur actuelle en euros. */
  value: number
  /** Prix de revient (capital investi). */
  cost: number
  /** value − cost. */
  gain: number
  /** gain / cost (0 si cost nul). */
  gainPct: number
  /** Variation du jour en euros (uniquement si cours réel). */
  dayChange: number
  /** True quand un cours de marché alimente la valeur. */
  hasLivePrice: boolean
}

/** Valorise une position à partir des cours et des soldes de comptes. */
export function valuateHolding(
  holding: Holding,
  quotes: Map<string, Quote>,
  accounts: Account[],
): HoldingValuation {
  const quote = holding.symbol ? quotes.get(holding.symbol) ?? null : null
  let value: number
  let hasLivePrice = false
  if (holding.symbol && quote) {
    value = holding.quantity * quote.price
    hasLivePrice = true
  } else if (holding.linkedAccountId) {
    value = accounts.find((a) => a.id === holding.linkedAccountId)?.balance ?? holding.manualValue ?? holding.costBasis
  } else if (holding.manualValue != null) {
    value = holding.manualValue
  } else {
    value = holding.costBasis
  }
  const cost = holding.costBasis
  const gain = value - cost
  const gainPct = cost > 0 ? gain / cost : 0
  const dayChange = hasLivePrice && quote ? value * (quote.changePct / 100) : 0
  return { holding, quote, value, cost, gain, gainPct, dayChange, hasLivePrice }
}

export interface AllocationSlice<K extends string> {
  key: K
  value: number
  ratio: number
}

export interface PortfolioSummary {
  valuations: HoldingValuation[]
  /** Valeur totale de toutes les positions (affichage portefeuille). */
  totalValue: number
  /** Capital total investi (somme des prix de revient). */
  totalCost: number
  /** Plus/moins-value latente totale. */
  gain: number
  gainPct: number
  /** Variation du jour cumulée (positions cotées). */
  dayChange: number
  dayChangePct: number
  /** Répartition par classe d'actif (donut). */
  byKind: AllocationSlice<HoldingKind>[]
  /** Répartition par enveloppe (PEA, AV…). */
  byEnvelope: AllocationSlice<HoldingEnvelope>[]
}

function allocate<K extends string>(entries: [K, number][], total: number): AllocationSlice<K>[] {
  return entries
    .map(([key, value]) => ({ key, value, ratio: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function portfolioSummary(holdings: Holding[], quotes: Map<string, Quote>, accounts: Account[]): PortfolioSummary {
  const valuations = holdings.map((h) => valuateHolding(h, quotes, accounts))
  const totalValue = valuations.reduce((s, v) => s + v.value, 0)
  const totalCost = valuations.reduce((s, v) => s + v.cost, 0)
  const gain = totalValue - totalCost
  const dayChange = valuations.reduce((s, v) => s + v.dayChange, 0)
  const prevValue = totalValue - dayChange

  const kindTotals = new Map<HoldingKind, number>()
  const envTotals = new Map<HoldingEnvelope, number>()
  for (const v of valuations) {
    kindTotals.set(v.holding.kind, (kindTotals.get(v.holding.kind) ?? 0) + v.value)
    envTotals.set(v.holding.envelope, (envTotals.get(v.holding.envelope) ?? 0) + v.value)
  }

  return {
    valuations,
    totalValue,
    totalCost,
    gain,
    gainPct: totalCost > 0 ? gain / totalCost : 0,
    dayChange,
    dayChangePct: prevValue > 0 ? dayChange / prevValue : 0,
    byKind: allocate([...kindTotals.entries()], totalValue),
    byEnvelope: allocate([...envTotals.entries()], totalValue),
  }
}

export type TrendRange = '1M' | '6M' | '1Y' | 'ALL'

export interface NetWorthSeries {
  points: { asOf: string; total: number }[]
  /** Variation sur la période affichée (€). */
  delta: number
  /** Variation sur la période affichée (ratio). */
  deltaPct: number
}

const RANGE_DAYS: Record<Exclude<TrendRange, 'ALL'>, number> = { '1M': 31, '6M': 184, '1Y': 366 }

/**
 * Série d'historique de valeur nette filtrée sur une plage. Tri chronologique,
 * delta = dernier − premier point de la fenêtre.
 */
export function buildNetWorthSeries(snapshots: NetWorthSnapshot[], range: TrendRange = '6M', ref = new Date()): NetWorthSeries {
  const sorted = [...snapshots].sort((a, b) => a.asOf.localeCompare(b.asOf))
  let windowed = sorted
  if (range !== 'ALL') {
    const cutoff = new Date(ref)
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range])
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    windowed = sorted.filter((s) => s.asOf >= cutoffIso)
  }
  const points = windowed.map((s) => ({ asOf: s.asOf, total: s.total }))
  const first = points[0]?.total ?? 0
  const last = points[points.length - 1]?.total ?? 0
  const delta = last - first
  return { points, delta, deltaPct: first > 0 ? delta / first : 0 }
}

export interface NetWorth {
  total: number
  /** Liquidités bancaires (comptes courants + livrets agrégés). */
  cash: number
  /** Valeur des investissements hors comptes déjà agrégés (anti double-comptage). */
  invested: number
}

/**
 * Valeur nette du foyer = liquidités bancaires + investissements.
 * Une position liée à un compte (livret agrégé) reflète une somme DÉJÀ comptée
 * dans les soldes : on l'exclut du cumul « invested » pour ne pas la doubler.
 */
export function netWorth(accounts: Account[], holdings: Holding[], quotes: Map<string, Quote>): NetWorth {
  const cash = totalBalance(accounts)
  const invested = holdings
    .filter((h) => h.linkedAccountId === null)
    .reduce((s, h) => s + valuateHolding(h, quotes, accounts).value, 0)
  return { total: cash + invested, cash, invested }
}
