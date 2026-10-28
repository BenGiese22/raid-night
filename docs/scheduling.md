# Scheduling the auto-lock

A host can optionally pick a time for the session to lock itself and deal everyone a board. This document describes the rules, how the picker behaves, and why.

Code: `src/lib/schedule.ts` (rules, pure functions), `src/components/ui/DateTimePicker.tsx` (UI), `src/app/api/sessions/route.ts` (server validation), `src/app/api/cron/auto-lock/route.ts` (the job that locks).

## Rules

| Rule             | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| Earliest time    | At least 5 minutes from now                               |
| Latest time      | At most 7 days (168 elapsed hours) from now               |
| Time granularity | 5-minute slots in the picker                              |
| Scheduling is    | Optional. With no time set, anyone can lock manually      |
| Time zone        | The host's local time. The API receives an ISO UTC string |

The limits are defined once, as `MIN_LOCK_DELAY_MS` and `MAX_LOCK_DELAY_MS` in `src/lib/schedule.ts`. The picker and the API route both import them, so they cannot drift apart. The API is the authority: it returns 400 with `scheduledLockAt must be at least 5 minutes in the future` or `scheduledLockAt must be within 7 days`.

**Elapsed time, not calendar days.** The 7-day limit is 168 hours of elapsed time. In a week where clocks change, the same wall-clock time seven days later can be an hour past the limit (for example, 3:00 PM on Oct 28 to 3:00 PM on Nov 4 in a US time zone is 169 hours). The picker and the server agree because both measure in milliseconds.

## How the picker behaves

The picker is built so that a host can't end up in a state where the time is silently ignored.

**Day chips.** Seven chips cover today through six days out, labelled `Today`, `Tomorrow`, then weekday and date (`Sat 31`). Choosing a day keeps the current clock time when it is valid on that day. Otherwise the time moves to the nearest valid slot:

- On **Today**, a time that has already passed (or is under 5 minutes away) moves to the next 5-minute slot at least 5 minutes out. At 9:32 PM with 8:00 PM selected, Today becomes 9:40 PM.
- A day with no valid slot is disabled with an explanation. At 11:58 PM, Today is disabled.

**Changing the clock time.** Changing the hour, minute, or AM/PM picks the soonest day where that time is valid, preferring the day already selected. Choosing 7:00 AM at 9:00 PM lands on tomorrow morning, and the summary says so. If no day fits, the picker shows the error instead of changing anything.

**Quick picks.** `In 1 hour`, `In 2 hours`, `In 4 hours`, and `In 1 day` round up to the next 5-minute slot and are capped at the 7-day limit.

**Staleness.** The picker re-checks every 30 seconds. A time that was valid when chosen but drifts inside the 5-minute minimum shows an error.

**Invalid times never submit.** While the selected time is invalid, the picker emits an empty value, shows the reason in coral, and tells the form to disable **Create session** (`onValidityChange`). Before this, an invalid time was dropped and the session was created with no schedule.

### What the host sees

- A summary in plain language: `Boards deal Saturday at 8:00 PM, in 3 d 6 h`.
- A timeline from `now` to `in 7 days` with a tick at each midnight and a marker where the chosen time falls. It shows the limit visually, with no explanation needed.
- The time zone being used.
- `Don't auto-deal` to clear the schedule.

The summary's left edge and the marker use the highlighter yellow when the time is valid and coral (`flare`) when it is not. Coral is reserved for errors and destructive actions.

## Pure functions (`src/lib/schedule.ts`)

All time logic takes an injectable `now`, so it is testable without fake timers.

| Function                                        | Purpose                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `earliestLockTime(now)` / `latestLockTime(now)` | Window bounds, rounded to 5-minute slots                                 |
| `validateLockTime(value, now)`                  | User-facing error message, or `null` when valid                          |
| `snapToWindow(date, now)`                       | Pulls a moment into the window                                           |
| `partsForDay(offset, clock, now)`               | Result of choosing a day chip, or `null` when that day has no valid slot |
| `partsForClock(clock, now, preferred)`          | Result of changing the clock time (may be invalid if no day fits)        |
| `partsFromNowPlus(hours, now)`                  | Result of a quick pick                                                   |
| `describeLockTime(date, now)`                   | The summary sentence                                                     |
| `windowPosition(date, now)`                     | Marker position on the timeline, 0 to 1                                  |
| `midnightPositions(now)`                        | Tick positions on the timeline                                           |

`Period` (AM/PM) is an enum in `src/types/enums.ts`, per the project rule that categorical values are never raw strings.

## How the lock happens

1. The session stores `scheduled_lock_at`.
2. The collection page shows a live countdown (`LockCountdown`). When it reaches zero it sends a best-effort `PATCH /api/sessions/[code]/lock`.
3. The Vercel Cron job `GET /api/cron/auto-lock` runs every 5 minutes and locks any collecting session whose time has passed. This is the primary mechanism, so the real lock can lag the chosen time by up to 5 minutes if nobody has the page open.
4. The cleanup cron skips sessions with a future `scheduled_lock_at`, so a session scheduled days ahead is not deleted while it waits. It is removed once the lock time has passed and the session has been inactive for 2 hours.

## Decisions

- **Why 7 days, not 24 hours.** Raid groups plan ahead. The original 24-hour limit forced a host to wait until the day of the raid. A week matches how groups schedule. It is also a sanity bound: anonymous session creation has no other limit, and waiting sessions are never cleaned up early, so the cap stops sessions from lingering indefinitely.
- **Why snap instead of reject.** The bug that prompted this work was a host clicking Today with an old time still selected. Rejecting would have been accurate but unhelpful. A raid group wants "tonight", so the picker finds the nearest valid time and shows it.
- **Why day chips instead of a date input.** The native date input allowed dates outside the window, and clearing it left a stale value behind. Chips cannot produce an invalid date and take one tap.
- **Supabase free tier.** Free projects pause after about a week of inactivity. Activity resets this, but a session scheduled near the 7-day limit on an otherwise unused project could find the database paused. Keep the cap at 7 days or less.

## Tests

- `tests/unit/lib/schedule.test.ts`: all the rules above, including the exact 5-minute and 7-day boundaries, 12 AM and 12 PM round trips for every 5-minute slot, the 11:58 PM case, and the reported "Today with a passed time" bug. The 7-day boundary test uses elapsed time so it passes in any time zone.
- `tests/unit/components/ui/DateTimePicker.test.tsx`: Today bumping forward, Today disabled at 11:58 PM, keeping the time for Tomorrow, a weekday chip, quick picks, clearing, and validity reporting.
