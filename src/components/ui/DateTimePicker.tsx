'use client'

import { useEffect, useState } from 'react'

import {
  LOCK_WINDOW_DAYS,
  dateFromParts,
  dateStringForOffset,
  dayLabel,
  describeLockTime,
  midnightPositions,
  partsForClock,
  partsForDay,
  partsFromDate,
  partsFromNowPlus,
  toDateTimeLocal,
  validateLockTime,
  windowPosition,
} from '@/lib/schedule'
import type { ClockParts, LockTimeParts } from '@/lib/schedule'
import { Period } from '@/types/enums'

interface DateTimePickerProps {
  /** Initial datetime-local string (YYYY-MM-DDTHH:MM), or empty string for no schedule */
  readonly value: string
  /** Called with a valid datetime-local string, or empty string when unset or invalid */
  readonly onChange: (value: string) => void
  /** Called with true while the chosen time is invalid, so the form can block submit */
  readonly onValidityChange?: (hasError: boolean) => void
}

interface QuickPick {
  readonly hours: number
  readonly label: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const DAY_OFFSETS = Array.from({ length: LOCK_WINDOW_DAYS }, (_, i) => i)
const QUICK_PICKS: readonly QuickPick[] = [
  { hours: 1, label: 'In 1 hour' },
  { hours: 2, label: 'In 2 hours' },
  { hours: 4, label: 'In 4 hours' },
  { hours: 24, label: 'In 1 day' },
]
const TICK_MS = 30_000
const DEFAULT_CLOCK: ClockParts = { hour: 8, minute: 0, period: Period.PM }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function initialParts(value: string): LockTimeParts | null {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : partsFromDate(date)
}

/**
 * Schedule picker for the session's auto-lock time, up to 7 days ahead.
 * Day chips snap the time into the valid window (5 minutes to 7 days from now),
 * quick picks cover "in an hour or a day", and a summary plus a 7-day timeline show
 * when boards will deal. Invalid times are explained inline and block submission.
 */
export function DateTimePicker({ value, onChange, onValidityChange }: DateTimePickerProps) {
  const [now, setNow] = useState(() => new Date())
  const [timeZone, setTimeZone] = useState('')

  const initial = initialParts(value)
  const [date, setDate] = useState(initial?.date ?? '')
  const [clock, setClock] = useState(
    initial
      ? { hour: initial.hour, minute: initial.minute, period: initial.period }
      : DEFAULT_CLOCK,
  )

  // Re-evaluate every 30 seconds so a time that was fine a moment ago can't go stale unnoticed
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    const interval = setInterval(() => {
      setNow(new Date())
    }, TICK_MS)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const parts: LockTimeParts | null = date ? { date, ...clock } : null
  const dateTimeLocal = parts ? toDateTimeLocal(parts) : ''
  const error = validateLockTime(dateTimeLocal, now)
  const selected = parts ? dateFromParts(parts) : null

  useEffect(() => {
    onChange(error ? '' : dateTimeLocal)
    onValidityChange?.(error !== null)
  }, [dateTimeLocal, error]) // eslint-disable-line react-hooks/exhaustive-deps

  function apply(next: LockTimeParts, at: Date) {
    setNow(at)
    setDate(next.date)
    setClock({ hour: next.hour, minute: next.minute, period: next.period })
  }

  function chooseDay(offset: number) {
    const at = new Date()
    const next = partsForDay(offset, clock, at)
    if (next) apply(next, at)
  }

  function chooseQuickPick(hours: number) {
    const at = new Date()
    apply(partsFromNowPlus(hours, at), at)
  }

  function changeClock(patch: Partial<ClockParts>) {
    const at = new Date()
    const current = DAY_OFFSETS.find((offset) => dateStringForOffset(offset, at) === date)
    apply(partsForClock({ ...clock, ...patch }, at, current ?? 0), at)
  }

  const position = selected ? windowPosition(selected, now) : 0
  const ticks = midnightPositions(now)
  const chip =
    'rounded-md border border-rule bg-night px-3 py-1.5 text-sm text-bone transition hover:border-mist'
  const select = 'rounded-md border border-rule bg-night px-3 py-2 text-sm text-bone'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">When is your raid?</span>
        {date && (
          <button
            type="button"
            onClick={() => {
              setDate('')
            }}
            className="text-xs text-mist underline underline-offset-4 hover:text-bone"
          >
            Don&apos;t auto-deal
          </button>
        )}
      </div>

      <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-2">
        {QUICK_PICKS.map(({ hours, label }) => (
          <button
            key={hours}
            type="button"
            onClick={() => {
              chooseQuickPick(hours)
            }}
            className={chip}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Day" className="grid grid-cols-4 gap-2">
        {DAY_OFFSETS.map((offset) => {
          const dayDate = dateStringForOffset(offset, now)
          const available = partsForDay(offset, clock, now) !== null
          return (
            <button
              key={offset}
              type="button"
              disabled={!available}
              aria-pressed={date === dayDate}
              title={available ? undefined : 'No times left today. Pick another day.'}
              onClick={() => {
                chooseDay(offset)
              }}
              className={`rounded-md border px-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                date === dayDate
                  ? 'border-hl bg-hl text-hl-ink'
                  : 'border-rule bg-night hover:border-mist'
              }`}
            >
              {dayLabel(offset, now)}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={clock.hour}
          onChange={(e) => {
            changeClock({ hour: Number(e.target.value) })
          }}
          className={select}
          aria-label="Hour"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {String(h)}
            </option>
          ))}
        </select>
        <span className="text-mist">:</span>
        <select
          value={clock.minute}
          onChange={(e) => {
            changeClock({ minute: Number(e.target.value) })
          }}
          className={select}
          aria-label="Minute"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {pad(m)}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-md border border-rule">
          {[Period.AM, Period.PM].map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={clock.period === period}
              onClick={() => {
                changeClock({ period })
              }}
              className={`px-3 py-2 text-sm font-semibold transition ${
                clock.period === period ? 'bg-hl text-hl-ink' : 'bg-night text-mist hover:text-bone'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Summary and timeline: shows where the raid falls in the schedulable week */}
      <div
        className={`rounded-md border-l-4 bg-panel px-3 py-3 ${
          error ? 'border-flare' : selected ? 'border-hl' : 'border-rule'
        }`}
      >
        {error ? (
          <p role="alert" className="text-sm font-semibold text-flare">
            {error}
          </p>
        ) : selected ? (
          <p className="text-sm">
            Boards deal <span className="font-semibold">{describeLockTime(selected, now)}</span>
          </p>
        ) : (
          <p className="text-sm text-mist">
            No auto-deal. Lock and deal boards yourself once everyone has added phrases.
          </p>
        )}

        {selected && (
          <div aria-hidden="true" className="mt-3">
            <div className="relative h-1.5 rounded-full bg-rule/60">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${error ? 'bg-flare' : 'bg-hl'}`}
                style={{ width: `${String(position * 100)}%` }}
              />
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute -top-0.5 h-2.5 w-px bg-night"
                  style={{ left: `${String(tick * 100)}%` }}
                />
              ))}
              <div
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel ${
                  error ? 'bg-flare' : 'bg-hl'
                }`}
                style={{ left: `${String(position * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-mist">
              <span>now</span>
              <span>in {String(LOCK_WINDOW_DAYS)} days</span>
            </div>
          </div>
        )}

        {timeZone && <p className="mt-2 text-xs text-mist">Times are in {timeZone}.</p>}
      </div>
    </div>
  )
}
