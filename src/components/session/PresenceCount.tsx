interface PresenceCountProps {
  readonly playerCount: number
}

/**
 * Displays the number of players currently connected to the session.
 *
 * @param playerCount - Number of players currently present in the session
 */
export function PresenceCount({ playerCount }: PresenceCountProps) {
  const label = playerCount === 1 ? 'player' : 'players'
  return (
    <p className="flex items-center gap-2 text-sm text-mist">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ready" />
      {String(playerCount)} {label} in session
    </p>
  )
}
