import { hashPin, isHashedPin, verifyPin } from './crypto.js'

describe('crypto: hashPin', () => {
  test('пустой PIN → пустая строка', () => {
    expect(hashPin('')).toBe('')
    expect(hashPin(null)).toBe('')
    expect(hashPin(undefined)).toBe('')
  })
  test('одинаковый PIN → одинаковый хеш (детерминированность)', () => {
    expect(hashPin('1234')).toBe(hashPin('1234'))
  })
  test('разный PIN → разный хеш', () => {
    expect(hashPin('1234')).not.toBe(hashPin('1235'))
  })
  test('хеш — hex 64 символа', () => {
    expect(hashPin('1234')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('crypto: isHashedPin', () => {
  test('true для 64 hex', () => {
    expect(isHashedPin(hashPin('1234'))).toBe(true)
  })
  test('false для сырого PIN', () => {
    expect(isHashedPin('1234')).toBe(false)
    expect(isHashedPin('')).toBe(false)
    expect(isHashedPin(null)).toBe(false)
    expect(isHashedPin(undefined)).toBe(false)
  })
  test('false для похожей строки не 64 символов', () => {
    expect(isHashedPin('abcdef')).toBe(false)
  })
})

describe('crypto: verifyPin', () => {
  test('хеш совпал → ok=true, без legacy', () => {
    const h = hashPin('1234')
    const r = verifyPin('1234', h)
    expect(r.ok).toBe(true)
    expect(r.legacy).toBeFalsy()
  })
  test('хеш не совпал → ok=false', () => {
    const h = hashPin('1234')
    expect(verifyPin('5678', h).ok).toBe(false)
  })
  test('legacy: сырой PIN в stored → ok=true + legacy=true', () => {
    const r = verifyPin('1234', '1234')
    expect(r.ok).toBe(true)
    expect(r.legacy).toBe(true)
  })
  test('legacy сырой не совпал → ok=false, legacy=true', () => {
    const r = verifyPin('9999', '1234')
    expect(r.ok).toBe(false)
    expect(r.legacy).toBe(true)
  })
  test('пустой stored → ok=false', () => {
    expect(verifyPin('1234', '').ok).toBe(false)
    expect(verifyPin('1234', null).ok).toBe(false)
  })
})
