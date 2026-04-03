import seedrandom from 'seedrandom'

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
