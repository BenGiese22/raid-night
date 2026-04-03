'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { supabase } from '@/lib/supabase/client'
import { SubmissionVisibility } from '@/types/enums'
import { LockButton } from './LockButton'
import { LockCountdown } from './LockCountdown'

interface CollectionViewProps {
  readonly sessionId: string
  readonly sessionCode: string
  readonly visibility: SubmissionVisibility
  readonly playerId: string
  readonly scheduledLockAt: string | null
}

/**
 * Collection phase view — players submit phrases, see real-time updates,
 * and can lock the session to start the game.
 */
export function CollectionView({
  sessionId,
  sessionCode,
  visibility,
  playerId,
  scheduledLockAt,
}: CollectionViewProps) {
  const [phrases, setPhrases] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived count — single source of truth prevents drift
  const phraseCount = phrases.length

  useEffect(() => {
    // Subscribe first, then fetch — prevents missing inserts between fetch and subscription
    const channel = supabase
      .channel(`phrases:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'phrase_submissions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>
          const phrase = typeof newRecord.phrase === 'string' ? newRecord.phrase : ''
          if (phrase) {
            setPhrases((prev) => {
              if (prev.includes(phrase)) return prev
              return [...prev, phrase]
            })
          }
        },
      )
      .subscribe((_status, err) => {
        if (err) {
          console.error('phrase subscription error:', err)
          return
        }
        // Fetch after subscription is active — dedup in setPhrases handles overlap
        void supabase
          .from('phrase_submissions')
          .select('phrase')
          .eq('session_id', sessionId)
          .order('submitted_at', { ascending: true })
          .then(({ data }) => {
            if (data) {
              setPhrases(data.map((row) => (row as { phrase: string }).phrase))
            }
          })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalised = inputValue.trim().toLowerCase()
    if (!normalised) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('phrase_submissions').insert({
        session_id: sessionId,
        phrase: normalised,
        submitted_by: playerId,
      })
      // Silently ignore unique constraint violations (duplicate phrase)
      if (error && error.code !== '23505') {
        console.error('phrase submission failed:', error)
      }
      setInputValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Session code display */}
      <div className="text-center">
        <p className="text-sm text-gray-400">Session Code</p>
        <p className="text-2xl font-bold tracking-wider text-indigo-300">{sessionCode}</p>
      </div>

      {/* Phrase input */}
      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="flex gap-2"
      >
        <label htmlFor="phrase-input" className="sr-only">
          Enter a bingo phrase
        </label>
        <input
          id="phrase-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
          }}
          placeholder="Enter a phrase..."
          maxLength={200}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting || !inputValue.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Submit
        </button>
      </form>

      {/* Phrase display: open vs blind */}
      {visibility === SubmissionVisibility.Open ? (
        <div>
          <p className="mb-2 text-sm text-gray-400">{String(phraseCount)} phrases submitted</p>
          {phrases.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-3">
              {phrases.map((phrase) => (
                <li key={phrase} className="text-sm text-gray-300">
                  {phrase}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center">
          <p className="text-lg font-medium text-gray-300">
            {String(phraseCount)} phrases submitted
          </p>
          <p className="text-xs text-gray-500">Phrases will be revealed when the session locks</p>
        </div>
      )}

      {/* Lock controls */}
      {scheduledLockAt && (
        <LockCountdown scheduledLockAt={scheduledLockAt} sessionCode={sessionCode} />
      )}
      <LockButton sessionCode={sessionCode} phraseCount={phraseCount} />
    </div>
  )
}
