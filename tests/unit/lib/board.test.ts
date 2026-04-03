import { describe, expect, it } from 'vitest'

import { generateBoard } from '@/lib/board'

const PHRASE_POOL: readonly string[] = Array.from(
  { length: 30 },
  (_, i) => `phrase-${String(i + 1).padStart(2, '0')}`,
)

describe('generateBoard', () => {
  it('is deterministic — same inputs always produce the same board', () => {
    const first = generateBoard('player-1', 'session-1', PHRASE_POOL)
    for (let i = 0; i < 100; i++) {
      expect(generateBoard('player-1', 'session-1', PHRASE_POOL)).toEqual(first)
    }
  })

  it('returns exactly 25 phrases', () => {
    const board = generateBoard('player-1', 'session-1', PHRASE_POOL)
    expect(board).toHaveLength(25)
  })

  it('returns 25 unique phrases', () => {
    const board = generateBoard('player-1', 'session-1', PHRASE_POOL)
    expect(new Set(board).size).toBe(25)
  })

  it('only contains phrases from the pool', () => {
    const board = generateBoard('player-1', 'session-1', PHRASE_POOL)
    for (const phrase of board) {
      expect(PHRASE_POOL).toContain(phrase)
    }
  })

  it('produces different boards for different players', () => {
    const boardA = generateBoard('player-a', 'session-1', PHRASE_POOL)
    const boardB = generateBoard('player-b', 'session-1', PHRASE_POOL)
    expect(boardA).not.toEqual(boardB)
  })

  it('produces different boards for different sessions', () => {
    const boardA = generateBoard('player-1', 'session-a', PHRASE_POOL)
    const boardB = generateBoard('player-1', 'session-b', PHRASE_POOL)
    expect(boardA).not.toEqual(boardB)
  })
})
