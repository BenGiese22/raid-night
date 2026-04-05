'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { generateBoard } from '@/lib/board'
import { supabase } from '@/lib/supabase/client'
import { BingoBoard } from '@/components/board/BingoBoard'
import { useRealtimeSession } from '@/hooks/useRealtimeSession'
import { PhraseCallList } from './PhraseCallList'
import { CalledPhraseItem } from './CalledPhraseItem'

interface BoardViewProps {
  readonly sessionId: string
  readonly sessionCode: string
  readonly phrasePool: readonly string[]
  readonly playerId: string
}

/**
 * Main board view after session lock.
 * Renders the 5x5 board, phrase call list, called phrases with undo,
 * and handles real-time sync for phrase calls.
 */
export function BoardView({ sessionId, sessionCode, phrasePool, playerId }: BoardViewProps) {
  const [isCallingPhrase, setIsCallingPhrase] = useState(false)

  const { calledPhrases, allPlayerMarks, bingoEvents } = useRealtimeSession(sessionId)

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

  // Sync tile marks to DB — only upsert/remove the delta, not the full set
  const prevMarkedPhrasesRef = useRef(new Set<string>())
  useEffect(() => {
    const currentPhrases = new Set<string>(Array.from(calledPhrases.keys()))

    // Newly called phrases → upsert tile marks
    const added = Array.from(currentPhrases).filter((p) => !prevMarkedPhrasesRef.current.has(p))
    for (const phrase of added) {
      const index = phraseToIndex.get(phrase)
      if (index === undefined) continue
      void supabase
        .from('tile_marks')
        .upsert(
          {
            session_id: sessionId,
            player_id: playerId,
            tile_index: index,
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

    // Undone phrases → remove tile marks
    const removed = Array.from(prevMarkedPhrasesRef.current).filter((p) => !currentPhrases.has(p))
    for (const phrase of removed) {
      void supabase
        .from('tile_marks')
        .delete()
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .eq('phrase', phrase)
    }

    prevMarkedPhrasesRef.current = currentPhrases
  }, [calledPhrases, phraseToIndex, sessionId, playerId])

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

  // allPlayerMarks and bingoEvents will be wired in Tasks 4 and 9
  void allPlayerMarks
  void bingoEvents

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
