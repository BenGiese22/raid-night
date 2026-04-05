/**
 * Drizzle ORM schema — single source of truth for all database tables.
 * Column names use camelCase in TypeScript, snake_case in Postgres.
 */
import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { SessionStatus, SubmissionVisibility } from '@/types/enums'

/**
 * Bingo sessions. Each session contains a phrase pool, lifecycle status, and timing metadata.
 * Sessions transition from collecting → locked and expire after 2 hours of inactivity.
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  phrasePool: jsonb('phrase_pool').notNull().$type<string[]>().default([]),
  status: text('status').notNull().default(SessionStatus.Collecting),
  visibility: text('visibility').notNull().default(SubmissionVisibility.Open),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  scheduledLockAt: timestamp('scheduled_lock_at', { withTimezone: true }),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
})

/**
 * Phrases submitted by players during the collection phase.
 * Trimmed of whitespace. UNIQUE(session_id, phrase) prevents duplicates (case-sensitive).
 */
export const phraseSubmissions = pgTable(
  'phrase_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    phrase: text('phrase').notNull(),
    submittedBy: uuid('submitted_by').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.phrase)],
)

/**
 * Phrases called during the game phase.
 * Calling a phrase auto-marks matching tiles on all boards.
 * UNIQUE(session_id, phrase) prevents the same phrase being called twice.
 */
export const calledPhrases = pgTable(
  'called_phrases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    phrase: text('phrase').notNull(),
    calledBy: uuid('called_by').notNull(),
    calledAt: timestamp('called_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.phrase)],
)

/**
 * Marked tiles on player bingo boards.
 * Created when a called phrase matches a tile on the player's deterministic board.
 * UNIQUE(player_id, tile_index) ensures one mark per tile per player.
 */
export const tileMarks = pgTable(
  'tile_marks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id').notNull(),
    tileIndex: integer('tile_index').notNull(),
    phrase: text('phrase').notNull(),
    markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.playerId, t.tileIndex)],
)

/**
 * Bingo events fired when a player completes a winning pattern.
 * Triggers a celebration toast for all connected players.
 */
export const bingoEvents = pgTable(
  'bingo_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id').notNull(),
    pattern: text('pattern').notNull(),
    firedAt: timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.playerId, t.pattern)],
)
