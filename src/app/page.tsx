'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { BingoBoard } from '@/components/board/BingoBoard'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { SubmissionVisibility } from '@/types/enums'

interface SessionResult {
  readonly code: string
  readonly url: string
}

/** A mid-game board shown as a preview. Marked tiles form the middle row, with a free center. */
const SAMPLE_PHRASES: readonly string[] = [
  'tank pulls early',
  'healer out of mana',
  'someone is afk',
  'wrong boss strat',
  'wipe on trash',
  'mic is open',
  'loot argument',
  'dps on the wrong target',
  'standing in fire',
  'we need a bio break',
  'ready check fails',
  'late again',
  'free',
  'cat on the keyboard',
  'discord crashes',
  'one more pull',
  'who has the buff food',
  'repair bill',
  'summon stone',
  'raid leader sighs',
  'new strat doc',
  'flask expired',
  'disconnect mid-fight',
  'a brave pug',
  'it was lag',
]
const SAMPLE_MARKED: ReadonlySet<number> = new Set([2, 6, 10, 11, 12, 13, 14, 20])

/**
 * Home page — session creation form.
 * Allows a host to configure visibility and optional auto-lock time,
 * then creates a session and displays the shareable URL.
 */
export default function HomePage() {
  const [visibility, setVisibility] = useState(SubmissionVisibility.Open)
  const [scheduledLockAt, setScheduledLockAt] = useState('')
  const [freeSpace, setFreeSpace] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const body: Record<string, unknown> = { visibility, freeSpace }

      if (scheduledLockAt) {
        const date = new Date(scheduledLockAt)
        if (!isNaN(date.getTime())) {
          body.scheduledLockAt = date.toISOString()
        }
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data: unknown = await response.json()

      if (!response.ok) {
        const msg =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: unknown }).error)
            : 'Failed to create session'
        setError(msg)
        return
      }

      if (typeof data === 'object' && data !== null && 'code' in data && 'url' in data) {
        setResult(data as SessionResult)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCopy() {
    if (!result) return
    const fullUrl = `${window.location.origin}${result.url}`
    void navigator.clipboard.writeText(fullUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      },
      () => {
        setError('Failed to copy to clipboard')
      },
    )
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-4 py-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
      <div>
        <h1 className="display text-6xl sm:text-7xl">
          Raid night
          <br />
          bingo
        </h1>
        <p className="mt-4 max-w-sm text-mist">
          Your group adds the phrases. Everyone gets a different board. Call a phrase and it marks
          for the whole raid.
        </p>

        {!result ? (
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="mt-8 space-y-6"
          >
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">While the group adds phrases</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    [
                      SubmissionVisibility.Open,
                      'Show them',
                      'Everyone sees each phrase as it lands',
                    ],
                    [
                      SubmissionVisibility.Blind,
                      'Keep them hidden',
                      'Only a count, until boards are dealt',
                    ],
                  ] as const
                ).map(([value, title, hint]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={visibility === value}
                    onClick={() => {
                      setVisibility(value)
                    }}
                    className={`rounded-md border px-3 py-3 text-left transition ${
                      visibility === value
                        ? 'border-hl bg-hl text-hl-ink'
                        : 'border-rule bg-panel hover:border-mist'
                    }`}
                  >
                    <span className="block font-semibold">{title}</span>
                    <span
                      className={`block text-xs ${visibility === value ? 'text-hl-ink/80' : 'text-mist'}`}
                    >
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <DateTimePicker value={scheduledLockAt} onChange={setScheduledLockAt} />

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={freeSpace}
                onChange={(e) => {
                  setFreeSpace(e.target.checked)
                }}
                className="h-4 w-4 accent-hl"
              />
              Make the center tile a free space
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-flare/60 px-3 py-2 text-sm text-flare"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? 'Creating…' : 'Create session'}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="font-semibold text-ready">
              Session created. Send this link to your raid.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-rule bg-panel px-3 py-3">
              <code className="flex-1 truncate">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}${result.url}`
                  : result.url}
              </code>
              <button type="button" onClick={handleCopy} className="btn-quiet shrink-0 py-1.5">
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <a href={result.url} className="btn-primary block w-full py-3 text-center">
              Open session
            </a>
            <button
              type="button"
              onClick={() => {
                setResult(null)
              }}
              className="block text-sm text-mist underline underline-offset-4 hover:text-bone"
            >
              Create another session
            </button>
          </div>
        )}
      </div>

      <div aria-hidden="true">
        <BingoBoard phrases={SAMPLE_PHRASES} markedIndices={SAMPLE_MARKED} freeSpace />
      </div>
    </main>
  )
}
