# CLAUDE.md — Raid Night

## Project Overview

Raid Night is a real-time shared bingo game for gaming groups during raid/session downtime. A host creates a custom phrase pool, shares a single URL, and each player gets a uniquely randomized board. Anyone in the session can call a phrase which auto-marks it on every board that contains it. Real-time tile sync, session presence, and BINGO broadcasts are powered by Supabase.

**Core design principles:**

- No accounts, no login, no host privileges after session creation
- Players are anonymous — identified by a UUID stored in localStorage
- Boards are deterministic: `seedrandom(playerId + sessionCode)` always reproduces the same board
- Phrase calls auto-mark all boards; any player can undo within 30 seconds
- Sessions expire after 2 hours of inactivity

---

## Tech Stack

| Concern              | Choice                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Framework            | Next.js 14 (App Router)                                                   |
| Hosting              | Vercel (free tier)                                                        |
| Database + Real-time | Supabase                                                                  |
| ORM                  | Drizzle ORM                                                               |
| Styling              | Tailwind CSS                                                              |
| Unit tests           | Vitest                                                                    |
| E2E / Feature tests  | Playwright                                                                |
| Linting              | ESLint + `@typescript-eslint/strict` + `eslint-plugin-drizzle` + Prettier |
| Pre-commit hooks     | Husky + lint-staged                                                       |
| RNG                  | `seedrandom`                                                              |

---

## Project Structure

```
raid-night/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Home / session creation
│   │   ├── [code]/
│   │   │   └── page.tsx              # Player board page
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── auto-lock/
│   │       │   │   └── route.ts      # GET /api/cron/auto-lock (Vercel Cron)
│   │       │   └── cleanup/
│   │       │       └── route.ts      # GET /api/cron/cleanup (Vercel Cron)
│   │       └── sessions/
│   │           └── route.ts          # POST /api/sessions
│   ├── components/
│   │   ├── board/
│   │   │   ├── BingoBoard.tsx
│   │   │   ├── BingoTile.tsx
│   │   │   └── BingoPattern.ts       # Pattern detection logic
│   │   ├── session/
│   │   │   ├── PhraseCallList.tsx
│   │   │   ├── PresenceCount.tsx
│   │   │   └── BingoToast.tsx
│   │   └── class/
│   │       ├── ClassDiceRoller.tsx   # WoW-style 3D dice component
│   │       └── ClassSelector.tsx
│   ├── db/
│   │   ├── schema.ts                 # Drizzle table definitions (single source of truth)
│   │   ├── index.ts                  # DB client export
│   │   └── migrations/               # Drizzle Kit generated migrations
│   ├── lib/
│   │   ├── board.ts                  # generateBoard(), getOrCreatePlayerId()
│   │   ├── session.ts                # generateSessionCode(), validatePhrasePool()
│   │   ├── audio/
│   │   │   ├── index.ts              # AudioEngine class + public API
│   │   │   └── classes/              # One file per WoW class sound
│   │   └── supabase/
│   │       ├── client.ts             # Browser Supabase client
│   │       └── server.ts             # Server Supabase client (RSC / API routes)
│   ├── hooks/
│   │   ├── useRealtimeSession.ts     # Subscribes to tile_marks + called_phrases + bingo_events
│   │   ├── usePresence.ts            # Session headcount via Supabase Presence
│   │   └── useBoard.ts               # Board state derived from marks
│   └── types/
│       ├── enums.ts                  # ALL enums live here
│       ├── models.ts                 # TypeScript interfaces for DB entities
│       └── index.ts                  # Re-exports
├── tests/
│   ├── unit/                         # Vitest unit tests
│   └── e2e/                          # Playwright feature tests
├── docs/
│   ├── raidnight-spec.md             # Full project specification
│   └── implementation-plan.md        # Phased implementation plan
├── CLAUDE.md                         # This file
└── drizzle.config.ts
```

---

## TypeScript Conventions

**Strictness — non-negotiable:**

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `exactOptionalPropertyTypes: true`
- Never use `any` — use `unknown` and narrow, or use proper generics
- Always use `type` imports: `import type { Session } from '@/types/models'`
- Prefer `readonly` on interface properties that should not be mutated

**Enums — always use, always reference:**

- All enums defined in `src/types/enums.ts`
- Reference enum values everywhere — never use raw strings for categorical values
- Drizzle `pgEnum` maps directly to TypeScript enum in schema

**Documentation — JSDoc on all exports:**

```typescript
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
): string[]
```

**Models — interfaces over classes:**

```typescript
// src/types/models.ts
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

export interface PhraseSubmission {
  readonly id: string
  readonly sessionId: string
  readonly phrase: string
  readonly submittedBy: string
  readonly submittedAt: Date
}

export interface CalledPhrase {
  readonly id: string
  readonly sessionId: string
  readonly phrase: string
  readonly calledBy: string
  readonly calledAt: Date
}

export interface TileMark {
  readonly id: string
  readonly sessionId: string
  readonly playerId: string
  readonly tileIndex: number
  readonly phrase: string
  readonly markedAt: Date
}

export interface BingoEvent {
  readonly id: string
  readonly sessionId: string
  readonly playerId: string
  readonly pattern: BingoPattern
  readonly firedAt: Date
}
```

---

## Enums

All enums live in `src/types/enums.ts`. Reference these everywhere — never use raw strings.

```typescript
// src/types/enums.ts

export enum SessionStatus {
  Collecting = 'collecting',
  Locked = 'locked',
}

export enum SubmissionVisibility {
  Open = 'open', // live feed during collection
  Blind = 'blind', // count only; phrases revealed on lock
}

export enum WowClass {
  Warrior = 'warrior',
  Mage = 'mage',
  Priest = 'priest',
  Paladin = 'paladin',
  Rogue = 'rogue',
  Druid = 'druid',
  Warlock = 'warlock',
  Hunter = 'hunter',
  Shaman = 'shaman',
}

export enum BingoPattern {
  Row0 = 'row_0',
  Row1 = 'row_1',
  Row2 = 'row_2',
  Row3 = 'row_3',
  Row4 = 'row_4',
  Col0 = 'col_0',
  Col1 = 'col_1',
  Col2 = 'col_2',
  Col3 = 'col_3',
  Col4 = 'col_4',
  DiagTL = 'diagonal_tl',
  DiagTR = 'diagonal_tr',
}

export enum SoundEvent {
  TileMarked = 'tile_marked',
  PhraseCalled = 'phrase_called',
  BingoWon = 'bingo_won',
  UndoFired = 'undo_fired',
}

export enum RealtimeEvent {
  TileMark = 'tile_mark',
  PhraseCall = 'phrase_call',
  BingoEvent = 'bingo_event',
  UndoEvent = 'undo_event',
}
```

---

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier write
npm run test         # Vitest unit tests (watch mode)
npm run test:run     # Vitest single run (CI)
npm run test:e2e     # Playwright feature tests
npm run test:e2e:ui  # Playwright with UI mode
npm run db:generate  # Drizzle Kit generate migrations
npm run db:push      # Push schema to Supabase
npm run db:studio    # Drizzle Studio visual explorer
```

### SSL Certificate Issue (Local Dev)

The Supabase Postgres connection requires `NODE_TLS_REJECT_UNAUTHORIZED=0` for local Drizzle commands (`db:push`, `db:generate`, `db:studio`). This is because the `pg` library rejects the Supabase pooler's SSL certificate chain locally.

**For Drizzle commands, prefix with:**

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:push
```

This is only needed in local development — Vercel deployments handle SSL natively.

### Cron Jobs (Vercel Cron)

Scheduled tasks use Vercel Cron + API routes instead of pg_cron (avoids superuser access requirement):

- `GET /api/cron/auto-lock` — every 5 min, locks sessions past `scheduled_lock_at`
- `GET /api/cron/cleanup` — every 30 min, deletes sessions inactive > 2 hours

Both routes are secured with `CRON_SECRET` (set in Vercel environment variables). Schedules are defined in `vercel.json`.

---

## Database Patterns

**Schema example (Drizzle):**

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, jsonb, timestamptz, integer, unique } from 'drizzle-orm/pg-core'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  phrasePool: jsonb('phrase_pool').notNull().$type<string[]>().default([]),
  status: text('status').notNull().default('collecting'),
  visibility: text('visibility').notNull().default('open'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  lastActivityAt: timestamptz('last_activity_at').notNull().defaultNow(),
  scheduledLockAt: timestamptz('scheduled_lock_at'),
  lockedAt: timestamptz('locked_at'),
})

export const calledPhrases = pgTable(
  'called_phrases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    phrase: text('phrase').notNull(),
    calledBy: uuid('called_by').notNull(),
    calledAt: timestamptz('called_at').notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.sessionId, t.phrase),
  }),
)

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
    markedAt: timestamptz('marked_at').notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.sessionId, t.playerId, t.tileIndex),
  }),
)

export const phraseSubmissions = pgTable(
  'phrase_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    phrase: text('phrase').notNull(),
    submittedBy: uuid('submitted_by').notNull(),
    submittedAt: timestamptz('submitted_at').notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.sessionId, t.phrase),
  }),
)

export const bingoEvents = pgTable('bingo_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').notNull(),
  pattern: text('pattern').notNull(),
  firedAt: timestamptz('fired_at').notNull().defaultNow(),
})
```

**Query pattern:**

```typescript
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Always type return values
const session: Session | undefined = await db.query.sessions.findFirst({
  where: eq(sessions.code, code),
})
```

---

## Real-time Patterns

**Channel setup (one channel per session, multiplexed):**

```typescript
const channel = supabase.channel(`session:${sessionId}`)

channel
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'tile_marks',
      filter: `session_id=eq.${sessionId}`,
    },
    handleTileMark,
  )
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'called_phrases',
      filter: `session_id=eq.${sessionId}`,
    },
    handlePhraseCall,
  )
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'called_phrases',
      filter: `session_id=eq.${sessionId}`,
    },
    handleUndo,
  )
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .subscribe()
```

---

## Audio System

All audio is synthesized via the Web Audio API. No external files, no copyright exposure.

```typescript
// Usage
import { AudioEngine } from '@/lib/audio'

const audio = new AudioEngine()
audio.playClassMark(WowClass.Mage) // Tile marked
audio.playPhraseCalled() // Someone called a phrase
audio.playBingo() // BINGO achieved
audio.playUndo() // Phrase undone
```

---

## Testing Approach

- **Vitest**: Pure logic — `generateBoard`, `detectBingo`, `generateSessionCode`, audio utils
- **Playwright**: Complete user flows — host creates session, player joins, calls phrase, gets BINGO

**Feature test structure (Playwright):**

```typescript
// tests/e2e/bingo-flow.spec.ts
test('player calls a phrase and board auto-marks', async ({ page }) => {
  // 1. Navigate to session
  // 2. Verify board renders with 25 tiles
  // 3. Click a phrase in the callable list
  // 4. Verify matching tile on board is marked
  // 5. Verify phrase disappears from callable list
})
```

Tests are named after user actions, not implementation details.

---

## Theme System

WoW-inspired modernised aesthetic. Dark warm palette, gold accents, serif typography.

```css
/* CSS variables — defined in src/app/globals.css */
--bg-base: #1a1209;
--panel-bg: #2a1f0e;
--panel-border: #c8972a;
--text-primary: #f0e6c8;
--text-muted: #8a7a5a;
--accent-gold: #c8972a;
--accent-green: #4a9e4a;
--accent-red: #9e3a3a;
--tile-marked: #6b4a0e;

/* Fonts: Cinzel (headers), Crimson Pro (body) — loaded via next/font/google */
```

Tailwind is configured to extend with these variables so theme values are usable as Tailwind utilities.

---

## Environment Variables

```bash
# .env.local (pulled via `vercel env pull`)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Server-side only (API routes)
POSTGRES_URL=                  # Direct Postgres URL for Drizzle (Vercel Supabase integration)
CRON_SECRET=                   # Vercel Cron auth token (secures /api/cron/* routes)
```

The Vercel Supabase integration provides `POSTGRES_URL` (not `DATABASE_URL`). Both Drizzle config and `src/db/index.ts` accept either. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `POSTGRES_URL` to the client. Any variable without `NEXT_PUBLIC_` prefix is server-only.
