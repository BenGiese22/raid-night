import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { detectBingo, generateBoard, getOrCreatePlayerId } from '@/lib/board'
import { BingoPattern } from '@/types/enums'

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

describe('detectBingo', () => {
  const PATTERNS: readonly (readonly [BingoPattern, readonly number[]])[] = [
    [BingoPattern.Row0, [0, 1, 2, 3, 4]],
    [BingoPattern.Row1, [5, 6, 7, 8, 9]],
    [BingoPattern.Row2, [10, 11, 12, 13, 14]],
    [BingoPattern.Row3, [15, 16, 17, 18, 19]],
    [BingoPattern.Row4, [20, 21, 22, 23, 24]],
    [BingoPattern.Col0, [0, 5, 10, 15, 20]],
    [BingoPattern.Col1, [1, 6, 11, 16, 21]],
    [BingoPattern.Col2, [2, 7, 12, 17, 22]],
    [BingoPattern.Col3, [3, 8, 13, 18, 23]],
    [BingoPattern.Col4, [4, 9, 14, 19, 24]],
    [BingoPattern.DiagTL, [0, 6, 12, 18, 24]],
    [BingoPattern.DiagTR, [4, 8, 12, 16, 20]],
  ]

  it.each(PATTERNS)('detects %s pattern', (pattern, indices) => {
    expect(detectBingo(indices)).toBe(pattern)
  })

  it('returns null for incomplete pattern', () => {
    expect(detectBingo([0, 1, 2, 3])).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(detectBingo([])).toBeNull()
  })

  it('returns first matching pattern when multiple complete', () => {
    // Row0 [0,1,2,3,4] + Col0 [0,5,10,15,20] — Row0 checked first
    expect(detectBingo([0, 1, 2, 3, 4, 5, 10, 15, 20])).toBe(BingoPattern.Row0)
  })

  it('handles extra marked tiles beyond a pattern', () => {
    const allTiles = Array.from({ length: 25 }, (_, i) => i)
    expect(detectBingo(allTiles)).toBe(BingoPattern.Row0)
  })
})

describe('getOrCreatePlayerId', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      get length() {
        return store.size
      },
      key: () => null,
    })
    const originalRandomUUID = globalThis.crypto.randomUUID.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { randomUUID: () => originalRandomUUID() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a new UUID on first call', () => {
    const id = getOrCreatePlayerId('test-session')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(store.get('player_test-session')).toBe(id)
  })

  it('returns the same UUID on subsequent calls', () => {
    const first = getOrCreatePlayerId('test-session')
    const second = getOrCreatePlayerId('test-session')
    expect(first).toBe(second)
  })

  it('returns different UUIDs for different sessions', () => {
    const idA = getOrCreatePlayerId('session-a')
    const idB = getOrCreatePlayerId('session-b')
    expect(idA).not.toBe(idB)
  })

  it('regenerates UUID if cached value is corrupted', () => {
    store.set('player_test-session', 'not-a-uuid')
    const id = getOrCreatePlayerId('test-session')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id).not.toBe('not-a-uuid')
  })
})
