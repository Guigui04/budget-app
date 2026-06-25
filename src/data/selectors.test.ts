import { describe, expect, it } from 'vitest'
import type { Budget, Category, Goal, Holding, NetWorthSnapshot, Quote, Subscription, Transaction } from '@/types'
import type { Account } from '@/types'
import {
  activeSubscriptionsMonthlyCost,
  buildEnvelopes,
  buildNetWorthSeries,
  categoryBreakdown,
  goalProgress,
  monthForecast,
  monthIncome,
  monthSpending,
  netWorth,
  portfolioSummary,
  spentForCategory,
  totalBalance,
  valuateHolding,
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

describe('monthForecast', () => {
  const FREF = new Date('2026-06-24T12:00:00')
  function account(balance: number): Account {
    return {
      id: 'acc-1', bankConnectionId: 'bc', householdId: 'h', externalAccountId: 'x',
      name: 'Courant', iban: 'FR76', currency: 'EUR', balance,
      balanceUpdatedAt: FREF.toISOString(), kind: 'checking',
    }
  }

  it('capte un salaire récurrent à venir, même sans flag isRecurring', () => {
    // Salaire les 28/04 et 28/05 → prochaine occurrence projetée ~28/06 (à venir).
    const txns = [
      txn({ cleanLabel: 'VIR SALAIRE NOVA', amount: 2500, bookingDate: '2026-04-28', isRecurring: false }),
      txn({ cleanLabel: 'VIR SALAIRE NOVA', amount: 2500, bookingDate: '2026-05-28', isRecurring: false }),
    ]
    const f = monthForecast([account(1000)], txns, FREF)
    expect(f.upcomingIncome).toBeGreaterThan(2000)
    expect(f.endBalance).toBeGreaterThan(1000)
  })

  it('capte un salaire à montant variable regroupé par catégorie (cas réel)', () => {
    // Même catégorie « Salaire », montants qui varient de ~7 %, dates ~mensuelles.
    const txns = [
      txn({ categoryId: 'cat-salaire', amount: 829.37, bookingDate: '2026-03-04' }),
      txn({ categoryId: 'cat-salaire', amount: 896.01, bookingDate: '2026-03-30' }),
      txn({ categoryId: 'cat-salaire', amount: 951, bookingDate: '2026-04-27' }),
      txn({ categoryId: 'cat-salaire', amount: 915.89, bookingDate: '2026-05-28' }),
    ]
    const f = monthForecast([account(500)], txns, FREF)
    expect(f.upcomingIncome).toBeGreaterThan(800)
    expect(f.upcomingIncome).toBeLessThan(1000)
  })

  it('isole le salaire (par catégorie) d\'une autre rentrée de montant proche', () => {
    // Sans isolation par catégorie, le remboursement de montant voisin
    // casserait la cadence et le salaire passerait inaperçu.
    const txns = [
      txn({ categoryId: 'cat-salaire', amount: 2000, bookingDate: '2026-04-26' }),
      txn({ categoryId: 'cat-salaire', amount: 2000, bookingDate: '2026-05-26' }),
      txn({ categoryId: 'cat-remb', amount: 2010, bookingDate: '2026-06-10' }), // remboursement ponctuel
    ]
    const f = monthForecast([account(1000)], txns, FREF)
    expect(f.upcomingIncome).toBeGreaterThan(1800)
  })

  it('capte une charge fixe à venir sans la compter dans les dépenses variables', () => {
    const txns = [
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-04-26' }),
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-05-26' }),
    ]
    const f = monthForecast([account(3000)], txns, FREF)
    expect(f.upcomingFixed).toBeGreaterThan(1000)
    expect(f.variableProjected).toBe(0)
  })

  it('rejette une enseigne à montant variable (ZARA) des charges fixes', () => {
    const txns = [
      txn({ cleanLabel: 'ZARA', amount: -35, bookingDate: '2026-03-15' }),
      txn({ cleanLabel: 'ZARA', amount: -130, bookingDate: '2026-04-15' }),
      txn({ cleanLabel: 'ZARA', amount: -89, bookingDate: '2026-05-15' }),
    ]
    const f = monthForecast([account(2000)], txns, FREF)
    expect(f.fixedItems).toHaveLength(0)
  })

  it('rejette une charge terminée (dernier prélèvement trop ancien)', () => {
    // Huissier payé jusqu'en mars puis terminé : dernier prélèvement > 45 j.
    const txns = [
      txn({ cleanLabel: 'HUISSIER JUSTICE', amount: -200, bookingDate: '2026-01-26' }),
      txn({ cleanLabel: 'HUISSIER JUSTICE', amount: -200, bookingDate: '2026-02-26' }),
      txn({ cleanLabel: 'HUISSIER JUSTICE', amount: -200, bookingDate: '2026-03-26' }),
    ]
    const f = monthForecast([account(2000)], txns, FREF)
    expect(f.fixedItems).toHaveLength(0)
  })

  it('ne reprojette pas une charge dont l\'échéance est déjà passée (déjà payée)', () => {
    // Abonnement payé ~le 20 : prochaine échéance projetée (19/06) déjà passée le 24 → pas de doublon.
    const txns = [
      txn({ cleanLabel: 'CLAUDE AI', amount: -20, bookingDate: '2026-04-20' }),
      txn({ cleanLabel: 'CLAUDE AI', amount: -20, bookingDate: '2026-05-20' }),
    ]
    const f = monthForecast([account(2000)], txns, FREF)
    expect(f.fixedItems).toHaveLength(0)
  })

  it('masque une charge fixe sans la compter dans la projection', () => {
    const txns = [
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-04-26' }),
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-05-26' }),
    ]
    const base = monthForecast([account(3000)], txns, FREF)
    const charge = base.fixedItems[0]
    expect(charge).toBeDefined()
    const excluded = monthForecast([account(3000)], txns, FREF, new Set([charge.key]))
    // Toujours listée, mais marquée masquée et non comptée.
    expect(excluded.fixedItems[0].excluded).toBe(true)
    expect(excluded.upcomingFixed).toBe(0)
    // Solde projeté plus élevé d'environ le montant de la charge retirée.
    expect(excluded.endBalance).toBeGreaterThan(base.endBalance + 1000)
  })

  it('signale un risque de découvert quand la projection passe sous zéro', () => {
    const txns = [
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-04-26' }),
      txn({ cleanLabel: 'LOYER SCI', amount: -1150, bookingDate: '2026-05-26' }),
    ]
    const f = monthForecast([account(200)], txns, FREF)
    expect(f.lowestPoint.balance).toBeLessThan(0)
  })

  it('exclut les virements (EMIS/VIR) des dépenses estimées', () => {
    const txns = [
      txn({ cleanLabel: 'CB CARREFOUR', amount: -40, bookingDate: '2026-06-10' }),
      txn({ cleanLabel: 'EMIS INST Vers Maeva', amount: -500, bookingDate: '2026-06-12' }),
    ]
    const f = monthForecast([account(1000)], txns, FREF)
    // Seul Carrefour (-40) alimente le burn : 40/90 ≈ 0,44 €/j → < 10 € sur 6 j.
    // Si le virement de 500 € était compté, on serait à ~36 €.
    expect(f.variableProjected).toBeLessThan(10)
  })

  it('estime les dépenses variables sans dépendre de la récurrence', () => {
    const txns = [
      txn({ cleanLabel: 'CB CARREFOUR', amount: -40, bookingDate: '2026-06-04' }),
      txn({ cleanLabel: 'CB MONOPRIX', amount: -55, bookingDate: '2026-06-09' }),
      txn({ cleanLabel: 'CB FRANPRIX', amount: -30, bookingDate: '2026-06-14' }),
    ]
    const f = monthForecast([account(1000)], txns, FREF)
    expect(f.dailyBurn).toBeGreaterThan(0)
    expect(f.variableProjected).toBeGreaterThan(0)
  })
})

describe('patrimoine / investissement', () => {
  function holding(partial: Partial<Holding>): Holding {
    return {
      id: 'h1', householdId: 'h', kind: 'etf', symbol: 'CW8.PA', name: 'World',
      quantity: 10, costBasis: 4000, currency: 'EUR', envelope: 'PEA',
      manualValue: null, linkedAccountId: null, createdAt: '', updatedAt: '',
      ...partial,
    }
  }
  function acc(id: string, balance: number): Account {
    return {
      id, bankConnectionId: 'bc', householdId: 'h', externalAccountId: 'x',
      name: 'C', iban: 'FR', currency: 'EUR', balance, balanceUpdatedAt: '', kind: 'savings',
    }
  }
  const quote = (symbol: string, price: number, changePct = 0): Quote => ({ symbol, price, currency: 'EUR', changePct, asOf: '' })

  it('valorise une position cotée au cours du marché (quantité × prix)', () => {
    const q = new Map([['CW8.PA', quote('CW8.PA', 500, 2)]])
    const v = valuateHolding(holding({ quantity: 10, costBasis: 4000 }), q, [])
    expect(v.value).toBe(5000)
    expect(v.gain).toBe(1000)
    expect(v.hasLivePrice).toBe(true)
    expect(v.dayChange).toBeCloseTo(100, 5) // 5000 × 2 %
  })

  it('utilise la valeur manuelle pour un actif non coté', () => {
    const v = valuateHolding(holding({ symbol: null, kind: 'real_estate', manualValue: 158000, costBasis: 132000 }), new Map(), [])
    expect(v.value).toBe(158000)
    expect(v.hasLivePrice).toBe(false)
    expect(v.gain).toBe(26000)
  })

  it('reflète le solde du compte pour une position liée', () => {
    const v = valuateHolding(holding({ symbol: null, kind: 'livret', linkedAccountId: 'acc-livret', costBasis: 9000 }), new Map(), [acc('acc-livret', 11200)])
    expect(v.value).toBe(11200)
  })

  it('agrège le portefeuille (valeur, +/- value, répartition)', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'CW8.PA', kind: 'etf', quantity: 10, costBasis: 4000 }),
      holding({ id: 'b', symbol: null, kind: 'real_estate', envelope: 'autre', manualValue: 158000, costBasis: 132000 }),
    ]
    const q = new Map([['CW8.PA', quote('CW8.PA', 500, 0)]])
    const s = portfolioSummary(holdings, q, [])
    expect(s.totalValue).toBe(163000)
    expect(s.totalCost).toBe(136000)
    expect(s.gain).toBe(27000)
    expect(s.byKind[0].key).toBe('real_estate') // trié par valeur décroissante
  })

  it('construit la série de valeur nette et le delta sur la période', () => {
    const snap = (asOf: string, total: number): NetWorthSnapshot => ({ id: asOf, householdId: 'h', asOf, total, cash: 0, invested: total })
    const ref = new Date('2026-06-15T12:00:00Z')
    const snaps = [snap('2026-01-10', 100000), snap('2026-05-20', 120000), snap('2026-06-14', 130000)]
    const all = buildNetWorthSeries(snaps, 'ALL', ref)
    expect(all.points).toHaveLength(3)
    expect(all.delta).toBe(30000) // 130000 − 100000
    // Sur 1 mois, seul le point du 20/05 et du 14/06 entrent → delta 10000.
    const m1 = buildNetWorthSeries(snaps, '1M', ref)
    expect(m1.delta).toBe(10000)
  })

  it('calcule la valeur nette sans double-compter un livret agrégé', () => {
    const holdings = [
      holding({ id: 'etf', symbol: 'CW8.PA', kind: 'etf', quantity: 10, costBasis: 4000 }),
      holding({ id: 'liv', symbol: null, kind: 'livret', linkedAccountId: 'acc-livret', costBasis: 11200 }),
    ]
    const q = new Map([['CW8.PA', quote('CW8.PA', 500, 0)]])
    const accounts = [acc('acc-courant', 2000), acc('acc-livret', 11200)]
    const nw = netWorth(accounts, holdings, q)
    // Liquidités = 2000 + 11200 ; investi = ETF 5000 (le livret lié est exclu).
    expect(nw.cash).toBe(13200)
    expect(nw.invested).toBe(5000)
    expect(nw.total).toBe(18200)
  })
})
