import { describe, expect, it } from 'vitest'
import type { Budget, Category, Goal, Subscription, Transaction } from '@/types'
import {
  activeSubscriptionsMonthlyCost,
  buildEnvelopes,
  categoryBreakdown,
  goalProgress,
  monthIncome,
  monthSpending,
  spentForCategory,
  totalBalance,
} from './selectors'

const REF = new Date('2026-06-15T12:00:00Z')

function txn(partial: Partial<Transaction>): Transaction {
  return {
    id: 't',
    accountId: 'a',
    householdId: 'h',
    externalId: 'x',
    bookingDate: '2026-06-10T00:00:00Z',
    amount: -10,
    currency: 'EUR',
    rawLabel: '',
    cleanLabel: '',
    categoryId: 'cat-food',
    categorySource: 'auto',
    isRecurring: false,
    subscriptionId: null,
    createdAt: '2026-06-10T00:00:00Z',
    ...partial,
  }
}

const food: Category = {
  id: 'cat-food',
  householdId: 'h',
  name: 'Courses',
  icon: 'shopping-cart',
  color: '#f00',
  parentId: null,
  isDefault: true,
}

describe('spentForCategory', () => {
  it('additionne les dépenses du mois pour une catégorie', () => {
    const txns = [
      txn({ amount: -30 }),
      txn({ amount: -20 }),
      txn({ amount: 100 }), // revenu ignoré
      txn({ amount: -5, categoryId: 'autre' }), // autre catégorie
      txn({ amount: -50, bookingDate: '2026-05-10T00:00:00Z' }), // autre mois
    ]
    expect(spentForCategory(txns, 'cat-food', REF)).toBe(50)
  })
})

describe('buildEnvelopes', () => {
  it('calcule reste/ratio et trie par ratio décroissant', () => {
    const budgets: Budget[] = [
      { id: 'b1', householdId: 'h', categoryId: 'cat-food', amount: 100, period: 'monthly', createdAt: '' },
      { id: 'b2', householdId: 'h', categoryId: 'cat-x', amount: 200, period: 'monthly', createdAt: '' },
    ]
    const cats: Category[] = [food, { ...food, id: 'cat-x', name: 'X' }]
    const txns = [txn({ amount: -80 }), txn({ amount: -20, categoryId: 'cat-x' })]
    const env = buildEnvelopes(budgets, cats, txns, REF)
    expect(env).toHaveLength(2)
    expect(env[0].category.id).toBe('cat-food') // ratio 0.8 > 0.1
    expect(env[0].spent).toBe(80)
    expect(env[0].remaining).toBe(20)
    expect(env[0].ratio).toBeCloseTo(0.8)
  })

  it('ignore un budget sans catégorie correspondante', () => {
    const budgets: Budget[] = [
      { id: 'b1', householdId: 'h', categoryId: 'inconnue', amount: 100, period: 'monthly', createdAt: '' },
    ]
    expect(buildEnvelopes(budgets, [food], [], REF)).toHaveLength(0)
  })
})

describe('monthSpending / monthIncome', () => {
  const txns = [txn({ amount: -40 }), txn({ amount: -10 }), txn({ amount: 1500 })]
  it('somme les dépenses du mois en valeur positive', () => {
    expect(monthSpending(txns, REF)).toBe(50)
  })
  it('somme les revenus du mois', () => {
    expect(monthIncome(txns, REF)).toBe(1500)
  })
})

describe('totalBalance', () => {
  it('additionne les soldes', () => {
    expect(totalBalance([{ balance: 100 }, { balance: 50.5 }] as never)).toBe(150.5)
  })
})

describe('categoryBreakdown', () => {
  it('regroupe par catégorie avec ratios qui somment à 1', () => {
    const txns = [txn({ amount: -75 }), txn({ amount: -25, categoryId: 'cat-x' })]
    const cats = [food, { ...food, id: 'cat-x', name: 'X' }]
    const slices = categoryBreakdown(txns, cats, REF)
    expect(slices[0].amount).toBe(75)
    const sum = slices.reduce((s, x) => s + x.ratio, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('range les transactions sans catégorie sous « À classer »', () => {
    const slices = categoryBreakdown([txn({ amount: -10, categoryId: null })], [], REF)
    expect(slices[0].category.name).toBe('À classer')
  })
})

describe('activeSubscriptionsMonthlyCost', () => {
  function sub(p: Partial<Subscription>): Subscription {
    return {
      id: 's',
      householdId: 'h',
      merchantLabel: 'X',
      amount: 10,
      frequency: 'monthly',
      nextExpectedDate: '2026-07-01',
      categoryId: null,
      isConfirmed: true,
      isActive: true,
      ...p,
    }
  }
  it('normalise les fréquences en coût mensuel', () => {
    const cost = activeSubscriptionsMonthlyCost([
      sub({ amount: 10, frequency: 'monthly' }),
      sub({ amount: 120, frequency: 'yearly' }), // 10/mois
    ])
    expect(cost).toBeCloseTo(20)
  })
  it('ignore les abonnements non confirmés ou inactifs', () => {
    expect(activeSubscriptionsMonthlyCost([sub({ isConfirmed: false })])).toBe(0)
    expect(activeSubscriptionsMonthlyCost([sub({ isActive: false })])).toBe(0)
  })
})

describe('goalProgress', () => {
  const base: Goal = {
    id: 'g',
    householdId: 'h',
    name: 'Vacances',
    targetAmount: 1000,
    currentAmount: 250,
    targetDate: null,
    linkedAccountId: null,
    color: '#000',
  }
  it('calcule ratio et reste', () => {
    const p = goalProgress(base)
    expect(p.ratio).toBeCloseTo(0.25)
    expect(p.remaining).toBe(750)
    expect(p.monthlyNeeded).toBeNull()
  })
  it('plafonne le ratio à 1 et le reste à 0 une fois atteint', () => {
    const p = goalProgress({ ...base, currentAmount: 1200 })
    expect(p.ratio).toBe(1)
    expect(p.remaining).toBe(0)
  })
})
