import { describe, expect, it } from 'vitest'
import { mapAccount, mapGoal, mapTransaction } from './mappers'

describe('mapAccount', () => {
  it('convertit snake_case → camelCase avec valeurs par défaut', () => {
    const acc = mapAccount({
      id: 'a1',
      bank_connection_id: 'c1',
      household_id: 'h1',
      external_account_id: 'ext',
      name: 'Compte courant',
      iban: 'FR76…',
      balance: '1234.56',
      balance_updated_at: '2026-06-01T00:00:00Z',
      kind: 'savings',
    })
    expect(acc.bankConnectionId).toBe('c1')
    expect(acc.balance).toBe(1234.56)
    expect(acc.currency).toBe('EUR') // défaut
    expect(acc.kind).toBe('savings')
  })
})

describe('mapTransaction', () => {
  it('gère categoryId null et amount numérique', () => {
    const t = mapTransaction({
      id: 't1',
      account_id: 'a1',
      household_id: 'h1',
      amount: -42.5,
      booking_date: '2026-06-10',
      category_id: null,
      is_recurring: true,
    })
    expect(t.amount).toBe(-42.5)
    expect(t.categoryId).toBeNull()
    expect(t.isRecurring).toBe(true)
    expect(t.categorySource).toBe('auto') // défaut
  })
})

describe('mapGoal', () => {
  it('applique les valeurs par défaut sur les champs absents', () => {
    const g = mapGoal({ id: 'g1', household_id: 'h1', name: 'But', target_amount: 500 })
    expect(g.currentAmount).toBe(0)
    expect(g.targetDate).toBeNull()
    expect(g.linkedAccountId).toBeNull()
    expect(g.color).toBe('#46c79a')
  })
})
