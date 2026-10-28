# Raid Night

A real-time shared bingo game for gaming groups during raid and session downtime. A host creates a session and shares one URL. Everyone submits phrases ("tank pulls the whole room", "someone is AFK"). When the session locks, each player gets a uniquely shuffled 5×5 board. Anyone can call a phrase, and it auto-marks on every board that contains it.

No accounts, no login, no host privileges after creation. Players are anonymous.

## How a session works

1. **Create.** The host picks submission visibility (**Open**: live feed, or **Blind**: count only until lock), an optional auto-lock time (5 minutes to 24 hours out), and whether the center tile is a free space. The host gets a code like `frost-wolf-42` and a URL, `/{code}`.
2. **Collect.** Anyone with the link submits phrases. Phrases are unique per session. Anyone can lock the session manually, or the scheduled lock fires automatically.
3. **Lock.** All submissions are copied into the session's `phrase_pool` and the status flips to `locked`. Every connected client sees the change in real time.
4. **Play.** Each player's board is `generateBoard(playerId, sessionCode, phrasePool)`, a Fisher-Yates shuffle seeded with `seedrandom(playerId + sessionCode)`, so a reload reproduces the same board. Any player can call a phrase from the list. It is inserted into `called_phrases`, and every client marks matching tiles. The caller can **undo within 30 seconds**.
5. **BINGO.** When a player completes a row, column or diagonal, a `bingo_events` row is inserted and a toast is broadcast to everyone. Each (session, player, pattern) fires at most once.
6. **Expire.** Sessions with no activity for 2 hours are deleted. Child rows cascade.

A player's identity is a UUID in `localStorage` under `player_{code}`. Clearing storage means a new identity and a new board.

## Tech stack

| Concern              | Choice                                                    |
| -------------------- | --------------------------------------------------------- |
| Framework            | Next.js 14 (App Router), React 18                         |
| Hosting              | Vercel, with Vercel Cron                                  |
| Database + Real-time | Supabase (Postgres, `postgres_changes`, Presence)         |
| ORM                  | Drizzle ORM + drizzle-kit migrations                      |
| Styling              | Tailwind CSS                                              |
| Board RNG            | `seedrandom`                                              |
| Unit tests           | Vitest + Testing Library (jsdom)                          |
| E2E tests            | Playwright (installed, no specs yet)                      |
| Lint / format        | ESLint (`@typescript-eslint/strict`, `drizzle`), Prettier |
| Git hooks            | Husky + lint-staged                                       |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (Postgres + Realtime)
- Optionally, a Vercel project linked to the repo for deploys and cron

### Setup

```bash
npm install
cp .env.example .env.local   # if you have one; otherwise create it (see below)
# or, if linked to Vercel: vercel env pull
```

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only
DATABASE_URL=                # or POSTGRES_URL (Vercel Supabase integration); either works
CRON_SECRET=                 # bearer token for /api/cron/*
```

Anything without the `NEXT_PUBLIC_` prefix is server-only. Never expose the service role key or the Postgres URL to the client.

### Database

Tables are defined in `src/db/schema.ts`, the single source of truth. Push the schema, then apply the hand-written SQL in `src/db/sql/` once in the Supabase SQL editor:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:push
```

| File                          | Purpose                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/sql/realtime.sql`     | Adds the tables to the `supabase_realtime` publication so `postgres_changes` fires                                              |
| `src/db/sql/rls-policies.sql` | Enables RLS and grants the `anon` role access. Deleting a `called_phrases` row is only allowed within 30 seconds of `called_at` |
| `src/db/sql/triggers.sql`     | Bumps `sessions.last_activity_at` on every submission, call, and tile mark                                                      |

The `NODE_TLS_REJECT_UNAUTHORIZED=0` prefix is needed for local Drizzle Kit commands because `pg` rejects the Supabase pooler's certificate chain. The app itself doesn't need it, locally or on Vercel: `src/db/index.ts` strips `sslmode` from the connection string, which `pg` would otherwise treat as strict verification, and sets `ssl: { rejectUnauthorized: false }`.

### Run

```bash
npm run dev
```

## Scripts

| Command               | What it does                              |
| --------------------- | ----------------------------------------- |
| `npm run dev`         | Dev server                                |
| `npm run build`       | Production build                          |
| `npm run typecheck`   | `tsc --noEmit`                            |
| `npm run lint`        | ESLint                                    |
| `npm run format`      | Prettier write (`format:check` to verify) |
| `npm run test`        | Vitest in watch mode                      |
| `npm run test:run`    | Vitest single run (CI)                    |
| `npm run test:e2e`    | Playwright (`test:e2e:ui` for UI mode)    |
| `npm run db:generate` | Generate a Drizzle migration              |
| `npm run db:push`     | Push the schema to Supabase               |
| `npm run db:studio`   | Drizzle Studio                            |

Husky runs lint-staged on commit: ESLint and Prettier for TS/TSX, Prettier for JSON, Markdown and CSS.

## Architecture

```
src/
├── app/
│   ├── page.tsx                       # Home: session creation form
│   ├── [code]/page.tsx                # Server component: loads session by code
│   ├── [code]/session-client.tsx      # Switches Collection ⇄ Board view, tracks status + presence
│   └── api/
│       ├── sessions/route.ts          # POST   create session (retries on code collision)
│       ├── sessions/[code]/lock/route.ts  # PATCH  manual lock (optimistic: WHERE status='collecting')
│       └── cron/
│           ├── auto-lock/route.ts     # GET    lock sessions past scheduled_lock_at
│           └── cleanup/route.ts       # GET    delete sessions inactive > 2h
├── components/
│   ├── board/                         # BingoBoard (5×5 grid), BingoTile
│   ├── session/                       # CollectionView, BoardView, PhraseCallList, CalledPhraseItem,
│   │                                  # PlayerProgress, PresenceCount, BingoToast, LockButton, LockCountdown
│   └── ui/DateTimePicker.tsx
├── db/                                # schema.ts, index.ts, migrations/, sql/
├── hooks/
│   ├── useRealtimeSession.ts          # called_phrases + tile_marks + bingo_events on one channel
│   └── usePresence.ts                 # Supabase Presence headcount
├── lib/
│   ├── board.ts                       # generateBoard, detectBingo, getOrCreatePlayerId
│   ├── session.ts                     # generateSessionCode, validatePhrasePool
│   └── supabase/                      # browser and server clients
└── types/                             # enums.ts (all enums), models.ts, index.ts
tests/unit/                            # Vitest: lib, db schema, components
docs/                                  # spec and phased implementation plan
```

### Data flow

- **Server-rendered shell, client-driven state.** `[code]/page.tsx` loads the session with Drizzle. `SessionClient` takes over, subscribes to `sessions` UPDATEs, and re-fetches after subscribing to cover the gap between server render and hydration.
- **Writes go straight from the browser to Supabase** (anon key, governed by RLS) for submissions, phrase calls, undo, tile marks and bingo events. Only session creation, manual lock and cron go through API routes using Drizzle.
- **Marks are derived, then persisted.** `BoardView` computes `markedIndices` from the called-phrase set and the board's phrase→index map. A delta effect upserts or deletes `tile_marks` rows so other players' progress (`PlayerProgress`) stays in sync. The free-space center (index 12) is marked locally and isn't stored.
- **One channel per concern.** `session:{id}` multiplexes the game tables. `session-status:{id}` and `presence:{id}` are separate.
- **Idempotency lives in the database.** Unique constraints on `(session, phrase)`, `(session, player, tile)` and `(session, player, pattern)` mean racing clients can't double-call or double-fire. Postgres error `23505` is treated as success.

### Cron

Configured in `vercel.json` and secured with `Authorization: Bearer $CRON_SECRET`:

- `/api/cron/auto-lock`: every 5 minutes, locks collecting sessions whose `scheduled_lock_at` has passed.
- `/api/cron/cleanup`: every 30 minutes, deletes sessions inactive for more than 2 hours. It skips sessions with a future `scheduled_lock_at`.

## Conventions

- **TypeScript is strict:** `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`. No `any`. Use `import type` for types.
- **Enums live in `src/types/enums.ts`** and are referenced everywhere. Never use raw strings for categorical values.
- **JSDoc on all exports.** Prefer `readonly` on model properties and interfaces over classes.
- **Tests are named after user behavior**, not implementation details.

## Status

Implemented: session creation (visibility, scheduled lock, free space), phrase collection with live feed, manual and automatic locking, deterministic boards, phrase calling with 30s undo, real-time marks, presence, per-player progress, BINGO detection and toasts, cron jobs, and unit tests.

Planned, per `docs/implementation-plan.md`: Playwright specs (Phase 6b), WoW class selector and dice roller with synthesized Web Audio sound (Phase 7), the WoW-inspired theme (Phase 8), and expanded tests, CI and hardening (Phases 9–10). The current UI uses default Tailwind grays and indigo, not the gold-and-brown palette described in the spec.

## Further reading

- [`docs/raidnight-spec.md`](docs/raidnight-spec.md): full product specification
- [`docs/implementation-plan.md`](docs/implementation-plan.md): phased build plan
- [`CLAUDE.md`](CLAUDE.md): conventions for AI-assisted work in this repo
