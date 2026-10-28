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
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('phrase_submissions').insert({
        session_id: sessionId,
        phrase: trimmed,
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
    <div className="space-y-8">
      <div>
        <p className="text-sm text-mist">Share this code or the page link</p>
        <p className="display mt-1 break-all text-5xl text-hl sm:text-6xl">{sessionCode}</p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="space-y-2"
      >
        <label htmlFor="phrase-input" className="block font-semibold">
          Add something that will happen tonight
        </label>
        <div className="flex gap-2">
          <input
            id="phrase-input"
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
            }}
            placeholder="Tank pulls before the buffs"
            maxLength={200}
            autoComplete="off"
            className="field flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting || !inputValue.trim()}
            className="btn-primary"
          >
            Add phrase
          </button>
        </div>
      </form>

      {visibility === SubmissionVisibility.Open ? (
        <div>
          <h2 className="mb-2 font-semibold">
            Phrases so far <span className="font-normal text-mist">({String(phraseCount)})</span>
          </h2>
          {phrases.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto rounded-md border border-rule bg-panel">
              {phrases.map((phrase) => (
                <li
                  key={phrase}
                  className="border-b border-rule/50 px-3 py-2 text-sm last:border-b-0"
                >
                  {phrase}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mist">Nothing yet. Add the first phrase above.</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-rule bg-panel p-4">
          <p className="display text-4xl">{String(phraseCount)}</p>
          <p className="mt-1 text-sm text-mist">
            phrases added. They stay hidden until the session locks.
          </p>
        </div>
      )}

      <div className="space-y-3 border-t border-rule pt-6">
        {scheduledLockAt && (
          <LockCountdown scheduledLockAt={scheduledLockAt} sessionCode={sessionCode} />
        )}
        <LockButton sessionCode={sessionCode} phraseCount={phraseCount} />
      </div>
    </div>
  )
}
