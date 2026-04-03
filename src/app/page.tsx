'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

interface SessionResult {
  readonly code: string
  readonly url: string
}

/**
 * Home page — session creation form.
 * Allows a host to configure visibility and optional auto-lock time,
 * then creates a session and displays the shareable URL.
 */
export default function HomePage() {
  const [visibility, setVisibility] = useState<'open' | 'blind'>('open')
  const [scheduledLockAt, setScheduledLockAt] = useState('')
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
      const body: Record<string, unknown> = { visibility }

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
    void navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    })
  }

  // Minimum datetime for the scheduled lock input (now, in local format)
  const now = new Date()
  const minDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-md px-4 pt-20">
        <h1 className="mb-8 text-center text-3xl font-bold">Raid Night Bingo</h1>

        {!result ? (
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="space-y-6"
          >
            {/* Visibility toggle */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-400">
                Submission Visibility
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisibility('open')
                  }}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    visibility === 'open'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <span className="block font-medium">Open</span>
                  <span className="block text-xs text-gray-400">Phrases visible as submitted</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibility('blind')
                  }}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    visibility === 'blind'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <span className="block font-medium">Blind</span>
                  <span className="block text-xs text-gray-400">Hidden until session locks</span>
                </button>
              </div>
            </fieldset>

            {/* Scheduled lock datetime */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="scheduledLockAt" className="text-sm font-medium text-gray-400">
                  Auto-lock at
                </label>
                {scheduledLockAt && (
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledLockAt('')
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                id="scheduledLockAt"
                type="datetime-local"
                value={scheduledLockAt}
                min={minDatetime}
                onChange={(e) => {
                  setScheduledLockAt(e.target.value)
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-400">Session created!</p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3">
              <code className="flex-1 truncate text-indigo-300">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}${result.url}`
                  : result.url}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={result.url}
              className="block w-full rounded-lg border border-indigo-500 px-4 py-3 text-center font-medium text-indigo-300 transition hover:bg-indigo-500/10"
            >
              Go to Session
            </a>
            <button
              type="button"
              onClick={() => {
                setResult(null)
              }}
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-300"
            >
              Create another session
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
