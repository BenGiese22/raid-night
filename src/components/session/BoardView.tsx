'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { generateBoard } from '@/lib/board'
import { supabase } from '@/lib/supabase/client'
import { BingoBoard } from '@/components/board/BingoBoard'
import { PhraseCallList } from './PhraseCallList'
import { CalledPhraseItem } from './CalledPhraseItem'

interface CalledPhraseRecord {
  readonly phrase: string
  readonly calledBy: string
  readonly calledAt: Date
}

/** Raw shape of a row returned from the called_phrases table. */
interface CalledPhraseRow {
  phrase: string
  called_by: string
  called_at: string
}

interface BoardViewProps {
  readonly sessionId: string
  readonly sessionCode: string
  readonly phrasePool: readonly string[]
  readonly playerId: string
}

/** Narrows an unknown realtime payload row to a CalledPhraseRow. */
function toCalledPhraseRow(row: Record<string, unknown>): CalledPhraseRow {
  return {
    phrase: row['phrase'] as string,
    called_by: row['called_by'] as string,
    called_at: row['called_at'] as string,
  }
}

/**
 * Main board view after session lock.
 * Renders the 5x5 board, phrase call list, called phrases with undo,
 * and handles real-time sync for phrase calls.
 */
export function BoardView({ sessionId, sessionCode, phrasePool, playerId }: BoardViewProps) {
  const [calledPhrases, setCalledPhrases] = useState(new Map<string, CalledPhraseRecord>())
  const [isCallingPhrase, setIsCallingPhrase] = useState(false)

  // Deterministic board — same every render for this player + session
  const board = useMemo(
    () => generateBoard(playerId, sessionCode, phrasePool),
    [playerId, sessionCode, phrasePool],
  )

  // Build a phrase→index lookup for this player's board
  const phraseToIndex = useMemo(() => {
    const map = new Map<string, number>()
    board.forEach((phrase, index) => {
      map.set(phrase, index)
    })
    return map
  }, [board])

  // Marked indices derived from called phrases that appear on this board
  const markedIndices = useMemo(() => {
    const indices = new Set<number>()
    for (const phrase of Array.from(calledPhrases.keys())) {
      const index = phraseToIndex.get(phrase)
      if (index !== undefined) {
        indices.add(index)
      }
    }
    return indices
  }, [calledPhrases, phraseToIndex])

  // Subscribe to called_phrases INSERT/DELETE + initial fetch
  useEffect(() => {
    const channel = supabase
      .channel(`called-phrases:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'called_phrases',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = toCalledPhraseRow(payload.new as Record<string, unknown>)
          const { phrase } = row
          const calledBy = row.called_by
          const calledAt = new Date(row.called_at)
          setCalledPhrases((prev) => {
            if (prev.has(phrase)) return prev
            const next = new Map(prev)
            next.set(phrase, { phrase, calledBy, calledAt })
            return next
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'called_phrases',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = toCalledPhraseRow(payload.old as Record<string, unknown>)
          const { phrase } = row
          setCalledPhrases((prev) => {
            if (!prev.has(phrase)) return prev
            const next = new Map(prev)
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            next.delete(phrase)
            return next
          })
        },
      )
      .subscribe((_status, err) => {
        if (err) {
          console.error('called_phrases subscription error:', err)
          return
        }
        // Fetch existing called phrases after subscription active
        void supabase
          .from('called_phrases')
          .select('phrase, called_by, called_at')
          .eq('session_id', sessionId)
          .order('called_at', { ascending: true })
          .then(({ data }) => {
            if (!data) return
            const map = new Map<string, CalledPhraseRecord>()
            for (const raw of data) {
              const row = raw as CalledPhraseRow
              map.set(row.phrase, {
                phrase: row.phrase,
                calledBy: row.called_by,
                calledAt: new Date(row.called_at),
              })
            }
            setCalledPhrases(map)
          })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Write tile marks to DB when called phrases change (for other players' real-time in Phase 6)
  useEffect(() => {
    const indicesToMark: { tileIndex: number; phrase: string }[] = []
    for (const [phrase] of Array.from(calledPhrases.entries())) {
      const index = phraseToIndex.get(phrase)
      if (index !== undefined) {
        indicesToMark.push({ tileIndex: index, phrase })
      }
    }

    if (indicesToMark.length === 0) return

    // Upsert tile marks — ignore conflicts (already marked)
    for (const { tileIndex, phrase } of indicesToMark) {
      void supabase
        .from('tile_marks')
        .upsert(
          {
            session_id: sessionId,
            player_id: playerId,
            tile_index: tileIndex,
            phrase,
          },
          { onConflict: 'session_id,player_id,tile_index' },
        )
        .then(({ error }) => {
          if (error) {
            console.error('tile_mark upsert error:', error)
          }
        })
    }
  }, [calledPhrases, phraseToIndex, sessionId, playerId])

  // Remove tile marks when phrases are undone
  const prevCalledRef = useRef(new Set<string>())
  useEffect(() => {
    const currentPhrases = new Set<string>(Array.from(calledPhrases.keys()))
    const removed = Array.from(prevCalledRef.current).filter((p) => !currentPhrases.has(p))
    prevCalledRef.current = currentPhrases

    for (const phrase of removed) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      void supabase
        .from('tile_marks')
        .delete()
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .eq('phrase', phrase)
    }
  }, [calledPhrases, sessionId, playerId])

  const handleCallPhrase = useCallback(
    async (phrase: string) => {
      setIsCallingPhrase(true)
      try {
        const { error } = await supabase.from('called_phrases').insert({
          session_id: sessionId,
          phrase,
          called_by: playerId,
        })
        // 23505 = unique violation — phrase already called by someone else
        if (error && error.code !== '23505') {
          console.error('phrase call failed:', error)
        }
      } finally {
        setIsCallingPhrase(false)
      }
    },
    [sessionId, playerId],
  )

  const handleUndo = useCallback(
    async (phrase: string) => {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { error } = await supabase
        .from('called_phrases')
        .delete()
        .eq('session_id', sessionId)
        .eq('phrase', phrase)
      if (error) {
        console.error('undo failed:', error)
      }
    },
    [sessionId],
  )

  const calledPhraseSet = useMemo(
    () => new Set<string>(Array.from(calledPhrases.keys())),
    [calledPhrases],
  )

  // Called phrases sorted newest first for display
  const calledPhraseList = useMemo(
    () =>
      Array.from(calledPhrases.values()).sort(
        (a, b) => b.calledAt.getTime() - a.calledAt.getTime(),
      ),
    [calledPhrases],
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-400">Session</p>
        <p className="text-lg font-bold tracking-wider text-indigo-300">{sessionCode}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Board */}
        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-400">Your Board</h2>
          <BingoBoard phrases={board} markedIndices={markedIndices} />
        </div>

        {/* Sidebar: phrase calling + called history */}
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-400">Call a Phrase</h2>
            <PhraseCallList
              phrasePool={[...phrasePool]}
              calledPhrases={calledPhraseSet}
              onCallPhrase={(phrase) => {
                void handleCallPhrase(phrase)
              }}
              disabled={isCallingPhrase}
            />
          </div>

          {calledPhraseList.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-400">
                Called ({String(calledPhraseList.length)})
              </h2>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {calledPhraseList.map((cp) => (
                  <CalledPhraseItem
                    key={cp.phrase}
                    phrase={cp.phrase}
                    calledAt={cp.calledAt}
                    canUndo={cp.calledBy === playerId}
                    onUndo={() => {
                      void handleUndo(cp.phrase)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
