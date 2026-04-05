import type { BingoPattern, SessionStatus, SubmissionVisibility } from './enums'

/**
 * A bingo session containing a phrase pool and game state.
 * Sessions transition from collecting → locked, then expire after 2 hours of inactivity.
 */
export interface Session {
  readonly id: string
  readonly code: string
  readonly phrasePool: string[]
  readonly status: SessionStatus
  readonly visibility: SubmissionVisibility
  readonly createdAt: Date
  readonly lastActivityAt: Date
  readonly scheduledLockAt: Date | null
  readonly lockedAt: Date | null
}

/**
 * A phrase submitted by a player during the collection phase.
 * Phrases are trimmed of whitespace. UNIQUE(session_id, phrase) prevents duplicates (case-sensitive).
 */
export interface PhraseSubmission {
  readonly id: string
  readonly sessionId: string
  readonly phrase: string
  readonly submittedBy: string
  readonly submittedAt: Date
}

/**
 * A phrase that has been called during the game phase.
 * Calling a phrase auto-marks matching tiles on all boards.
 * Can be undone within 30 seconds of being called.
 */
export interface CalledPhrase {
  readonly id: string
  readonly sessionId: string
  readonly phrase: string
  readonly calledBy: string
  readonly calledAt: Date
}

/**
 * A marked tile on a player's bingo board.
 * Created when a called phrase matches a tile on the player's board.
 * UNIQUE(player_id, tile_index) ensures one mark per tile per player.
 */
export interface TileMark {
  readonly id: string
  readonly sessionId: string
  readonly playerId: string
  readonly tileIndex: number
  readonly phrase: string
  readonly markedAt: Date
}

/**
 * A bingo event fired when a player completes a winning pattern.
 * Triggers a celebration toast for all connected players.
 */
export interface BingoEvent {
  readonly id: string
  readonly sessionId: string
  readonly playerId: string
  readonly pattern: BingoPattern
  readonly firedAt: Date
}

/**
 * Serializable session data passed from server component to client component.
 * Dates are ISO strings because server→client props must be serializable.
 */
export interface SessionPageData {
  readonly id: string
  readonly code: string
  readonly status: SessionStatus
  readonly visibility: SubmissionVisibility
  readonly scheduledLockAt: string | null
  readonly phrasePool: readonly string[]
}
