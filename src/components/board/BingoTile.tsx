/** Returns a Tailwind text-size class based on phrase length. */
function textSizeClass(text: string): string {
  const len = text.length
  if (len <= 10) return 'text-[13px] sm:text-base'
  if (len <= 25) return 'text-[11px] sm:text-sm'
  return 'text-[10px] sm:text-xs'
}

interface BingoTileProps {
  readonly phrase: string
  readonly index: number
  readonly marked: boolean
  readonly isFreeSpace?: boolean
}

/**
 * A single tile on the 5x5 bingo board.
 * Marked tiles read like highlighter on a printout; the free space is outlined in teal.
 * When isFreeSpace is true, displays "FREE" with distinct styling.
 */
export function BingoTile({ phrase, index, marked, isFreeSpace }: BingoTileProps) {
  const displayText = isFreeSpace ? 'FREE' : phrase

  return (
    <div
      data-testid={`bingo-tile-${String(index)}`}
      data-marked={String(marked)}
      className={`flex aspect-square items-center justify-center overflow-hidden rounded-md border p-1 text-center leading-tight transition-colors duration-200 [overflow-wrap:anywhere] sm:p-2 ${textSizeClass(displayText)} ${
        isFreeSpace
          ? 'border-ready bg-ready/15 font-bold text-ready'
          : marked
            ? 'border-hl bg-hl font-semibold text-hl-ink'
            : 'border-rule bg-panel text-bone'
      }`}
    >
      <span>{displayText}</span>
    </div>
  )
}
