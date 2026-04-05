'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase/client'

/**
 * Tracks anonymous player presence for a session via Supabase Presence.
 * Returns the count of currently connected players.
 *
 * @param sessionId - The session UUID
 * @param playerId - This player's anonymous UUID
 * @returns Object with playerCount
 */
export function usePresence(sessionId: string, playerId: string): { readonly playerCount: number } {
  const [playerCount, setPlayerCount] = useState(1)

  useEffect(() => {
    const channel = supabase.channel(`presence:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setPlayerCount(count)
      })
      .subscribe((_status, err) => {
        if (err) {
          console.error('presence subscription error:', err)
          return
        }
        void channel.track({ playerId })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId, playerId])

  return { playerCount }
}
