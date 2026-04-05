import { BingoTile } from './BingoTile'

interface BingoBoardProps {
  readonly phrases: readonly string[]
  readonly markedIndices: ReadonlySet<number>
}

/**
 * 5x5 bingo board grid. Renders 25 BingoTile components
 * with marked state derived from the set of marked indices.
 */
export function BingoBoard({ phrases, markedIndices }: BingoBoardProps) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {phrases.map((phrase, index) => (
        <BingoTile key={index} phrase={phrase} index={index} marked={markedIndices.has(index)} />
      ))}
    </div>
  )
}
