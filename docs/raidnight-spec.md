# Raid Night — Project Specification

_Last updated: March 2026_

---

## Product Summary

A real-time shared bingo game for gaming groups during raid/session downtime. Before the raid, the group collectively submits phrases and keywords during an open collection phase. At a scheduled time (or manually), the phrase pool locks and boards are generated. Each player gets a unique randomized board, plays live with real-time tile sync, shared phrase calling, and BINGO broadcasts.

No accounts. No login. No persistent host privileges.

---

## Tech Stack

| Layer                    | Choice                                                                    | Rationale                                                                  |
| ------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework                | Next.js 14 (App Router)                                                   | Native Vercel, RSC, API routes in one repo                                 |
| Hosting                  | Vercel (free tier)                                                        | Serverless, perfect for bursty raid-night traffic                          |
| Database + Real-time     | Supabase (Postgres + WebSocket subscriptions + pg_cron)                   | One SDK for DB + real-time + presence                                      |
| ORM                      | Drizzle ORM                                                               | TypeScript-first, schema = types, no binary engine, native PG enum support |
| Styling                  | Tailwind CSS                                                              | Utility-first, pairs naturally with Next.js App Router                     |
| Unit / Integration Tests | Vitest                                                                    | Fast, TS-native, Jest-compatible API                                       |
| E2E / Feature Tests      | Playwright                                                                | User-flow focused                                                          |
| Linting                  | ESLint + `@typescript-eslint/strict` + `eslint-plugin-drizzle` + Prettier | Strict and consistent                                                      |
| Pre-commit               | Husky + lint-staged                                                       | Enforces lint + typecheck on every commit                                  |
| RNG                      | `seedrandom`                                                              | Deterministic board generation from playerId + sessionCode                 |

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Vercel (Next.js)               │
│                                             │
│  /              → Home / Create page        │
│  /[code]        → Adaptive session page     │
│                   (collecting or locked)    │
│  /api/sessions  → Create session (POST)     │
│  /api/sessions/ → Lock session (PATCH)      │
│     [code]/lock                             │
└──────────────┬──────────────────────────────┘
               │ Supabase JS SDK
┌──────────────▼──────────────────────────────┐
│              Supabase                       │
│                                             │
│  Postgres DB  ←→  Real-time Engine          │
│  (sessions,       (broadcast on changes     │
│   phrase_         to phrase_submissions,    │
│   submissions,    tile_marks,               │
│   tile_marks,     called_phrases,           │
│   called_         bingo_events)             │
│   phrases,                                  │
│   bingo_events)                             │
│                                             │
│  pg_cron          (auto-lock + expiry       │
│                    every 5 minutes)         │
└─────────────────────────────────────────────┘
```

---

## Session State Machine

```
COLLECTING ──(lock)──► LOCKED ──(inactivity 2hrs)──► (deleted)
               ▲
               │
         auto-lock fires
         (scheduled_lock_at)
```

A session is always in one of two active states. The adaptive `/[code]` page renders different UI based on which state it reads from the server.

---

## Data Model

### `sessions`

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
code              text UNIQUE NOT NULL        -- e.g. "frost-wolf-42"
phrase_pool       jsonb NOT NULL DEFAULT '[]' -- finalized string[]; populated on lock
status            text NOT NULL DEFAULT 'collecting'  -- 'collecting' | 'locked'
visibility        text NOT NULL DEFAULT 'open'        -- 'open' | 'blind'
created_at        timestamptz DEFAULT now()
last_activity_at  timestamptz DEFAULT now()
scheduled_lock_at timestamptz                 -- nullable; auto-lock fires at this time
locked_at         timestamptz                 -- nullable; set when status → 'locked'
```

### `phrase_submissions`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id    uuid REFERENCES sessions(id) ON DELETE CASCADE
phrase        text NOT NULL                -- stored as lowercase trimmed
submitted_by  uuid NOT NULL               -- anonymous client UUID
submitted_at  timestamptz DEFAULT now()
UNIQUE(session_id, phrase)                -- deduplication enforced at DB level
```

> During 'open' visibility: INSERT broadcasts live to all collection-phase subscribers.
> During 'blind' visibility: only submission count is broadcast, not content.
> On lock: all phrases copied to sessions.phrase_pool; table retained for history.

### `tile_marks`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id    uuid REFERENCES sessions(id) ON DELETE CASCADE
player_id     uuid NOT NULL               -- anonymous client UUID (from localStorage)
tile_index    int NOT NULL                -- 0–24 for a 5x5 grid
phrase        text NOT NULL               -- links mark to source phrase for undo rollback
marked_at     timestamptz DEFAULT now()
UNIQUE(player_id, tile_index)
```

> Every INSERT updates sessions.last_activity_at via Postgres trigger.

### `called_phrases`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id    uuid REFERENCES sessions(id) ON DELETE CASCADE
phrase        text NOT NULL
called_by     uuid NOT NULL               -- anonymous client UUID
called_at     timestamptz DEFAULT now()   -- undo window = 30s from this timestamp
UNIQUE(session_id, phrase)
```

> UNIQUE constraint prevents duplicate calls.
> DELETE within 30s triggers undo: removes associated tile_marks, phrase re-enters callable list.

### `bingo_events`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id    uuid REFERENCES sessions(id) ON DELETE CASCADE
player_id     uuid NOT NULL
pattern       text NOT NULL               -- "row_0", "col_3", "diagonal_tl", etc.
fired_at      timestamptz DEFAULT now()
```

---

## Session Lifecycle

```
1. Creator visits /
   → Names the session (optional label)
   → Selects visibility: 'open' (live feed) or 'blind' (surprise reveal)
   → Optionally sets scheduled_lock_at via datetime picker
   → POST /api/sessions → creates session with status='collecting'
   → Redirected to /[code]
   → Shareable URL displayed: raidnight.vercel.app/frost-wolf-42

2. Collection phase — anyone visits /[code]
   → Server reads status='collecting' → renders submission UI
   → getOrCreatePlayerId(sessionCode) runs on mount (anonymous UUID in localStorage)
   → Player submits phrases (one at a time or bulk)
   → Phrase normalised (lowercase trim) → INSERT into phrase_submissions
   → UNIQUE constraint silently deduplicates
   → 'open' visibility: all connected clients see new phrase appear in live feed
   → 'blind' visibility: all connected clients see submission count increment only
   → Countdown timer shown if scheduled_lock_at is set

3. Lock moment
   MANUAL: Any player clicks "Lock & Start" → confirmation modal shows phrase count
     → "Lock 34 phrases and start the game?" → confirm
     → PATCH /api/sessions/[code]/lock
   AUTO: pg_cron fires every 5 minutes → finds sessions where
     scheduled_lock_at <= now() AND status = 'collecting'
     → runs same lock logic

   Lock logic:
   → SELECT all phrases from phrase_submissions for this session
   → If < 25 phrases: lock anyway, warn in UI (game may have repeated boards)
   → Copy phrases array to sessions.phrase_pool
   → SET status='locked', locked_at=now()
   → Real-time broadcast fires to all connected clients
   → All clients transition from submission UI to board UI (same URL, no reload needed)

4. Game phase — /[code] with status='locked'
   → Server reads status='locked' → renders board UI
   → Board generated client-side: seedrandom(playerId + sessionCode) → unique 5x5 grid
   → Player subscribes to game real-time channel
   → Any player calls a phrase from the callable list
   → INSERT into called_phrases → auto-marks matching tiles on all boards
   → 30s undo window per called phrase
   → BINGO detection → INSERT into bingo_events → "🎉 Someone got BINGO!" toast

5. Expiry
   → pg_cron runs every 30 minutes
   → Deletes sessions where last_activity_at < now() - interval '2 hours'
   → CASCADE deletes all child records
```

---

## Board Generation Logic

```javascript
import seedrandom from 'seedrandom'

function getOrCreatePlayerId(sessionCode) {
  const key = `raidnight:player:${sessionCode}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function generateBoard(playerId, sessionCode, phrasePool) {
  const seed = `${playerId}:${sessionCode}`
  const rng = seedrandom(seed)
  const pool = [...phrasePool]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 25)
}
```

Same `playerId + sessionCode` always produces the same board. Closing and reopening the tab preserves the board without any server state.

---

## Real-time Feature Implementation

### Tile Progress

```javascript
supabase
  .channel(`session:${code}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'tile_marks',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      /* update progress state for payload.new.player_id */
    },
  )
  .subscribe()
```

### BINGO Broadcast

```javascript
// After each tile mark, check locally:
function checkBingo(markedTiles) {
  const patterns = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ]
  return patterns.find((p) => p.every((i) => markedTiles.includes(i)))
}
// On bingo: INSERT into bingo_events → real-time fires to all clients
```

### Session Presence (headcount only)

```javascript
supabase
  .channel(`session:${code}`)
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setPlayerCount(Object.keys(state).length)
  })
  .track({ player_id: playerId })
  .subscribe()
```

### Collection Phase — Live Submission Feed (open visibility)

```javascript
supabase
  .channel(`collect:${code}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'phrase_submissions',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      // visibility === 'open': append payload.new.phrase to feed
      // visibility === 'blind': increment count only
    },
  )
  .subscribe()
```

### Lock Broadcast

```javascript
supabase
  .channel(`collect:${code}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new.status === 'locked') {
        // Transition UI from collection to board — no page reload
        transitionToBoard(payload.new.phrase_pool)
      }
    },
  )
  .subscribe()
```

---

## Page Structure

### `/` — Home / Create

- Session name input (optional display label)
- Visibility toggle: "Open submissions" / "Blind submissions" with explanation of each
- Scheduled lock datetime picker (optional; clear button to remove)
- "Create Session" button
- On success: shareable URL with copy button, instructions for sharing

### `/[code]` — Adaptive Session Page

**State A — Collecting** (`session.status === 'collecting'`)

- Session label shown
- Phrase submission input (single field, submit on enter or button)
- `open` mode: live scrolling feed of all submitted phrases
- `blind` mode: submission count only ("14 phrases submitted")
- Scheduled lock countdown (if set): "Locks in 12:43"
- "Lock & Start" button → confirmation modal: _"Lock N phrases and start the game?"_
- Manual submissions can be deleted by the submitter within their own session (optional)

**State B — Locked** (`session.status === 'locked'`)

- Class selector (dice roller) shown first if no class selected
- 5×5 bingo grid generated from player UUID + session code
- Callable phrase list (uncalled phrases from phrase_pool)
- Player headcount indicator
- Live tile progress (anonymous colored dots)
- BINGO toast on any player completing a pattern

---

## Session Code Format

Human-readable: `[adjective]-[noun]-[2-digit number]`
Examples: `frost-wolf-42`, `holy-drake-07`, `shadow-pact-19`

~100 adjectives × ~100 nouns × 99 numbers = ~990,000 combinations.

---

## Inactivity Cleanup + Auto-lock (pg_cron)

```sql
-- Every 5 minutes: auto-lock sessions whose scheduled time has passed
SELECT cron.schedule('auto-lock-sessions', '*/5 * * * *', $$
  UPDATE sessions
  SET
    status = 'locked',
    locked_at = now(),
    phrase_pool = (
      SELECT jsonb_agg(phrase ORDER BY submitted_at)
      FROM phrase_submissions
      WHERE phrase_submissions.session_id = sessions.id
    )
  WHERE
    status = 'collecting'
    AND scheduled_lock_at IS NOT NULL
    AND scheduled_lock_at <= now();
$$);

-- Every 30 minutes: delete inactive locked sessions
SELECT cron.schedule('cleanup-inactive-sessions', '*/30 * * * *', $$
  DELETE FROM sessions
  WHERE last_activity_at < now() - interval '2 hours';
$$);
```

`last_activity_at` updated via Postgres trigger on `tile_marks` INSERT.

---

## Phrase Pool Constraints

| Parameter   | Value | Rationale                                         |
| ----------- | ----- | ------------------------------------------------- |
| Minimum     | 25    | Fills one board; lock still proceeds but UI warns |
| Recommended | 40–60 | Meaningful board differences                      |
| Maximum     | 100   | UX constraint on submission form                  |

Phrases are normalised to lowercase trimmed before INSERT. UNIQUE constraint handles deduplication.

---

## Supabase Free Tier Headroom

| Resource              | Limit          | Expected Usage                                     |
| --------------------- | -------------- | -------------------------------------------------- |
| Database size         | 500 MB         | ~2KB per session including submissions, negligible |
| Real-time connections | 200 concurrent | ~20–30 per raid group                              |
| Bandwidth             | 2 GB/month     | Very low for text-only payloads                    |

---

## Visual Theme — WoW-Inspired Modernised

Clean layout with unmistakable WoW texture and color. Dark warm palette, gold accents, serif typography.

### Color Palette

```css
--bg-base: #1a1209;
--panel-bg: #2a1f0e;
--panel-border: #c8972a;
--panel-glow: #c8972a22;
--text-primary: #f0e6c8;
--text-muted: #8a7a5a;
--accent-gold: #c8972a;
--accent-green: #4a9e4a;
--accent-red: #9e3a3a;
--tile-marked: #6b4a0e;
--tile-marked-glow: #c8972a44;
```

### Typography

- **Headers**: Cinzel (Google Fonts) — evokes WoW title font
- **Body / Tile phrases**: Crimson Pro — readable serif, medieval warmth
- **Special moments** (BINGO): Cinzel Decorative

### Key UI Details

- Panels: 1px gold border, no border-radius, subtle noise texture
- Tiles: square, gold border, parchment inner — marked tiles get amber fill + pulse
- Buttons: dark fill, gold border, small-caps label
- BINGO toast: full-width gold banner, brief screen flash

---

## Sound Design — Class-Based Web Audio

All sounds synthesized via Web Audio API. No external files.

### Class Sound Profiles

| Class   | Sound Character                          |
| ------- | ---------------------------------------- |
| Warrior | Short metallic clang, low resonance      |
| Mage    | Bright crystalline ascending arpeggio    |
| Priest  | Soft warm bell chord, gentle reverb tail |
| Paladin | Deep resonant hammer + holy shimmer      |
| Rogue   | Quick dry percussive tick                |
| Druid   | Soft organic rustle + nature flute       |
| Warlock | Low dark drone, dissonant harmonic       |
| Hunter  | Clean bowstring snap + short whistle     |
| Shaman  | Short thunder crack, rolling decay       |

### Event Tiers

- **Tile marked**: Class ability sound (0.5s)
- **Phrase called**: Neutral chime, softer
- **BINGO**: Full ascending fanfare (1.5s)
- **Undo**: Descending deflate tone

---

## Class Selector UI

WoW-style dark panel with gold border containing two CSS 3D dice.

- **Roll**: dice tumble animation → class assigned → reveal card fades in with class name in class color
- **Manual pick**: 9 class buttons as fallback
- **Re-roll**: always available
- Class stored in `localStorage` keyed by session code
- All 9 classes: Warrior, Mage, Priest, Paladin, Rogue, Druid, Warlock, Hunter, Shaman

---

## Phase 1 Scope (MVP)

- [ ] Home page with session creation (name, visibility, optional scheduled lock)
- [ ] `/[code]` adaptive page — collecting state: submission form + live feed or blind count
- [ ] Lock mechanism: manual (any player + confirmation) + auto (pg_cron)
- [ ] Real-time lock broadcast → seamless UI transition to board (no reload)
- [ ] `/[code]` locked state: instant board load, no name gate
- [ ] Deterministic board generation (`seedrandom`)
- [ ] Callable phrase list — anyone can call, auto-marks all boards
- [ ] 30-second undo window with countdown indicator
- [ ] Real-time tile progress sync
- [ ] Session presence (player headcount)
- [ ] BINGO detection + broadcast toast
- [ ] Session inactivity expiry (pg_cron)
- [ ] WoW-inspired modernised visual theme
- [ ] Class selector with 3D dice roller
- [ ] All 9 class sounds (Web Audio synthesized)
- [ ] Mobile-responsive layout

## Phase 2 (Post-MVP)

- [ ] Additional game modes (Prophecy Draft, Blackout)
- [ ] Phrase upvoting during collection phase
- [ ] Phrase library presets for popular raids
- [ ] Board screenshot / export
- [ ] Additional themes (FF14, Lost Ark, etc.)
- [ ] Session replay / history view
