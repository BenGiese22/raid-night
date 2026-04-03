'use client'

import { useState } from 'react'

interface LockButtonProps {
  readonly sessionCode: string
  readonly phraseCount: number
}

/**
 * Manual lock button with confirmation step.
 * Shows a warning if fewer than 25 phrases are submitted.
 */
export function LockButton({ sessionCode, phraseCount }: LockButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLock() {
    setIsLocking(true)
    setError(null)
    try {
      const response = await fetch(`/api/sessions/${sessionCode}/lock`, {
        method: 'PATCH',
      })
      if (!response.ok) {
        const data: unknown = await response.json()
        const msg =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: unknown }).error)
            : 'Failed to lock session'
        setError(msg)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsLocking(false)
    }
  }

  return (
    <div className="space-y-2">
      {phraseCount < 25 && (
        <p className="text-xs text-yellow-400">
          Warning: At least 25 phrases are needed for full boards
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!isConfirming ? (
        <button
          type="button"
          onClick={() => {
            setIsConfirming(true)
          }}
          className="w-full rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
        >
          Lock Session ({String(phraseCount)} phrases)
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            Lock {String(phraseCount)} phrases and start the game?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLocking}
              onClick={() => {
                void handleLock()
              }}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLocking ? 'Locking...' : 'Confirm'}
            </button>
            <button
              type="button"
              disabled={isLocking}
              onClick={() => {
                setIsConfirming(false)
              }}
              className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 transition hover:border-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
