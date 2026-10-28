const DOT_COLORS = [
  'bg-sky-300',
  'bg-emerald-300',
  'bg-violet-300',
  'bg-pink-300',
  'bg-cyan-300',
  'bg-orange-300',
  'bg-lime-300',
  'bg-rose-300',
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
 * Shows other players' tile progress as a colored dot and a filled bar with counts.
 * Current player is excluded from the display.
 */
export function PlayerProgress({ allPlayerMarks, currentPlayerId }: PlayerProgressProps) {
  const otherPlayers = Array.from(allPlayerMarks.entries()).filter(([id]) => id !== currentPlayerId)

  return (
    <div data-testid="player-progress" className="flex flex-wrap gap-x-5 gap-y-2">
      {otherPlayers.map(([playerId, marks]) => {
        const colorClass: string =
          DOT_COLORS[hashCode(playerId) % DOT_COLORS.length] ?? 'bg-sky-300'
        return (
          <div key={playerId} className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} />
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-rule/60">
              <span
                className={`block h-full rounded-full ${colorClass}`}
                style={{ width: `${String(Math.min(100, (marks.length / 25) * 100))}%` }}
              />
            </span>
            <span className="text-xs text-mist">{String(marks.length)}/25</span>
          </div>
        )
      })}
    </div>
  )
}
