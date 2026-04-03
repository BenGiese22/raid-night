import { describe, expect, it } from 'vitest'

import { generateSessionCode, validatePhrasePool } from '@/lib/session'

describe('generateSessionCode', () => {
  it('returns a string matching adjective-noun-number format', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[a-z]+-[a-z]+-\d{2}$/)
  })

  it('generates a number between 10 and 99', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSessionCode()
      const num = Number(code.split('-')[2])
      expect(num).toBeGreaterThanOrEqual(10)
      expect(num).toBeLessThanOrEqual(99)
    }
  })

  it('does not always return the same value', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSessionCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('validatePhrasePool', () => {
  const makePool = (n: number): string[] =>
    Array.from({ length: n }, (_, i) => `phrase ${String(i + 1)}`)

  it('accepts 25 unique phrases', () => {
    const result = validatePhrasePool(makePool(25))
    expect(result.valid).toBe(true)
    expect(result.phrases).toHaveLength(25)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects fewer than 25 phrases', () => {
    const result = validatePhrasePool(makePool(24))
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('25')
  })

  it('rejects more than 100 phrases', () => {
    const result = validatePhrasePool(makePool(101))
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('100')
  })

  it('deduplicates case-insensitively', () => {
    const phrases = [...makePool(24), 'PHRASE 1']
    const result = validatePhrasePool(phrases)
    expect(result.valid).toBe(false)
    expect(result.phrases).toHaveLength(24)
  })

  it('trims whitespace', () => {
    const phrases = makePool(25).map((p) => `  ${p}  `)
    const result = validatePhrasePool(phrases)
    expect(result.valid).toBe(true)
    expect(result.phrases[0]).toBe('phrase 1')
  })

  it('lowercases all phrases', () => {
    const phrases = makePool(25).map((p) => p.toUpperCase())
    const result = validatePhrasePool(phrases)
    expect(result.valid).toBe(true)
    expect(result.phrases[0]).toBe('phrase 1')
  })

  it('accepts exactly 100 phrases', () => {
    const result = validatePhrasePool(makePool(100))
    expect(result.valid).toBe(true)
    expect(result.phrases).toHaveLength(100)
  })
})
