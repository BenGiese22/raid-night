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
    <p className="text-sm text-gray-400">
      {String(playerCount)} {label} in session
    </p>
  )
}
