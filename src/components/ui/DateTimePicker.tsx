'use client'

import { useEffect, useState } from 'react'

interface DateTimePickerProps {
  /** ISO datetime-local string (YYYY-MM-DDTHH:MM) or empty string */
  readonly value: string
  /** Called with ISO datetime-local string or empty string on clear */
  readonly onChange: (value: string) => void
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayDateString(): string {
  const now = new Date()
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function tomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return `${String(tomorrow.getFullYear())}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
}

function parseDateTimeLocal(value: string): {
  date: string
  hour: number
  minute: number
  period: 'AM' | 'PM'
} | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  const [h, m] = timePart.split(':').map(Number)
  if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return null

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h

  return { date: datePart, hour: hour12, minute: m, period }
}

function toDateTimeLocal(date: string, hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour === 12 ? 0 : hour
  if (period === 'PM') h24 += 12
  return `${date}T${pad(h24)}:${pad(minute)}`
}

/**
 * Custom date and time picker with separate date input, hour/minute/AM-PM selectors,
 * and quick-select buttons for "Today" and "Tomorrow".
 */
export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const parsed = parseDateTimeLocal(value)

  const [date, setDate] = useState(parsed?.date ?? '')
  const [hour, setHour] = useState(parsed?.hour ?? 8)
  const [minute, setMinute] = useState(parsed?.minute ?? 0)
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed?.period ?? 'PM')

  // Sync outward when any field changes
  useEffect(() => {
    if (date) {
      onChange(toDateTimeLocal(date, hour, minute, period))
    }
  }, [date, hour, minute, period]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    setDate('')
    onChange('')
  }

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Auto-lock at</span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Date row: input + quick selects */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          min={todayDateString()}
          onChange={(e) => {
            setDate(e.target.value)
          }}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setDate(todayDateString())
          }}
          className={`rounded-lg border px-3 py-2 text-xs transition ${
            date === todayDateString()
              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            setDate(tomorrowDateString())
          }}
          className={`rounded-lg border px-3 py-2 text-xs transition ${
            date === tomorrowDateString()
              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
          }`}
        >
          Tomorrow
        </button>
      </div>

      {/* Time row: hour / minute / AM-PM */}
      <div className="flex items-center gap-2">
        <select
          value={hour}
          onChange={(e) => {
            setHour(Number(e.target.value))
          }}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
          aria-label="Hour"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {String(h)}
            </option>
          ))}
        </select>
        <span className="text-gray-500">:</span>
        <select
          value={minute}
          onChange={(e) => {
            setMinute(Number(e.target.value))
          }}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
          aria-label="Minute"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {pad(m)}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-gray-700">
          <button
            type="button"
            onClick={() => {
              setPeriod('AM')
            }}
            className={`px-3 py-2 text-xs font-medium transition ${
              period === 'AM'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriod('PM')
            }}
            className={`px-3 py-2 text-xs font-medium transition ${
              period === 'PM'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">Timezone: {userTimezone}</p>
    </div>
  )
}
