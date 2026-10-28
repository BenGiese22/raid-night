'use client'

import { useEffect, useRef, useState } from 'react'

import type { BingoEventRecord } from '@/hooks/useRealtimeSession'

const DISMISS_MS = 5_000

interface BingoToastProps {
  readonly bingoEvents: readonly BingoEventRecord[]
  readonly playerId: string
}

interface ToastItem {
  readonly id: string
  readonly message: string
  readonly isOwn: boolean
}

/**
 * Displays BINGO announcements as a raid-warning banner across the top of the screen.
 * "You got BINGO!" for own events, "Someone got BINGO!" for others.
 * Auto-dismisses after 5 seconds.
 */
export function BingoToast({ bingoEvents, playerId }: BingoToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    const newToasts: ToastItem[] = []
    for (const event of bingoEvents) {
      if (shownRef.current.has(event.id)) continue
      shownRef.current.add(event.id)
      const isOwn = event.playerId === playerId
      newToasts.push({
        id: event.id,
        message: isOwn ? 'You got BINGO!' : 'Someone got BINGO!',
        isOwn,
      })
    }
    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts])
    }
  }, [bingoEvents, playerId])

  useEffect(() => {
    if (toasts.length === 0) return

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, DISMISS_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div role="status" aria-live="assertive" className="fixed inset-x-0 top-0 z-50">
      {toasts.slice(0, 1).map((toast) => (
        <div
          key={toast.id}
          className={`raid-warning px-4 py-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
            toast.isOwn ? 'bg-hl text-hl-ink' : 'border-b-4 border-hl bg-panel text-hl'
          }`}
        >
          <p className="display text-4xl sm:text-6xl">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}
