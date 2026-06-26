import { describe, expect, it } from 'vitest'
import type { Budget, Category, Goal, Holding, NetWorthSnapshot, Quote, SavingsRule, Subscription, Transaction } from '@/types'
import type { Account } from '@/types'
import {
  activeSubscriptionsMonthlyCost,
  buildEnvelopes,
  buildNetWorthSeries,
  categoryBreakdown,
  computeSavingsPlan,
  estimateMonthlyPace,
  financialHealth,
  suggestBudgets,
  goalProgress,
  goalProjection,
  monthForecast,
  projectInvestment,
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

describe('estimateMonthlyPace', () => {
  const REF_P = new Date('2026-06-15T12:00:00Z')
  it('retourne 0 sans versement', () => {
    expect(estimateMonthlyPace([], 6, REF_P)).toBe(0)
  })
  it('moyenne les versements récents par mois couvert', () => {
    const contribs = [
      { amount: 200, contributedAt: '2026-04-15' },
      { amount: 200, contributedAt: '2026-05-15' },
      { amount: 200, contributedAt: '2026-06-10' },
    ]
    // ~2 mois entre le 15/04 et le 15/06 → 600 / 2 = 300.
    expect(estimateMonthlyPace(contribs, 6, REF_P)).toBeCloseTo(300)
  })
  it('ignore les versements hors fenêtre', () => {
    const contribs = [
      { amount: 1000, contributedAt: '2024-01-01' }, // hors fenêtre 6 mois
      { amount: 150, contributedAt: '2026-06-01' },
    ]
    expect(estimateMonthlyPace(contribs, 6, REF_P)).toBeCloseTo(150)
  })
})

describe('goalProjection', () => {
  const REF_P = new Date('2026-06-15T12:00:00Z')
  const base: Goal = {
    id: 'g', householdId: 'h', name: 'Voiture',
    targetAmount: 1000, currentAmount: 400, targetDate: null, linkedAccountId: null, color: '#000',
  }
  it('projette une ETA au rythme historique', () => {
    const p = goalProjection(base, 200, REF_P)
    expect(p.paceSource).toBe('history')
    expect(p.etaMonths).toBe(3) // (1000-400)/200 = 3
    expect(p.points[0].isStart).toBe(true)
    expect(p.points[0].value).toBe(400)
    expect(p.points[p.points.length - 1].value).toBe(1000) // clampé à la cible
  })
  it('retombe sur le versement nécessaire quand pas d’historique', () => {
    const withDate = { ...base, targetDate: '2026-09-15' }
    const p = goalProjection(withDate, 0, REF_P)
    expect(p.paceSource).toBe('needed')
    expect(p.monthlyNeeded).not.toBeNull()
  })
  it('signale objectif atteint', () => {
    const p = goalProjection({ ...base, currentAmount: 1000 }, 0, REF_P)
    expect(p.reached).toBe(true)
    expect(p.etaMonths).toBe(0)
    expect(p.milestones.every((m) => m.reached)).toBe(true)
  })
  it('évalue onTrack vs la date cible', () => {
    // Rythme 200/mois → 3 mois → atteinte ~15/09 ; cible 31/12 → dans les temps.
    const ok = goalProjection({ ...base, targetDate: '2026-12-31' }, 200, REF_P)
    expect(ok.onTrack).toBe(true)
    // Rythme 50/mois → 12 mois → bien après une cible au 31/08.
    const late = goalProjection({ ...base, targetDate: '2026-08-31' }, 50, REF_P)
    expect(late.onTrack).toBe(false)
  })
  it('marque les jalons franchis', () => {
    const p = goalProjection({ ...base, currentAmount: 500 }, 100, REF_P) // 50 %
    expect(p.milestones.find((m) => m.ratio === 0.5)?.reached).toBe(true)
    expect(p.milestones.find((m) => m.ratio === 0.75)?.reached).toBe(false)
  })
})

describe('projectInvestment', () => {
  it('capitalise mensuellement initial + versements', () => {
    const r = projectInvestment({ initial: 1000, monthly: 100, years: 10, annualRate: 0.06 })
    expect(r.totalInvested).toBe(1000 + 100 * 120) // 13 000
    expect(r.finalValue).toBeGreaterThan(r.totalInvested) // intérêts composés
    expect(r.points[0]).toEqual({ year: 0, invested: 1000, value: 1000 })
    expect(r.points[r.points.length - 1].year).toBe(10)
    expect(r.gainPct).toBeCloseTo(r.totalGain / r.totalInvested)
  })
  it('sans rendement, valeur = versements', () => {
    const r = projectInvestment({ initial: 0, monthly: 50, years: 2, annualRate: 0 })
    expect(r.finalValue).toBeCloseTo(50 * 24)
    expect(r.totalGain).toBeCloseTo(0)
  })
  it('gère une durée nulle', () => {
    const r = projectInvestment({ initial: 500, monthly: 100, years: 0, annualRate: 0.06 })
    expect(r.finalValue).toBe(500)
    expect(r.points).toHaveLength(1)
  })
})

describe('computeSavingsPlan', () => {
  const REF_S = new Date('2026-06-15T12:00:00Z')
  function rule(partial: Partial<SavingsRule>): SavingsRule {
    return {
      id: 'r', householdId: 'h', type: 'roundup', enabled: true,
      roundTo: 1, multiplier: 1, percent: null, categoryId: null, amount: null,
      targetGoalId: null, createdAt: '2026-06-01', ...partial,
    }
  }

  it('arrondit les achats du mois à l’euro supérieur', () => {
    const txns = [
      txn({ id: '1', amount: -10.4, bookingDate: '2026-06-10' }), // +0.60
      txn({ id: '2', amount: -5.25, bookingDate: '2026-06-12' }), // +0.75
      txn({ id: '3', amount: -8, bookingDate: '2026-06-12' }), // entier → 0
      txn({ id: '4', amount: -3.1, bookingDate: '2026-05-10' }), // hors mois
      txn({ id: '5', amount: 2000, bookingDate: '2026-06-01' }), // revenu ignoré
    ]
    const plan = computeSavingsPlan([rule({})], txns, [], REF_S)
    expect(plan.results[0].count).toBe(2)
    expect(plan.results[0].amountThisMonth).toBeCloseTo(1.35)
    expect(plan.totalThisMonth).toBeCloseTo(1.35)
  })

  it('applique un multiplicateur d’arrondi', () => {
    const txns = [txn({ id: '1', amount: -10.5, bookingDate: '2026-06-10' })] // 0.50 ×3
    const plan = computeSavingsPlan([rule({ multiplier: 3 })], txns, [], REF_S)
    expect(plan.results[0].amountThisMonth).toBeCloseTo(1.5)
  })

  it('calcule un pourcentage des revenus du mois', () => {
    const txns = [
      txn({ id: '1', amount: 2000, bookingDate: '2026-06-01' }),
      txn({ id: '2', amount: 500, bookingDate: '2026-06-03' }),
      txn({ id: '3', amount: -50, bookingDate: '2026-06-04' }),
    ]
    const plan = computeSavingsPlan([rule({ type: 'income_pct', percent: 10 })], txns, [], REF_S)
    expect(plan.results[0].basis).toBe(2500)
    expect(plan.results[0].amountThisMonth).toBeCloseTo(250)
  })

  it('déclenche un montant fixe par opération d’une catégorie', () => {
    const txns = [
      txn({ id: '1', amount: -22, categoryId: 'cat-resto', bookingDate: '2026-06-10' }),
      txn({ id: '2', amount: -18, categoryId: 'cat-resto', bookingDate: '2026-06-11' }),
      txn({ id: '3', amount: -30, categoryId: 'cat-courses', bookingDate: '2026-06-12' }),
    ]
    const plan = computeSavingsPlan([rule({ type: 'category_trigger', categoryId: 'cat-resto', amount: 3 })], txns, [], REF_S)
    expect(plan.results[0].count).toBe(2)
    expect(plan.results[0].amountThisMonth).toBeCloseTo(6)
  })

  it('exclut les règles désactivées du total', () => {
    const txns = [txn({ id: '1', amount: -10.5, bookingDate: '2026-06-10' })]
    const plan = computeSavingsPlan(
      [rule({ id: 'on', enabled: true }), rule({ id: 'off', enabled: false })],
      txns, [], REF_S,
    )
    expect(plan.results).toHaveLength(2)
    // Seule la règle active compte dans le total (0.50 chacune).
    expect(plan.totalThisMonth).toBeCloseTo(0.5)
  })
})

describe('financialHealth', () => {
  const REF_H = new Date('2026-06-15T12:00:00Z')
  const accH = (id: string, balance: number): Account => ({
    id, bankConnectionId: 'bc', householdId: 'h', externalAccountId: id, name: id,
    iban: 'FR', currency: 'EUR', balance, balanceUpdatedAt: '2026-06-10', kind: 'checking',
  })
  const cat = (id: string): Category => ({ id, householdId: 'h', name: id, icon: 'c', color: '#000', parentId: null, isDefault: true })
  const bud = (categoryId: string, amount: number): Budget => ({ id: `b-${categoryId}`, householdId: 'h', categoryId, amount, period: 'monthly', createdAt: '2026-01-01' })
  const subH = (amount: number): Subscription => ({ id: `s${amount}`, householdId: 'h', merchantLabel: 'x', amount, frequency: 'monthly', nextExpectedDate: '2026-06-20', categoryId: null, isConfirmed: true, isActive: true })

  it('note un foyer sain proche de l’excellence', () => {
    const txns = [
      txn({ id: 'i', amount: 3000, bookingDate: '2026-05-05', categoryId: 'cat-salaire' }),
      txn({ id: 'e', amount: -2000, bookingDate: '2026-05-10' }),
      txn({ id: 'jun', amount: -300, bookingDate: '2026-06-10', categoryId: 'cat-food' }), // pour le budget (mois courant)
    ]
    const h = financialHealth([accH('a', 12000)], txns, [bud('cat-food', 500)], [cat('cat-food')], [subH(100)], 0, REF_H)
    expect(h.evaluatedCount).toBe(4)
    expect(h.score).toBe(96)
    expect(h.grade).toBe('excellent')
  })

  it('note fragile un foyer en difficulté', () => {
    const txns = [
      txn({ id: 'i', amount: 2000, bookingDate: '2026-05-05', categoryId: 'cat-salaire' }),
      txn({ id: 'e', amount: -2100, bookingDate: '2026-05-10' }),
    ]
    const h = financialHealth([accH('a', 500)], txns, [], [], [subH(300)], 0, REF_H)
    expect(h.evaluatedCount).toBe(3) // pas de budget
    expect(h.score).toBeLessThan(15)
    expect(h.grade).toBe('fragile')
  })

  it('redistribue les poids quand des dimensions manquent', () => {
    const txns = [txn({ id: 'e', amount: -1500, bookingDate: '2026-05-10' })] // dépenses, pas de revenu txn
    // Revenu déclaré du foyer = 3000 → taux d'épargne évaluable ; pas de budget ni d'abonnement.
    const h = financialHealth([accH('a', 9000)], txns, [], [], [], 3000, REF_H)
    expect(h.evaluatedCount).toBe(2) // épargne + fonds d'urgence
    expect(h.score).toBe(100) // taux 50 % et 6 mois de fonds
    expect(h.grade).toBe('excellent')
  })

  it('retourne null sans aucune donnée évaluable', () => {
    const h = financialHealth([], [], [], [], [], 0, REF_H)
    expect(h.score).toBeNull()
    expect(h.grade).toBeNull()
    expect(h.evaluatedCount).toBe(0)
  })
})

describe('suggestBudgets', () => {
  const REF_B = new Date('2026-06-15T12:00:00Z')
  const cat = (id: string, name = id): Category => ({ id, householdId: 'h', name, icon: 'c', color: '#000', parentId: null, isDefault: true })
  const bud = (categoryId: string, amount: number): Budget => ({ id: `b-${categoryId}`, householdId: 'h', categoryId, amount, period: 'monthly', createdAt: '2026-01-01' })

  it('suggère la médiane mensuelle arrondie à 5 € supérieur', () => {
    const txns = [
      txn({ id: '1', amount: -120, categoryId: 'cat-food', bookingDate: '2026-05-10' }),
      txn({ id: '2', amount: -101, categoryId: 'cat-food', bookingDate: '2026-04-10' }),
      txn({ id: '3', amount: -110, categoryId: 'cat-food', bookingDate: '2026-03-10' }),
    ]
    const s = suggestBudgets(txns, [cat('cat-food')], [], REF_B)
    expect(s).toHaveLength(1)
    expect(s[0].typical).toBe(110) // médiane de [120,101,110]
    expect(s[0].suggested).toBe(110) // déjà multiple de 5
    expect(s[0].monthsObserved).toBe(3)
    expect(s[0].current).toBeNull()
  })

  it('arrondit au multiple de 5 supérieur', () => {
    const txns = [
      txn({ id: '1', amount: -101, categoryId: 'cat-food', bookingDate: '2026-05-10' }),
      txn({ id: '2', amount: -101, categoryId: 'cat-food', bookingDate: '2026-04-10' }),
    ]
    const s = suggestBudgets(txns, [cat('cat-food')], [], REF_B)
    expect(s[0].suggested).toBe(105) // ceil(101/5)*5
  })

  it('ignore une dépense sporadique (médiane nulle)', () => {
    const txns = [txn({ id: '1', amount: -200, categoryId: 'cat-food', bookingDate: '2026-05-10' })] // 1 mois sur 3
    const s = suggestBudgets(txns, [cat('cat-food')], [], REF_B)
    expect(s).toHaveLength(0)
  })

  it('exclut les catégories de revenu/épargne et les dépenses du mois courant', () => {
    const txns = [
      txn({ id: '1', amount: 3000, categoryId: 'cat-sal', bookingDate: '2026-05-01' }),
      txn({ id: '2', amount: -90, categoryId: 'cat-food', bookingDate: '2026-06-10' }), // mois courant, hors fenêtre
    ]
    const s = suggestBudgets(txns, [cat('cat-sal', 'Salaire'), cat('cat-food')], [], REF_B)
    expect(s).toHaveLength(0)
  })

  it('remonte le budget actuel pour un ajustement', () => {
    const txns = [
      txn({ id: '1', amount: -200, categoryId: 'cat-food', bookingDate: '2026-05-10' }),
      txn({ id: '2', amount: -200, categoryId: 'cat-food', bookingDate: '2026-04-10' }),
    ]
    const s = suggestBudgets(txns, [cat('cat-food')], [bud('cat-food', 100)], REF_B)
    expect(s[0].current).toBe(100)
    expect(s[0].suggested).toBe(200)
  })
})
