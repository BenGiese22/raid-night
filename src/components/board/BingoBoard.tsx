import { BingoTile } from './BingoTile'

interface BingoBoardProps {
  readonly phrases: readonly string[]
  readonly markedIndices: ReadonlySet<number>
  readonly freeSpace: boolean
}

/**
 * 5x5 bingo board grid. Renders 25 BingoTile components
 * with marked state derived from the set of marked indices.
 */
export function BingoBoard({ phrases, markedIndices, freeSpace }: BingoBoardProps) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {phrases.map((phrase, index) => (
        <BingoTile
          key={phrase}
          phrase={phrase}
          index={index}
          marked={markedIndices.has(index)}
          isFreeSpace={freeSpace && index === 12}
        />
      ))}
    </div>
  )
}
