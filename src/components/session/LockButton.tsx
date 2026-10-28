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
    <div className="space-y-3">
      {phraseCount < 25 && (
        <p className="rounded-md border border-hl/50 bg-hl/10 px-3 py-2 text-sm text-hl">
          You need at least 25 phrases for a full board. {String(25 - phraseCount)} to go.
        </p>
      )}

      {error && <p className="text-sm text-flare">{error}</p>}

      {!isConfirming ? (
        <button
          type="button"
          onClick={() => {
            setIsConfirming(true)
          }}
          className="btn-quiet w-full"
        >
          Lock and deal boards ({String(phraseCount)} phrases)
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-rule bg-panel p-3">
          <p className="text-sm text-bone">
            Lock {String(phraseCount)} phrases and deal everyone a board? Nobody can add phrases
            after this.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLocking}
              onClick={() => {
                void handleLock()
              }}
              className="btn-primary flex-1 text-sm"
            >
              {isLocking ? 'Locking…' : 'Lock and deal'}
            </button>
            <button
              type="button"
              disabled={isLocking}
              onClick={() => {
                setIsConfirming(false)
              }}
              className="btn-quiet flex-1"
            >
              Keep collecting
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
