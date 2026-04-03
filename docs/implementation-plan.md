# Raid Night — Phased Implementation Plan

Each phase has a clear deliverable that works end-to-end before moving on.
Complete phases in order. No phase skips.

---

## Pre-Phase 0 — External Services Setup

**Deliverable:** Supabase project and Vercel project exist, are linked to the GitHub repo, and environment variables are configured. Do this before touching any code.

### Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `raid-night`, choose a region close to you, set a strong DB password (save it)
3. Wait for provisioning (~2 min)
4. Go to **Project Settings → API**:
   - Copy `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Project Settings → Database → Connection pooling**:
   - Copy the `Connection string (URI)` → this is `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` in the string with your actual DB password
6. Go to **Database → Extensions** → search for `pg_cron` → enable it

### GitHub

1. Create a new empty repo named `raid-night` on GitHub (no template, no README)
2. Clone it locally:
   ```bash
   git clone https://github.com/yourname/raid-night
   cd raid-night
   ```
3. Copy in all documents from your outputs folder:
   ```
   raid-night/
   ├── CLAUDE.md
   └── docs/
       ├── raidnight-spec.md
       ├── implementation-plan.md
       └── skills/
           ├── database.md
           ├── realtime.md
           ├── audio.md
           └── testing.md
   ```
4. Push:
   ```bash
   git add .
   git commit -m "docs: add project spec, CLAUDE.md, and skill docs"
   git push
   ```

### Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your `raid-night` GitHub repo
3. Framework preset will auto-detect as **Next.js** once the app is scaffolded — leave as is for now
4. Go to **Environment Variables** before deploying and add all four:
   ```
   NEXT_PUBLIC_SUPABASE_URL       = (from Supabase Project Settings → API)
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = (from Supabase Project Settings → API)
   SUPABASE_SERVICE_ROLE_KEY      = (from Supabase Project Settings → API)
   DATABASE_URL                   = (from Supabase Project Settings → Database)
   ```
5. Click **Deploy** — it will show a blank/error page since there's no app code yet, that's expected
6. Note your deployment URL: `raid-night-yourname.vercel.app`

### Checklist before starting Phase 0

- [ ] Supabase project active, `pg_cron` extension enabled
- [ ] All 4 environment variables saved somewhere safe
- [ ] GitHub repo exists with docs committed and pushed
- [ ] Vercel project linked to repo with env vars set
- [ ] Any push to `main` will now trigger an auto-deploy

---

## Phase 0 — Project Foundation

**Deliverable:** A running Next.js app on Vercel connected to Supabase with strict TypeScript, linting, and CI enforced.

### Steps

1. Scaffold Next.js 14 with TypeScript: `npx create-next-app@latest raid-night --typescript --tailwind --app --src-dir`
2. Configure strict TypeScript in `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`)
3. Install and configure ESLint with `@typescript-eslint/strict` + `eslint-plugin-drizzle` + Prettier
4. Install and configure Husky + lint-staged (runs `eslint` + `tsc --noEmit` on pre-commit)
5. Install Drizzle ORM + Drizzle Kit: `npm install drizzle-orm pg` + `npm install -D drizzle-kit`
6. Install Supabase JS client: `npm install @supabase/supabase-js`
7. Create `.env.local` with Supabase URL, anon key, service role key, and DATABASE_URL
8. Create `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`
9. Create `src/db/index.ts` with Drizzle client connected via DATABASE_URL
10. Create GitHub repository, push initial commit
11. Connect Vercel project to GitHub repo, add environment variables in Vercel dashboard
12. Confirm deployment passes

### Acceptance Criteria

- `npm run typecheck` passes with zero errors
- `npm run lint` passes
- App deploys to Vercel successfully
- Supabase connection verified (test query in an API route)

---

## Phase 1 — Data Layer

**Deliverable:** Full Drizzle schema with all tables, migrations applied to Supabase, and TypeScript types + enums defined.

### Steps

1. Create `src/types/enums.ts` with `WowClass`, `BingoPattern`, `SoundEvent`, `RealtimeEvent`
2. Create `src/types/models.ts` with `Session`, `CalledPhrase`, `TileMark`, `BingoEvent` interfaces (JSDoc on all)
3. Create `src/db/schema.ts` with all four tables: `sessions`, `called_phrases`, `tile_marks`, `bingo_events`
4. Add `pgEnum` for `WowClass` in schema, confirm TypeScript enum alignment
5. Configure `drizzle.config.ts`
6. Run `npm run db:generate` to generate initial migration
7. Run `npm run db:push` to apply migration to Supabase
8. Add Postgres trigger `update_session_activity` on `tile_marks` INSERT (updates `sessions.last_activity_at`)
9. Add pg_cron job to delete inactive sessions (last_activity_at < now() - 2 hours, runs every 30 min)
10. Enable Row Level Security on all tables in Supabase dashboard
11. Write Vitest unit tests for any pure type utilities

### Acceptance Criteria

- All tables exist in Supabase with correct columns and constraints
- `UNIQUE(session_id, phrase)` on `called_phrases` verified
- `UNIQUE(player_id, tile_index)` on `tile_marks` verified
- `ON DELETE CASCADE` verified on all child tables
- `npm run typecheck` still passes

---

## Phase 2 — Board Generation

**Deliverable:** Deterministic board generation fully implemented and tested.

### Steps

1. Install `seedrandom`: `npm install seedrandom` + `npm install -D @types/seedrandom`
2. Create `src/lib/board.ts`:
   - `getOrCreatePlayerId(sessionCode: string): string` — localStorage UUID management
   - `generateBoard(playerId: string, sessionCode: string, phrasePool: readonly string[]): string[]` — seeded Fisher-Yates shuffle, returns 25 phrases
   - `detectBingo(markedIndices: readonly number[]): BingoPattern | null` — checks all 12 patterns
3. Write Vitest unit tests for all three functions:
   - Same seed always produces same board
   - Different seeds produce different boards
   - All 25 indices are unique per board
   - All 12 bingo patterns detected correctly
   - No false positives on non-bingo states
4. Create `src/lib/session.ts`:
   - `generateSessionCode(): string` — adjective-noun-number format
   - `validatePhrasePool(phrases: string[]): ValidationResult` — min 25, max 100, deduplicate

### Acceptance Criteria

- `npm run test` passes all board generation tests
- `generateBoard` is provably deterministic (same inputs = same output, 100 test runs)

---

## Phase 3 — Session Creation (Home Page)

**Deliverable:** Creator can configure and create a session, receiving a shareable URL for the collection phase.

### Steps

1. Add `SessionStatus` and `SubmissionVisibility` enums to `src/types/enums.ts`
2. Update Drizzle schema: add `status`, `visibility`, `scheduled_lock_at`, `locked_at` to `sessions`; create `phrase_submissions` table
3. Run `npm run db:generate` + `npm run db:push`
4. Add pg_cron auto-lock job (runs every 5 min, locks sessions past `scheduled_lock_at`)
5. Create `src/app/api/sessions/route.ts`:
   - `POST`: validates inputs, generates session code, inserts session with `status='collecting'`
   - Returns `{ code, url }`
6. Create `src/app/api/sessions/[code]/lock/route.ts`:
   - `PATCH`: reads all `phrase_submissions`, copies to `sessions.phrase_pool`, sets `status='locked'`
7. Build `src/app/page.tsx`:
   - Session name input (optional)
   - Visibility toggle: "Open" / "Blind" with explanatory copy
   - Scheduled lock datetime picker (optional, clearable)
   - "Create Session" button → URL display with copy button

### Acceptance Criteria

- Session created with `status='collecting'` in Supabase
- Visibility and scheduled_lock_at saved correctly
- Lock API correctly transitions status, copies phrases, sets locked_at
- Auto-lock pg_cron job active

---

## Phase 4 — Collection Phase

**Deliverable:** Players submit phrases collaboratively. Session locks (manually or automatically) and seamlessly transitions all clients to board view.

### Steps

1. Create `src/app/[code]/page.tsx` as a server component:
   - Reads `session.status` → renders `<CollectionView>` or `<BoardView>` accordingly
2. Create `src/components/session/CollectionView.tsx`:
   - Phrase input: normalise (lowercase trim) → INSERT into `phrase_submissions`
   - UNIQUE constraint violations silently ignored
   - `open` mode: real-time live feed of submitted phrases
   - `blind` mode: submission count only ("14 phrases submitted")
3. Create `src/components/session/LockButton.tsx`:
   - Confirmation modal: _"Lock N phrases and start the game?"_
   - On confirm: PATCH `/api/sessions/[code]/lock`
4. Create `src/components/session/LockCountdown.tsx`:
   - Live countdown when `scheduled_lock_at` is set
   - Client-side lock trigger at zero as fallback
5. Subscribe to `sessions` UPDATE in real-time:
   - On `status → 'locked'`: call `transitionToBoard(phrasePool)` — no page reload
6. `getOrCreatePlayerId(sessionCode)` called on collection page mount — same UUID used in game phase

### Acceptance Criteria

- Open mode: phrases appear live for all connected clients
- Blind mode: count only, no phrase content visible pre-lock
- Manual lock transitions all clients to board within ~1s, no reload
- Auto-lock broadcasts transition to all clients
- Lock with < 25 phrases proceeds with UI warning
- Duplicate submissions silently ignored

---

## Phase 5 — Player Board Page

**Deliverable:** After lock, players see their unique board and can mark tiles locally.

---

## Phase 5 — Phrase Calling System + Undo

**Deliverable:** Any player can call a phrase; it auto-marks on all boards. 30-second undo window works.

### Steps

1. Create `src/components/session/PhraseCallList.tsx`:
   - Displays uncalled phrases (phrasePool minus already-called phrases)
   - Searchable/scrollable list
   - Tap to call: INSERT into `called_phrases`
   - Handles UNIQUE constraint error gracefully (phrase already called by someone else)
2. Handle phrase call in real-time subscription:
   - On `called_phrases` INSERT: check if phrase exists on local board
   - If yes: INSERT into `tile_marks` for this player with the phrase linked
   - Update local board state
3. Implement undo window:
   - Track `calledAt` timestamp locally per called phrase
   - Show countdown indicator (30s draining bar) on each called phrase
   - Undo button: DELETE from `called_phrases` (server action)
   - On `called_phrases` DELETE: DELETE matching `tile_marks` WHERE phrase = undone phrase
   - Update local board state (remove marks)
4. Update `called_phrases` real-time subscription to handle DELETEs (undo events)

### Acceptance Criteria

- Calling a phrase removes it from the callable list for everyone
- Matching tiles auto-mark on the caller's board
- Undo within 30s removes marks and restores phrase to callable list
- After 30s the undo control disappears
- Two players racing to call the same phrase: one wins, other gets no error (graceful UNIQUE conflict handling)

---

## Phase 6 — Real-time Layer (Tile Sync, Presence, BINGO)

**Deliverable:** All players see each other's tile progress live; BINGO fires to everyone.

### Steps

1. Create `src/hooks/useRealtimeSession.ts`:
   - Subscribes to `tile_marks` INSERT, `called_phrases` INSERT/DELETE, `bingo_events` INSERT
   - Exposes `allPlayerMarks: Map<string, number[]>` (playerId → tile indices)
   - Returns `calledPhrases: string[]` and `bingoEvents: BingoEvent[]`
2. Create `src/hooks/usePresence.ts`:
   - Tracks anonymous `{ playerId }` via Supabase Presence
   - Returns `playerCount: number`
3. Create `src/components/session/PresenceCount.tsx`:
   - Displays "4 players in session" using `usePresence`
4. Implement BINGO detection in `useBoard`:
   - After each tile mark, call `detectBingo(markedIndices)`
   - If pattern detected and not yet fired: INSERT into `bingo_events`
5. Create `src/components/session/BingoToast.tsx`:
   - Subscribes to `bingo_events` INSERT in real-time
   - Displays "🎉 Someone got BINGO!" toast with animation
6. Add progress overlay to board: each other player shown as colored dot with tile count

### Acceptance Criteria

- Two browser tabs open on same session: marking a tile in tab A updates progress in tab B within 1s
- BINGO toast fires in all tabs when any player completes a pattern
- Player count reflects connected players
- No duplicate BINGO events for the same pattern

---

## Phase 6b — Core Playwright Tests

**Deliverable:** Playwright E2E tests covering the complete create → collect → lock → board → call → bingo flow. Run against a live Supabase instance.

### Why now (not Phase 9)

Phases 1-6 deliver the full gameplay loop. Testing this end-to-end now catches integration bugs before layering on audio, theming, and polish. Waiting until Phase 9 means debugging real-time sync issues late when they're harder to isolate.

### Setup

1. Install Playwright browsers: `npx playwright install`
2. Create `playwright.config.ts` with `baseURL: 'http://localhost:3000'`, `webServer` config to start dev server
3. Ensure `.env.local` is loaded for the dev server (Supabase connection required)

### Playwright Feature Tests

```
tests/e2e/
├── create-session.spec.ts      # Host creates session, receives shareable URL
├── join-session.spec.ts        # Player opens URL, collection view renders
├── submit-phrases.spec.ts      # Player submits phrases, count updates (open + blind modes)
├── lock-session.spec.ts        # Manual lock transitions to board view
├── call-phrase.spec.ts         # Player calls phrase, tile auto-marks, phrase leaves list
├── undo-phrase.spec.ts         # Player undoes within 30s, marks removed, phrase returns
├── bingo-detection.spec.ts     # Player achieves bingo, toast fires
└── presence.spec.ts            # Two players: headcount shows 2
```

### Acceptance Criteria

- All Playwright tests pass locally against dev server + Supabase
- Tests use real database (not mocks) — each test creates a fresh session
- Tests clean up after themselves (sessions expire via 2-hour cleanup, or test uses unique codes)
- No test relies on implementation details — test visible user behaviour only

---

## Phase 7 — Class System + Audio

**Deliverable:** Players can pick or randomly roll a WoW class; tile marks play class-specific synthesized sounds.

### Steps

1. Create `src/lib/audio/index.ts` — `AudioEngine` class:
   - `playClassMark(cls: WowClass): void`
   - `playPhraseCalled(): void`
   - `playBingo(): void`
   - `playUndo(): void`
   - Lazy-initializes `AudioContext` on first user interaction (browser autoplay policy)
2. Create individual class sound files in `src/lib/audio/classes/`:
   - One file per `WowClass` enum value
   - Each exports a `play(ctx: AudioContext): void` function
   - All built from oscillators, gain envelopes, filters — no external files
3. Create `src/components/class/ClassDiceRoller.tsx`:
   - WoW-style dark panel with gold border
   - Two CSS 3D dice using `transform-style: preserve-3d`
   - Roll button → CSS keyframe tumble animation → `setTimeout` → reveal result
   - Class reveal card fades in with class name in class color
   - Mini class grid showing all 9 classes, assigned one highlighted
   - "Re-roll" link and fallback manual picker
4. Create `src/components/class/ClassSelector.tsx`:
   - Wraps `ClassDiceRoller`
   - Persists selected class to `localStorage` keyed by session code
   - Exposes `selectedClass: WowClass | null`
5. Wire `AudioEngine` into `BingoTile` click handler and real-time event handlers
6. Integrate `ClassSelector` into board page (compact corner widget)

### Acceptance Criteria

- Dice animate smoothly on click, class reveals after animation
- Re-roll produces different class (occasionally same is fine — truly random)
- Manual picker allows selecting any of 9 classes
- Selection persists on refresh
- Tile mark plays correct class sound
- BINGO plays fanfare
- Undo plays deflate tone
- AudioContext correctly deferred until first user interaction

---

## Phase 8 — WoW Theme + Polish

**Deliverable:** Full visual theme applied, animations polished, mobile-responsive.

### Steps

1. Install and configure `next/font/google` with Cinzel, Cinzel Decorative, and Crimson Pro
2. Define all CSS variables in `src/app/globals.css` (full palette from spec)
3. Configure `tailwind.config.ts` to extend with theme variables
4. Apply theme to all components:
   - Home page: phrase input, session creation, URL display
   - Board page: 5×5 grid tiles, marked state animation, phrase call list, presence count
   - Class selector: dice roller panel, class reveal
   - BINGO toast: gold banner with Cinzel Decorative
5. Add tile mark animation: amber fill pulse on mark
6. Add called phrase countdown bar: thin draining line under recently called phrase
7. Add BINGO screen flash: brief gold overlay on BINGO event
8. Mobile responsive pass:
   - Board page: tiles scale to fit smaller screens
   - Phrase call list: bottom drawer pattern on mobile
   - Class selector: accessible on mobile without covering board
9. Add `robots.txt` and basic `<head>` meta tags

### Acceptance Criteria

- All pages visually consistent with WoW-inspired theme
- Tiles, panels, buttons all use CSS variable palette
- Cinzel renders for headers, Crimson Pro for tile text
- Usable on 375px viewport (iPhone SE)
- No horizontal overflow on any page

---

## Phase 9 — Testing Expansion

**Deliverable:** Expand test coverage to include Phase 7-8 features (class system, audio, theme) and add CI integration. Core gameplay Playwright tests already exist from Phase 6b.

### Additional Vitest Unit Tests

- `AudioEngine` — mock AudioContext, verify correct synthesizer called per class

### Additional Playwright Feature Tests

```
tests/e2e/
├── class-selector.spec.ts      # Roll dice, class assigned, persists on refresh
└── session-expiry.spec.ts      # Expired session returns 404 (mocked)
```

### CI Integration

- Set up GitHub Actions: typecheck + lint + vitest + playwright on every PR

### Acceptance Criteria

- All Playwright tests pass in CI (including Phase 6b tests)
- All Vitest tests pass
- No test relies on internal implementation details — test behaviour, not internals

---

## Phase 10 — Deploy + Hardening

**Deliverable:** Production-ready deployment with monitoring basics.

### Steps

1. Set up GitHub Actions CI: typecheck + lint + vitest + playwright on every PR
2. Configure Vercel production environment variables
3. Verify Supabase RLS policies are correctly scoped
4. Add rate limiting on `POST /api/sessions` (Vercel Edge middleware or Upstash Redis)
5. Add basic error boundary in React for board page failures
6. Verify pg_cron cleanup job is running (check Supabase logs)
7. Add `<title>` and OG meta tags for share previews (when sharing the session link)
8. Manual smoke test: full session flow with 3+ browser tabs

### Acceptance Criteria

- CI passes on main branch
- Rate limiting prevents session spam
- Share link has correct OG preview
- pg_cron cleanup confirmed active
- No client-side `console.error` in production build
