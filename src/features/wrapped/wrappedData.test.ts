import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '@/types'
import { buildWrapped } from './wrappedData'

const NOW = new Date('2026-06-15T12:00:00')

const food: Category = { id: 'cat-food', householdId: 'h', name: 'Courses', icon: 'shopping-cart', color: '#f00', parentId: null, isDefault: true }
const resto: Category = { id: 'cat-resto', householdId: 'h', name: 'Resto', icon: 'utensils', color: '#0f0', parentId: null, isDefault: true }

let seq = 0
function txn(p: Partial<Transaction>): Transaction {
  return {
    id: `t-${seq++}`, accountId: 'a', householdId: 'h', externalId: `x-${seq}`,
    bookingDate: '2026-03-10', amount: -10, currency: 'EUR', rawLabel: '', cleanLabel: 'Achat',
    categoryId: 'cat-food', categorySource: 'auto', isRecurring: false, subscriptionId: null,
    createdAt: '2026-03-10', ...p,
  }
}

describe('buildWrapped', () => {
  it('ne compte que les dépenses de l\'année, hors virements et revenus', () => {
    const txns = [
      txn({ amount: -30, categoryId: 'cat-food', bookingDate: '2026-02-10' }),
      txn({ amount: -20, categoryId: 'cat-food', bookingDate: '2026-03-12' }),
      txn({ amount: -100, categoryId: 'cat-resto', cleanLabel: 'Le Florentin', bookingDate: '2026-04-05' }),
      txn({ amount: -500, cleanLabel: 'EMIS INST Vers Maeva', bookingDate: '2026-05-01' }), // virement
      txn({ amount: 2000, cleanLabel: 'Salaire', bookingDate: '2026-05-02' }), // revenu
      txn({ amount: -999, categoryId: 'cat-food', bookingDate: '2025-12-30' }), // hors année
    ]
    const w = buildWrapped(txns, [food, resto], 2026, NOW)
    expect(w.totalSpent).toBe(150)
    expect(w.txnCount).toBe(3)
  })

  it('identifie le top poste et le plus gros achat', () => {
    const txns = [
      txn({ amount: -30, categoryId: 'cat-food', bookingDate: '2026-02-10' }),
      txn({ amount: -20, categoryId: 'cat-food', bookingDate: '2026-03-12' }),
      txn({ amount: -100, categoryId: 'cat-resto', cleanLabel: 'Le Florentin', bookingDate: '2026-04-05' }),
    ]
    const w = buildWrapped(txns, [food, resto], 2026, NOW)
    expect(w.topCategory?.category?.name).toBe('Resto')
    expect(w.biggestExpense?.amount).toBe(100)
    expect(w.biggestExpense?.label).toBe('Le Florentin')
  })

  it('masque le bilan en deçà de 15 opérations', () => {
    const w = buildWrapped([txn({ amount: -10 })], [food], 2026, NOW)
    expect(w.hasEnoughData).toBe(false)
  })
})
