'use client'

import { useEffect, useState } from 'react'

import { getOrCreatePlayerId } from '@/lib/board'
import { supabase } from '@/lib/supabase/client'
import { SessionStatus } from '@/types/enums'
import type { SessionPageData } from '@/types/models'
import { BoardView } from '@/components/session/BoardView'
import { CollectionView } from '@/components/session/CollectionView'
import { PresenceCount } from '@/components/session/PresenceCount'
import { usePresence } from '@/hooks/usePresence'

/**
 * Client wrapper for the session page.
 * Manages real-time session status transitions and player identity.
 */
export function SessionClient(props: SessionPageData) {
  const [status, setStatus] = useState(props.status)
  const [phrasePool, setPhrasePool] = useState(props.phrasePool)
  const [playerId, setPlayerId] = useState<string | null>(null)

  // Establish player identity on mount
  useEffect(() => {
    setPlayerId(getOrCreatePlayerId(props.code))
  }, [props.code])

  const { playerCount } = usePresence(props.id, playerId ?? '')

  // Subscribe to session status changes, then refetch to catch SSR-to-hydration gap
  useEffect(() => {
    function handleLocked(pool: readonly string[]) {
      setStatus(SessionStatus.Locked)
      setPhrasePool(pool)
    }

    const channel = supabase
      .channel(`session-status:${props.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${props.id}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>
          if (newRecord.status === SessionStatus.Locked) {
            const pool = Array.isArray(newRecord.phrase_pool)
              ? (newRecord.phrase_pool as string[])
              : []
            handleLocked(pool)
          }
        },
      )
      .subscribe((_subStatus, err) => {
        if (err) return
        // Refetch current status to catch transitions during SSR→hydration gap
        void supabase
          .from('sessions')
          .select('status, phrase_pool')
          .eq('id', props.id)
          .single()
          .then(({ data }) => {
            if (!data) return
            const row = data as Record<string, unknown>
            if (row.status === SessionStatus.Locked) {
              const pool = Array.isArray(row.phrase_pool) ? (row.phrase_pool as string[]) : []
              handleLocked(pool)
            }
          })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [props.id])

  if (!playerId) {
    return <div className="flex min-h-screen items-center justify-center text-mist">Loading…</div>
  }

  if (status === SessionStatus.Locked) {
    return (
      <main className="min-h-screen">
        <header className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-4 pb-2 pt-5">
          <h1 className="display text-3xl text-hl">{props.code}</h1>
          <PresenceCount playerCount={playerCount} />
        </header>
        <BoardView
          sessionId={props.id}
          sessionCode={props.code}
          phrasePool={phrasePool}
          playerId={playerId}
          freeSpace={props.freeSpace}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <p className="font-semibold">Raid Night Bingo</p>
          <PresenceCount playerCount={playerCount} />
        </div>
        <CollectionView
          sessionId={props.id}
          sessionCode={props.code}
          visibility={props.visibility}
          playerId={playerId}
          scheduledLockAt={props.scheduledLockAt}
        />
      </div>
    </main>
  )
}
