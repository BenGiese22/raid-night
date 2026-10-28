import { describe, expect, it } from 'vitest'

import {
  MAX_LOCK_DELAY_MS,
  dateFromParts,
  describeLockTime,
  dayLabel,
  earliestLockTime,
  latestLockTime,
  midnightPositions,
  partsForClock,
  partsForDay,
  partsFromDate,
  partsFromNowPlus,
  toDateTimeLocal,
  validateLockTime,
  windowPosition,
} from '@/lib/schedule'
import { Period } from '@/types/enums'

/** Local-time clock helper: months are 1-based here for readability. */
function at(month: number, day: number, hour: number, minute = 0, second = 0): Date {
  return new Date(2026, month - 1, day, hour, minute, second)
}

const EIGHT_PM = { hour: 8, minute: 0, period: Period.PM } as const

describe('toDateTimeLocal / partsFromDate', () => {
  it('round-trips every 5-minute slot of a day', () => {
    for (let h24 = 0; h24 < 24; h24++) {
      for (let m = 0; m < 60; m += 5) {
        const original = at(10, 28, h24, m)
        expect(dateFromParts(partsFromDate(original)).getTime()).toBe(original.getTime())
      }
    }
  })

  it('maps 12 AM to hour 12 AM and 12 PM to hour 12 PM', () => {
    expect(partsFromDate(at(10, 28, 0, 0))).toMatchObject({ hour: 12, period: Period.AM })
    expect(partsFromDate(at(10, 28, 12, 0))).toMatchObject({ hour: 12, period: Period.PM })
    expect(toDateTimeLocal({ date: '2026-10-28', hour: 12, minute: 0, period: Period.AM })).toBe(
      '2026-10-28T00:00',
    )
  })
})

describe('validateLockTime', () => {
  const now = at(10, 28, 15, 0)

  it('accepts exactly 5 minutes out', () => {
    expect(validateLockTime('2026-10-28T15:05', now)).toBeNull()
  })

  it('rejects 4 minutes out', () => {
    expect(validateLockTime('2026-10-28T15:04', now)).toMatch(/at least 5 minutes/)
  })

  it('says a past time has passed', () => {
    expect(validateLockTime('2026-10-28T14:00', now)).toMatch(/already passed/)
  })

  it('accepts exactly 7 days of elapsed time and rejects one minute later', () => {
    // Elapsed time, not wall-clock days: a DST change inside the week shifts the clock reading
    const limit = new Date(now.getTime() + MAX_LOCK_DELAY_MS)
    const local = (d: Date) => toDateTimeLocal(partsFromDate(d))
    expect(validateLockTime(local(limit), now)).toBeNull()
    expect(validateLockTime(local(new Date(limit.getTime() + 60_000)), now)).toMatch(
      /within the next 7 days/,
    )
  })

  it('accepts a time later this week that was previously out of range', () => {
    expect(validateLockTime('2026-10-31T20:00', now)).toBeNull()
  })

  it('treats an empty value as no schedule', () => {
    expect(validateLockTime('', now)).toBeNull()
  })
})

describe('earliest and latest lock time', () => {
  it('rounds the earliest time up to the next 5-minute slot', () => {
    expect(earliestLockTime(at(10, 28, 19, 56, 30))).toEqual(at(10, 28, 20, 5))
    expect(earliestLockTime(at(10, 28, 15, 0))).toEqual(at(10, 28, 15, 5))
    expect(earliestLockTime(at(10, 28, 15, 1))).toEqual(at(10, 28, 15, 10))
  })

  it('rounds the latest time down to a 5-minute slot', () => {
    const now = at(10, 28, 15, 3)
    expect(latestLockTime(now).getTime()).toBe(
      Math.floor((now.getTime() + MAX_LOCK_DELAY_MS) / 300_000) * 300_000,
    )
  })
})

describe('partsForDay', () => {
  it('keeps the chosen time for Today when it is still ahead', () => {
    const parts = partsForDay(0, EIGHT_PM, at(10, 28, 15, 0))
    expect(parts).toMatchObject({ date: '2026-10-28', hour: 8, minute: 0, period: Period.PM })
  })

  it('bumps Today to the next valid slot when the chosen time has passed', () => {
    // The reported bug: clicking Today at 9:32 PM with the default 8:00 PM
    const parts = partsForDay(0, EIGHT_PM, at(10, 28, 21, 32))
    expect(parts).toMatchObject({ date: '2026-10-28', hour: 9, minute: 40, period: Period.PM })
    if (!parts) throw new Error('expected a valid slot for Today')
    expect(validateLockTime(toDateTimeLocal(parts), at(10, 28, 21, 32))).toBeNull()
  })

  it('returns null for Today when no slot is left before midnight', () => {
    expect(partsForDay(0, EIGHT_PM, at(10, 28, 23, 58))).toBeNull()
  })

  it('keeps 8 PM for Tomorrow even when it is more than 24 hours away', () => {
    const parts = partsForDay(1, EIGHT_PM, at(10, 28, 15, 0))
    expect(parts).toMatchObject({ date: '2026-10-29', hour: 8, minute: 0, period: Period.PM })
  })

  it('keeps the chosen time on a day later in the week', () => {
    const parts = partsForDay(3, EIGHT_PM, at(10, 28, 15, 0))
    expect(parts).toMatchObject({ date: '2026-10-31', hour: 8, period: Period.PM })
  })

  it('clamps the last day of the window to the 7-day limit', () => {
    // 8 PM on day 6 is 6 d 5 h away from 3 PM: inside the window. Day 7 would not be offered.
    const parts = partsForDay(6, EIGHT_PM, at(10, 28, 15, 0))
    expect(parts).toMatchObject({ date: '2026-11-03', hour: 8, period: Period.PM })
  })

  it('keeps the chosen time for Tomorrow when it fits the window', () => {
    const parts = partsForDay(1, EIGHT_PM, at(10, 28, 21, 0))
    expect(parts).toMatchObject({ date: '2026-10-29', hour: 8, period: Period.PM })
  })
})

describe('partsFromNowPlus', () => {
  it('rounds up to the next 5-minute slot', () => {
    const parts = partsFromNowPlus(2, at(10, 28, 15, 2))
    expect(dateFromParts(parts)).toEqual(at(10, 28, 17, 5))
  })

  it('crosses midnight onto tomorrow', () => {
    const parts = partsFromNowPlus(4, at(10, 28, 22, 0))
    expect(parts).toMatchObject({ date: '2026-10-29', hour: 2, minute: 0, period: Period.AM })
  })

  it('supports a one-day quick pick', () => {
    const parts = partsFromNowPlus(24, at(10, 28, 15, 2))
    expect(dateFromParts(parts)).toEqual(at(10, 29, 15, 5))
  })

  it('never exceeds the 7-day limit', () => {
    const now = at(10, 28, 15, 0)
    expect(validateLockTime(toDateTimeLocal(partsFromNowPlus(400, now)), now)).toBeNull()
  })
})

describe('partsForClock', () => {
  it('moves a morning time to tomorrow when it has already passed today', () => {
    const parts = partsForClock({ hour: 7, minute: 0, period: Period.AM }, at(10, 28, 21, 0))
    expect(parts.date).toBe('2026-10-29')
  })

  it('stays on today when the time is still ahead', () => {
    const parts = partsForClock(EIGHT_PM, at(10, 28, 15, 0))
    expect(parts.date).toBe('2026-10-28')
  })

  it('prefers the chosen day when the time fits there', () => {
    const parts = partsForClock(EIGHT_PM, at(10, 28, 15, 0), 3)
    expect(parts.date).toBe('2026-10-31')
  })

  it('returns an invalid result when no day fits so validation can explain', () => {
    // 3:02 PM has passed today and the week ends at 3:00 PM on day 7, which is not offered
    const now = at(10, 28, 15, 0)
    const parts = partsForClock({ hour: 3, minute: 2, period: Period.PM }, now, 6)
    expect(validateLockTime(toDateTimeLocal(parts), now)).toBeNull()
  })
})

describe('describeLockTime and windowPosition', () => {
  it('describes a time later today with a relative hint', () => {
    expect(describeLockTime(at(10, 28, 17, 15), at(10, 28, 15, 0))).toMatch(
      /^today at .*, in 2 h 15 min$/,
    )
  })

  it('describes a time tomorrow', () => {
    expect(describeLockTime(at(10, 29, 9, 0), at(10, 28, 21, 0))).toMatch(
      /^tomorrow at .*, in 12 h$/,
    )
  })

  it('describes a time later in the week by weekday with days and hours', () => {
    // Oct 28, 2026 is a Wednesday; Oct 31 is a Saturday
    expect(describeLockTime(at(10, 31, 20, 0), at(10, 28, 15, 0))).toMatch(
      /^Saturday at .*, in 3 d 5 h$/,
    )
  })

  it('places the marker proportionally in the 7-day window', () => {
    const now = at(10, 28, 15, 0)
    expect(windowPosition(at(10, 31, 15, 0), now)).toBeCloseTo(3 / 7)
    expect(windowPosition(at(10, 28, 14, 0), now)).toBe(0)
    expect(windowPosition(at(11, 20, 15, 0), now)).toBe(1)
  })

  it('places a tick at each upcoming midnight', () => {
    const ticks = midnightPositions(at(10, 28, 12, 0))
    expect(ticks).toHaveLength(7)
    expect(ticks[0]).toBeCloseTo(0.5 / 7)
  })

  it('labels day chips', () => {
    const now = at(10, 28, 15, 0)
    expect(dayLabel(0, now)).toBe('Today')
    expect(dayLabel(1, now)).toBe('Tomorrow')
    expect(dayLabel(3, now)).toMatch(/Sat.*31/)
  })
})
