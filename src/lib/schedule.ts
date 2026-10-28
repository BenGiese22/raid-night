import { Period } from '@/types/enums'

/** How many calendar days ahead (today included) the picker offers. */
export const LOCK_WINDOW_DAYS = 7

/** Earliest allowed auto-lock, measured from now. */
export const MIN_LOCK_DELAY_MS = 5 * 60 * 1000
/** Latest allowed auto-lock, measured from now. */
export const MAX_LOCK_DELAY_MS = LOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000

/** The time picker offers minutes in steps of this size. */
const SLOT_MS = 5 * 60 * 1000

/** A schedulable moment broken into the pieces the picker edits. */
export interface LockTimeParts {
  /** Local calendar date, YYYY-MM-DD */
  readonly date: string
  /** 12-hour clock hour, 1-12 */
  readonly hour: number
  /** Minute, 0-59 */
  readonly minute: number
  readonly period: Period
}

/** Clock-time pieces without a date. */
export type ClockParts = Pick<LockTimeParts, 'hour' | 'minute' | 'period'>

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function ceilToSlot(ms: number): number {
  return Math.ceil(ms / SLOT_MS) * SLOT_MS
}

function floorToSlot(ms: number): number {
  return Math.floor(ms / SLOT_MS) * SLOT_MS
}

/**
 * Formats a Date as a local calendar date string.
 *
 * @param date - Moment to format
 * @returns Local date as YYYY-MM-DD
 */
export function toLocalDateString(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Returns the local date `offset` calendar days after today.
 *
 * @param offset - 0 for today, 1 for tomorrow, and so on
 * @param now - Reference clock
 * @returns The day at local midnight
 */
export function dayStart(offset: number, now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
}

/**
 * Returns the local date string `offset` calendar days after today.
 *
 * @param offset - 0 for today, 1 for tomorrow, and so on
 * @param now - Reference clock
 * @returns Local date as YYYY-MM-DD
 */
export function dateStringForOffset(offset: number, now: Date): string {
  return toLocalDateString(dayStart(offset, now))
}

/**
 * Earliest valid auto-lock time: at least 5 minutes out, on a 5-minute slot.
 *
 * @param now - Reference clock
 * @returns The first selectable moment
 */
export function earliestLockTime(now: Date): Date {
  return new Date(ceilToSlot(now.getTime() + MIN_LOCK_DELAY_MS))
}

/**
 * Latest valid auto-lock time: at most 7 days out, on a 5-minute slot.
 *
 * @param now - Reference clock
 * @returns The last selectable moment
 */
export function latestLockTime(now: Date): Date {
  return new Date(floorToSlot(now.getTime() + MAX_LOCK_DELAY_MS))
}

/**
 * Splits a Date into the date and 12-hour clock pieces the picker edits.
 *
 * @param date - Moment to split (local time)
 * @returns Date string, hour (1-12), minute, and AM/PM
 */
export function partsFromDate(date: Date): LockTimeParts {
  const h24 = date.getHours()
  return {
    date: toLocalDateString(date),
    hour: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: date.getMinutes(),
    period: h24 >= 12 ? Period.PM : Period.AM,
  }
}

/**
 * Formats picker pieces as a datetime-local string (YYYY-MM-DDTHH:MM).
 *
 * @param parts - Date string and 12-hour clock pieces
 * @returns datetime-local string in local time
 */
export function toDateTimeLocal(parts: LockTimeParts): string {
  const base = parts.hour % 12
  const h24 = parts.period === Period.PM ? base + 12 : base
  return `${parts.date}T${pad(h24)}:${pad(parts.minute)}`
}

/**
 * Builds a Date (local time) from picker pieces.
 *
 * @param parts - Date string and 12-hour clock pieces
 * @returns The corresponding moment
 */
export function dateFromParts(parts: LockTimeParts): Date {
  return new Date(toDateTimeLocal(parts))
}

/**
 * Validates an auto-lock time against the 5-minute minimum and 7-day maximum.
 *
 * @param value - datetime-local string, or empty for "no schedule"
 * @param now - Reference clock
 * @returns A user-facing message if invalid, otherwise null
 */
export function validateLockTime(value: string, now: Date = new Date()): string | null {
  if (!value) return null
  const selected = new Date(value)
  if (isNaN(selected.getTime())) return null

  const delayMs = selected.getTime() - now.getTime()
  if (delayMs < MIN_LOCK_DELAY_MS) {
    return delayMs < 0
      ? 'That time has already passed. Pick a later time.'
      : 'Pick a time at least 5 minutes from now.'
  }
  if (delayMs > MAX_LOCK_DELAY_MS) {
    return `Pick a time within the next ${String(LOCK_WINDOW_DAYS)} days.`
  }
  return null
}

/**
 * Pulls a moment into the valid window [earliest, latest].
 *
 * @param date - Candidate moment
 * @param now - Reference clock
 * @returns The candidate, or the nearest valid moment
 */
export function snapToWindow(date: Date, now: Date): Date {
  const earliest = earliestLockTime(now)
  const latest = latestLockTime(now)
  if (date < earliest) return earliest
  if (date > latest) return latest
  return date
}

/**
 * Picks a valid time when the user chooses a day.
 * Keeps the chosen clock time when it fits; otherwise moves it to the nearest valid slot.
 *
 * @param offset - Days after today (0 = today)
 * @param clock - The clock time currently selected
 * @param now - Reference clock
 * @returns New picker pieces, or null when that day has no valid slot
 */
export function partsForDay(offset: number, clock: ClockParts, now: Date): LockTimeParts | null {
  const date = dateStringForOffset(offset, now)
  const candidate = dateFromParts({ date, ...clock })
  const snapped = partsFromDate(snapToWindow(candidate, now))
  return snapped.date === date ? snapped : null
}

/**
 * Picks the time for an "In N hours" quick pick.
 *
 * @param hours - Hours from now
 * @param now - Reference clock
 * @returns Picker pieces rounded up to the next 5-minute slot, capped at the window
 */
export function partsFromNowPlus(hours: number, now: Date): LockTimeParts {
  const target = new Date(ceilToSlot(now.getTime() + hours * 60 * 60 * 1000))
  return partsFromDate(snapToWindow(target, now))
}

/**
 * Resolves which day a newly chosen clock time belongs to.
 * Tries the preferred day first, then the nearest upcoming days in order (so "7:00 AM"
 * picked at 9 PM means tomorrow morning). If no day fits, returns the preferred day so
 * validation can explain the problem.
 *
 * @param clock - The clock time the user chose
 * @param now - Reference clock
 * @param preferred - Day offset to try first
 * @returns Picker pieces, possibly invalid when no day fits
 */
export function partsForClock(clock: ClockParts, now: Date, preferred = 0): LockTimeParts {
  const earliest = earliestLockTime(now)
  const latest = latestLockTime(now)
  const offsets = [preferred]
  for (let offset = 0; offset < LOCK_WINDOW_DAYS; offset++) {
    if (offset !== preferred) offsets.push(offset)
  }

  for (const offset of offsets) {
    const parts: LockTimeParts = { date: dateStringForOffset(offset, now), ...clock }
    const moment = dateFromParts(parts)
    if (moment >= earliest && moment <= latest) return parts
  }
  return { date: dateStringForOffset(preferred, now), ...clock }
}

/**
 * Labels a day offset for the day chips: "Today", "Tomorrow", then e.g. "Fri 30".
 *
 * @param offset - Days after today
 * @param now - Reference clock
 * @returns Short label
 */
export function dayLabel(offset: number, now: Date): string {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  const day = dayStart(offset, now)
  const weekday = day.toLocaleDateString([], { weekday: 'short' })
  return `${weekday} ${String(day.getDate())}`
}

function formatRelative(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${String(days)} d`)
  if (hours > 0) parts.push(`${String(hours)} h`)
  // Minutes only matter when the event is under a day away
  if (days === 0 && (minutes > 0 || parts.length === 0)) parts.push(`${String(minutes)} min`)
  return parts.join(' ')
}

/**
 * Describes a scheduled lock in plain language, e.g. "today at 8:00 PM, in 2 h 15 min".
 *
 * @param date - The scheduled moment
 * @param now - Reference clock
 * @returns A sentence fragment for the summary line
 */
export function describeLockTime(date: Date, now: Date): string {
  const dateString = toLocalDateString(date)
  const label =
    dateString === dateStringForOffset(0, now)
      ? 'today'
      : dateString === dateStringForOffset(1, now)
        ? 'tomorrow'
        : date.toLocaleDateString([], { weekday: 'long' })
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${label} at ${time}, in ${formatRelative(date.getTime() - now.getTime())}`
}

/**
 * Where a moment falls in the scheduling window.
 *
 * @param date - The scheduled moment
 * @param now - Reference clock
 * @returns A fraction from 0 (now) to 1 (end of window), clamped
 */
export function windowPosition(date: Date, now: Date): number {
  const fraction = (date.getTime() - now.getTime()) / MAX_LOCK_DELAY_MS
  return Math.min(1, Math.max(0, fraction))
}

/**
 * Positions of each upcoming midnight within the scheduling window, for timeline ticks.
 *
 * @param now - Reference clock
 * @returns Fractions from 0 to 1, ascending
 */
export function midnightPositions(now: Date): number[] {
  const positions: number[] = []
  for (let offset = 1; offset <= LOCK_WINDOW_DAYS; offset++) {
    const position = windowPosition(dayStart(offset, now), now)
    if (position > 0 && position < 1) positions.push(position)
  }
  return positions
}
