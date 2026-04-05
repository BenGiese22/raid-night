'use client'

import { useEffect, useRef, useState } from 'react'

const UNDO_WINDOW_MS = 30_000
const TICK_MS = 100

interface CalledPhraseItemProps {
  readonly phrase: string
  readonly calledAt: Date
  readonly canUndo: boolean
  readonly onUndo: () => void
}

/**
 * A single called phrase with a draining countdown bar and undo button.
 * The undo window lasts 30 seconds from calledAt.
 *
 * @param phrase - The phrase text that was called
 * @param calledAt - The timestamp when the phrase was called
 * @param canUndo - Whether the current player can undo this call
 * @param onUndo - Callback fired when the player clicks Undo
 */
export function CalledPhraseItem({ phrase, calledAt, canUndo, onUndo }: CalledPhraseItemProps) {
  const [remainingMs, setRemainingMs] = useState(() => {
    const elapsed = Date.now() - calledAt.getTime()
    return Math.max(0, UNDO_WINDOW_MS - elapsed)
  })

  // Use a ref to hold the timeout handle so we can schedule a chain of ticks
  // without `remainingMs` in the dependency array (which would cause infinite re-mounts).
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!canUndo) return

    const tick = () => {
      const elapsedNow = Date.now() - calledAt.getTime()
      const remaining = Math.max(0, UNDO_WINDOW_MS - elapsedNow)
      setRemainingMs(remaining)
      if (remaining > 0) {
        timeoutRef.current = setTimeout(tick, TICK_MS)
      }
    }

    timeoutRef.current = setTimeout(tick, TICK_MS)

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [canUndo, calledAt])

  const showUndo = canUndo && remainingMs > 0
  const pct = (remainingMs / UNDO_WINDOW_MS) * 100

  return (
    <div className="relative rounded border border-gray-700 bg-gray-800 px-3 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{phrase}</span>
        {showUndo && (
          <button
            type="button"
            onClick={onUndo}
            aria-label={`Undo ${phrase}`}
            className="ml-2 rounded px-2 py-0.5 text-xs text-red-400 transition hover:bg-red-900/30"
          >
            Undo
          </button>
        )}
      </div>
      {showUndo && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all"
          style={{ width: `${String(pct)}%` }}
        />
      )}
    </div>
  )
}
