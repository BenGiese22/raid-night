interface BingoTileProps {
  readonly phrase: string
  readonly index: number
  readonly marked: boolean
}

/**
 * A single tile on the 5x5 bingo board.
 * Displays the phrase text and reflects marked/unmarked state.
 */
export function BingoTile({ phrase, index, marked }: BingoTileProps) {
  return (
    <div
      data-testid={`bingo-tile-${String(index)}`}
      data-marked={String(marked)}
      className={`flex items-center justify-center rounded border p-2 text-center text-xs font-medium transition-colors ${
        marked
          ? 'border-amber-600 bg-amber-900/60 text-amber-100'
          : 'border-gray-700 bg-gray-900 text-gray-300'
      }`}
    >
      <span className="line-clamp-3">{phrase}</span>
    </div>
  )
}
