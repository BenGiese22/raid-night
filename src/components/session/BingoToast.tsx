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
}

/**
 * Displays BINGO celebration toasts.
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
      const message = event.playerId === playerId ? 'You got BINGO!' : 'Someone got BINGO!'
      newToasts.push({ id: event.id, message })
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
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-bounce rounded-lg border border-amber-500 bg-amber-900/90 px-6 py-3 text-center text-lg font-bold text-amber-100 shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
