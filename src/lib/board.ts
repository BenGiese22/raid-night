import seedrandom from 'seedrandom'

import { BingoPattern } from '@/types/enums'

/** Winning line definitions — checked in declaration order (rows, cols, diagonals) */
const WINNING_LINES: readonly (readonly [BingoPattern, readonly number[]])[] = [
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

/**
 * Checks whether the marked tile indices complete any bingo pattern.
 * Returns the first matching pattern (rows checked before columns, then diagonals),
 * or null if no pattern is complete.
 *
 * @param markedIndices - Array of marked tile indices (0-24) on a 5x5 grid
 * @returns The first completed BingoPattern, or null
 */
export function detectBingo(markedIndices: readonly number[]): BingoPattern | null {
  const marked = new Set(markedIndices)

  for (const [pattern, indices] of WINNING_LINES) {
    if (indices.every((idx) => marked.has(idx))) {
      return pattern
    }
  }

  return null
}

/**
 * Generates a deterministic 5x5 bingo board for a given player and session.
 * The same playerId + sessionCode always produces the same board.
 *
 * @param playerId - Anonymous UUID from localStorage
 * @param sessionCode - Human-readable session identifier (e.g. "frost-wolf-42")
 * @param phrasePool - Full array of phrases from the session
 * @returns Ordered array of 25 phrases for the 5x5 grid, index 0 = top-left
 */
export function generateBoard(
  playerId: string,
  sessionCode: string,
  phrasePool: readonly string[],
): string[] {
  const rng = seedrandom(playerId + sessionCode)
  const pool = [...phrasePool]

  // Fisher-Yates shuffle — indices i and j are always within bounds by loop invariant
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const temp = pool[i]!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pool[i] = pool[j]!
    pool[j] = temp
  }

  return pool.slice(0, 25)
}

/**
 * Gets or creates a persistent anonymous player ID for a given session.
 * The ID is stored in localStorage and reused across page reloads.
 *
 * @param sessionCode - Human-readable session identifier
 * @returns UUID string identifying the player within this session
 */
export function getOrCreatePlayerId(sessionCode: string): string {
  const key = `player_${sessionCode}`
  const existing = localStorage.getItem(key)
  if (existing) {
    return existing
  }
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}
