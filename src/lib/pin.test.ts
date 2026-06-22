import { describe, expect, it } from 'vitest'
import { constantTimeEqual, generateSalt, hashPin, isValidPin } from './pin'

describe('isValidPin', () => {
  it('accepte 4 à 8 chiffres', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('12345678')).toBe(true)
  })
  it('rejette trop court, trop long ou non numérique', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('123456789')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })
})

describe('constantTimeEqual', () => {
  it('compare égalité de chaînes', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
    expect(constantTimeEqual('abc', 'ab')).toBe(false)
  })
})

describe('hashPin', () => {
  it('un même PIN+sel donne le même hash ; un mauvais PIN diffère', async () => {
    const salt = generateSalt()
    const h1 = await hashPin('1234', salt)
    const h2 = await hashPin('1234', salt)
    const wrong = await hashPin('0000', salt)
    expect(h1).toBe(h2)
    expect(h1).not.toBe(wrong)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('le sel change le hash', async () => {
    const a = await hashPin('1234', generateSalt())
    const b = await hashPin('1234', generateSalt())
    expect(a).not.toBe(b)
  })
})
