/** Calculs du bilan annuel (« Wrapped »). 100 % déterministe, aucune IA. */
import type { Category, Transaction } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000
// Virements sortants (EMIS INST Vers…, VIR, VIREMENT) : déplacements d'argent,
// pas de la consommation → exclus du bilan des dépenses.
const TRANSFER_RE = /\b(emis|virement|vir)\b/i

function looksLikeTransfer(label: string): boolean {
  return TRANSFER_RE.test(label.toLowerCase())
}

export interface WrappedCategory {
  category: Category | null
  amount: number
  share: number
}

export interface WrappedMonth {
  label: string
  total: number
}

export interface WrappedMerchant {
  label: string
  count: number
  total: number
}

export interface WrappedExpense {
  label: string
  amount: number
  dateIso: string
  category: Category | null
}

export interface WrappedData {
  year: number
  monthsElapsed: number
  daysElapsed: number
  totalSpent: number
  txnCount: number
  avgPerMonth: number
  avgPerDay: number
  categories: WrappedCategory[]
  topCategory: WrappedCategory | null
  byMonth: WrappedMonth[]
  busiestMonth: WrappedMonth | null
  topMerchant: WrappedMerchant | null
  biggestExpense: WrappedExpense | null
  hasEnoughData: boolean
}

const UNCATEGORIZED: Category = {
  id: 'uncategorized', householdId: '', name: 'À classer',
  icon: 'circle-dashed', color: '#a89e8c', parentId: null, isDefault: true,
}

/** Construit le bilan d'une année civile (du 1er janvier à aujourd'hui). */
export function buildWrapped(
  txns: Transaction[],
  categories: Category[],
  year: number,
  now = new Date(),
): WrappedData {
  const start = new Date(year, 0, 1)
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const expenses = txns.filter((t) => {
    if (t.amount >= 0) return false
    const d = new Date(t.bookingDate)
    if (d < start || d > now) return false
    return !looksLikeTransfer(t.cleanLabel || t.rawLabel)
  })

  const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const txnCount = expenses.length
  const monthsElapsed = year === now.getFullYear() ? now.getMonth() + 1 : 12
  const daysElapsed = Math.max(1, Math.round((now.getTime() - start.getTime()) / DAY_MS) + 1)

  // Par catégorie
  const catTotals = new Map<string, number>()
  for (const t of expenses) {
    const key = t.categoryId ?? 'uncategorized'
    catTotals.set(key, (catTotals.get(key) ?? 0) + Math.abs(t.amount))
  }
  const categoriesRanked: WrappedCategory[] = [...catTotals.entries()]
    .map(([key, amount]) => ({
      category: key === 'uncategorized' ? UNCATEGORIZED : catMap.get(key) ?? UNCATEGORIZED,
      amount,
      share: totalSpent > 0 ? amount / totalSpent : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Par mois
  const monthTotals = new Array(monthsElapsed).fill(0)
  for (const t of expenses) {
    const m = new Date(t.bookingDate).getMonth()
    if (m < monthsElapsed) monthTotals[m] += Math.abs(t.amount)
  }
  const byMonth: WrappedMonth[] = monthTotals.map((total, m) => ({
    label: new Date(year, m, 1).toLocaleDateString('fr-FR', { month: 'short' }),
    total,
  }))
  const busiestMonth = byMonth.reduce<WrappedMonth | null>(
    (best, m) => (best === null || m.total > best.total ? m : best),
    null,
  )

  // Marchand le plus fréquent (au moins 2 visites pour être marquant)
  const merchantMap = new Map<string, { count: number; total: number }>()
  for (const t of expenses) {
    const label = (t.cleanLabel || t.rawLabel).trim()
    if (!label) continue
    const cur = merchantMap.get(label) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Math.abs(t.amount)
    merchantMap.set(label, cur)
  }
  const topMerchant = [...merchantMap.entries()]
    .map(([label, v]) => ({ label, count: v.count, total: v.total }))
    .filter((m) => m.count >= 2)
    .sort((a, b) => b.count - a.count || b.total - a.total)[0] ?? null

  // Plus gros achat
  const biggest = expenses.reduce<Transaction | null>(
    (max, t) => (max === null || Math.abs(t.amount) > Math.abs(max.amount) ? t : max),
    null,
  )
  const biggestExpense: WrappedExpense | null = biggest
    ? {
        label: biggest.cleanLabel || biggest.rawLabel,
        amount: Math.abs(biggest.amount),
        dateIso: biggest.bookingDate,
        category: biggest.categoryId ? catMap.get(biggest.categoryId) ?? null : null,
      }
    : null

  return {
    year,
    monthsElapsed,
    daysElapsed,
    totalSpent,
    txnCount,
    avgPerMonth: totalSpent / monthsElapsed,
    avgPerDay: totalSpent / daysElapsed,
    categories: categoriesRanked,
    topCategory: categoriesRanked[0] ?? null,
    byMonth,
    busiestMonth,
    topMerchant,
    biggestExpense,
    hasEnoughData: txnCount >= 15,
  }
}
