/** Pure computation helpers over the domain data (no I/O). */
import type { Account, Budget, BudgetEnvelope, Category, Goal, Subscription, Transaction } from '@/types'

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
