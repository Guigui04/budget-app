import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  daysUntil,
  formatPercent,
  formatSigned,
  isStale,
  maskIban,
} from './format'

describe('formatPercent', () => {
  it('arrondit le ratio en pourcentage', () => {
    expect(formatPercent(0)).toBe('0 %')
    expect(formatPercent(0.5)).toBe('50 %')
    expect(formatPercent(0.804)).toBe('80 %')
    expect(formatPercent(1)).toBe('100 %')
  })
})

describe('formatSigned', () => {
  it('préfixe les revenus d’un +', () => {
    expect(formatSigned(12).startsWith('+')).toBe(true)
  })
  it('ne préfixe pas les dépenses (signe - déjà présent)', () => {
    const out = formatSigned(-12)
    expect(out.startsWith('+')).toBe(false)
    expect(out.startsWith('-')).toBe(true)
  })
  it('ne préfixe pas zéro', () => {
    expect(formatSigned(0).startsWith('+')).toBe(false)
  })
})

describe('maskIban', () => {
  it('ne garde que les 4 derniers caractères', () => {
    expect(maskIban('FR7612345678')).toBe('•••• 5678')
  })
  it('ignore les espaces', () => {
    expect(maskIban('FR76 1234 5678')).toBe('•••• 5678')
  })
  it('laisse intact un IBAN trop court', () => {
    expect(maskIban('AB12')).toBe('AB12')
    expect(maskIban('X')).toBe('X')
  })
})

describe('isStale / daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('isStale est vrai au-delà de 24 h', () => {
    expect(isStale('2026-06-20T12:00:00Z')).toBe(true)
    expect(isStale('2026-06-22T06:00:00Z')).toBe(false)
  })

  it('daysUntil compte les jours jusqu’à une date future', () => {
    expect(daysUntil('2026-06-25T12:00:00Z')).toBe(3)
    expect(daysUntil('2026-06-19T12:00:00Z')).toBe(-3)
  })
})
