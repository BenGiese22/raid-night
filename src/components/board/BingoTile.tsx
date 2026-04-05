/** Returns a Tailwind text-size class based on phrase length. */
function textSizeClass(text: string): string {
  const len = text.length
  if (len <= 10) return 'text-sm'
  if (len <= 25) return 'text-xs'
  return 'text-[10px]'
}

interface BingoTileProps {
  readonly phrase: string
  readonly index: number
  readonly marked: boolean
  readonly isFreeSpace?: boolean
}

/**
 * A single tile on the 5x5 bingo board.
 * Displays the phrase text and reflects marked/unmarked state.
 * When isFreeSpace is true, displays "FREE" with distinct styling.
 */
export function BingoTile({ phrase, index, marked, isFreeSpace }: BingoTileProps) {
  const displayText = isFreeSpace ? 'FREE' : phrase

  return (
    <div
      data-testid={`bingo-tile-${String(index)}`}
      data-marked={String(marked)}
      className={`flex aspect-square items-center justify-center overflow-hidden rounded border p-1 text-center font-medium transition-colors ${textSizeClass(displayText)} ${
        isFreeSpace
          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
          : marked
            ? 'border-amber-600 bg-amber-900/60 text-amber-100'
            : 'border-gray-700 bg-gray-900 text-gray-300'
      }`}
    >
      <span>{displayText}</span>
    </div>
  )
}
