const DOT_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-cyan-400',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-red-400',
]

/**
 * Simple hash of a string to a positive integer.
 * Used for deterministic color assignment.
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

interface PlayerProgressProps {
  readonly allPlayerMarks: ReadonlyMap<string, readonly number[]>
  readonly currentPlayerId: string
}

/**
 * Shows other players' tile progress as colored dots with counts.
 * Current player is excluded from the display.
 */
export function PlayerProgress({ allPlayerMarks, currentPlayerId }: PlayerProgressProps) {
  const otherPlayers = Array.from(allPlayerMarks.entries()).filter(([id]) => id !== currentPlayerId)

  return (
    <div data-testid="player-progress" className="flex flex-wrap gap-2">
      {otherPlayers.map(([playerId, marks]) => {
        const colorClass: string =
          DOT_COLORS[hashCode(playerId) % DOT_COLORS.length] ?? 'bg-blue-400'
        return (
          <div key={playerId} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} />
            <span className="text-xs text-gray-400">{String(marks.length)}/25</span>
          </div>
        )
      })}
    </div>
  )
}
