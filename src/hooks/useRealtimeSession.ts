'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase/client'

/** A phrase that has been called during the game phase. */
export interface CalledPhraseRecord {
  readonly phrase: string
  readonly calledBy: string
  readonly calledAt: Date
}

/** A BINGO event fired by a player. */
export interface BingoEventRecord {
  readonly id: string
  readonly playerId: string
  readonly pattern: string
  readonly firedAt: Date
}

/** Return type of useRealtimeSession. */
export interface UseRealtimeSessionResult {
  readonly calledPhrases: ReadonlyMap<string, CalledPhraseRecord>
  readonly allPlayerMarks: ReadonlyMap<string, readonly number[]>
  readonly bingoEvents: readonly BingoEventRecord[]
}

/** Narrows an unknown realtime payload to a called_phrases row. */
function toCalledPhraseRow(row: Record<string, unknown>) {
  return {
    phrase: row['phrase'] as string,
    called_by: row['called_by'] as string,
    called_at: row['called_at'] as string,
  }
}

/** Narrows an unknown realtime payload to a tile_marks row. */
function toTileMarkRow(row: Record<string, unknown>) {
  return {
    player_id: row['player_id'] as string,
    tile_index: row['tile_index'] as number,
  }
}

/** Narrows an unknown realtime payload to a bingo_events row. */
function toBingoEventRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    player_id: row['player_id'] as string,
    pattern: row['pattern'] as string,
    fired_at: row['fired_at'] as string,
  }
}

/**
 * Subscribes to real-time game events for a session.
 * Multiplexes called_phrases, tile_marks, and bingo_events
 * onto a single Supabase channel.
 *
 * @param sessionId - The session UUID to subscribe to
 * @returns Reactive state: calledPhrases, allPlayerMarks, bingoEvents
 */
export function useRealtimeSession(sessionId: string): UseRealtimeSessionResult {
  const [calledPhrases, setCalledPhrases] = useState(new Map<string, CalledPhraseRecord>())
  const [allPlayerMarks, setAllPlayerMarks] = useState(new Map<string, number[]>())
  const [bingoEvents, setBingoEvents] = useState<BingoEventRecord[]>([])

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      // --- called_phrases INSERT ---
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
          setCalledPhrases((prev) => {
            if (prev.has(row.phrase)) return prev
            const next = new Map(prev)
            next.set(row.phrase, {
              phrase: row.phrase,
              calledBy: row.called_by,
              calledAt: new Date(row.called_at),
            })
            return next
          })
        },
      )
      // --- called_phrases DELETE (undo) ---
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
          setCalledPhrases((prev) => {
            if (!prev.has(row.phrase)) return prev
            const next = new Map(prev)
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            next.delete(row.phrase)
            return next
          })
        },
      )
      // --- tile_marks INSERT ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tile_marks',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = toTileMarkRow(payload.new as Record<string, unknown>)
          setAllPlayerMarks((prev) => {
            const existing = prev.get(row.player_id) ?? []
            if (existing.includes(row.tile_index)) return prev
            const next = new Map(prev)
            next.set(row.player_id, [...existing, row.tile_index])
            return next
          })
        },
      )
      // --- tile_marks DELETE (undo cascading) ---
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tile_marks',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = toTileMarkRow(payload.old as Record<string, unknown>)
          setAllPlayerMarks((prev) => {
            const existing = prev.get(row.player_id)
            if (!existing) return prev
            const filtered = existing.filter((idx) => idx !== row.tile_index)
            const next = new Map(prev)
            if (filtered.length === 0) {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              next.delete(row.player_id)
            } else {
              next.set(row.player_id, filtered)
            }
            return next
          })
        },
      )
      // --- bingo_events INSERT ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bingo_events',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = toBingoEventRow(payload.new as Record<string, unknown>)
          setBingoEvents((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev
            return [
              ...prev,
              {
                id: row.id,
                playerId: row.player_id,
                pattern: row.pattern,
                firedAt: new Date(row.fired_at),
              },
            ]
          })
        },
      )
      .subscribe((_status, err) => {
        if (err) {
          console.error('session realtime subscription error:', err)
          return
        }
        // Fetch initial data in parallel after subscription active
        void Promise.all([
          supabase
            .from('called_phrases')
            .select('phrase, called_by, called_at')
            .eq('session_id', sessionId)
            .order('called_at', { ascending: true }),
          supabase.from('tile_marks').select('player_id, tile_index').eq('session_id', sessionId),
          supabase
            .from('bingo_events')
            .select('id, player_id, pattern, fired_at')
            .eq('session_id', sessionId)
            .order('fired_at', { ascending: true }),
        ]).then(([calledRes, marksRes, bingoRes]) => {
          if (calledRes.data) {
            const map = new Map<string, CalledPhraseRecord>()
            for (const raw of calledRes.data) {
              const r = raw as { phrase: string; called_by: string; called_at: string }
              map.set(r.phrase, {
                phrase: r.phrase,
                calledBy: r.called_by,
                calledAt: new Date(r.called_at),
              })
            }
            setCalledPhrases(map)
          }
          if (marksRes.data) {
            const map = new Map<string, number[]>()
            for (const raw of marksRes.data) {
              const r = raw as { player_id: string; tile_index: number }
              const existing = map.get(r.player_id) ?? []
              existing.push(r.tile_index)
              map.set(r.player_id, existing)
            }
            setAllPlayerMarks(map)
          }
          if (bingoRes.data) {
            setBingoEvents(
              (
                bingoRes.data as Array<{
                  id: string
                  player_id: string
                  pattern: string
                  fired_at: string
                }>
              ).map((r) => ({
                id: r.id,
                playerId: r.player_id,
                pattern: r.pattern,
                firedAt: new Date(r.fired_at),
              })),
            )
          }
        })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { calledPhrases, allPlayerMarks, bingoEvents }
}
