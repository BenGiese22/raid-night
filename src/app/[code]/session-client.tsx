'use client'

import { useEffect, useState } from 'react'

import { getOrCreatePlayerId } from '@/lib/board'
import { supabase } from '@/lib/supabase/client'
import { SessionStatus } from '@/types/enums'
import type { SessionPageData } from '@/types/models'
import { CollectionView } from '@/components/session/CollectionView'

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    )
  }

  if (status === SessionStatus.Locked) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100">
        <div className="mx-auto max-w-2xl px-4 pt-12 text-center">
          <h1 className="mb-4 text-2xl font-bold">Session Locked</h1>
          <p className="text-gray-400">
            {String(phrasePool.length)} phrases locked. Board view coming in Phase 5.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-lg px-4 pt-12">
        <h1 className="mb-6 text-center text-2xl font-bold">Raid Night Bingo</h1>
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
