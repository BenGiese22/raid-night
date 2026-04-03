'use client'

import { useEffect, useRef, useState } from 'react'

interface LockCountdownProps {
  readonly scheduledLockAt: string
  readonly sessionCode: string
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

/**
 * Live countdown timer for scheduled session auto-lock.
 * Triggers a fallback lock request when the countdown reaches zero.
 */
export function LockCountdown({ scheduledLockAt, sessionCode }: LockCountdownProps) {
  const target = new Date(scheduledLockAt).getTime()
  const [remainingMs, setRemainingMs] = useState(() => target - Date.now())
  const hasTriggered = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = target - Date.now()
      setRemainingMs(remaining)

      if (remaining <= 0 && !hasTriggered.current) {
        hasTriggered.current = true
        void fetch(`/api/sessions/${sessionCode}/lock`, { method: 'PATCH' }).catch(() => {
          // Best-effort fallback — cron job is the primary mechanism
        })
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [target, sessionCode])

  if (remainingMs <= 0) {
    return <p className="text-sm text-yellow-400">Auto-locking now...</p>
  }

  return <p className="text-sm text-gray-400">Auto-locking in {formatCountdown(remainingMs)}</p>
}
