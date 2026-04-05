import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BingoBoard } from '@/components/board/BingoBoard'

const PHRASES = Array.from({ length: 25 }, (_, i) => `phrase-${String(i + 1)}`)
const MARKED_INDICES = new Set([0, 6, 12])

describe('BingoBoard', () => {
  it('renders 25 tiles', () => {
    render(<BingoBoard phrases={PHRASES} markedIndices={MARKED_INDICES} />)
    const tiles = screen.getAllByTestId(/^bingo-tile-/)
    expect(tiles).toHaveLength(25)
  })

  it('marks tiles at the specified indices', () => {
    render(<BingoBoard phrases={PHRASES} markedIndices={MARKED_INDICES} />)
    expect(screen.getByTestId('bingo-tile-0').getAttribute('data-marked')).toBe('true')
    expect(screen.getByTestId('bingo-tile-6').getAttribute('data-marked')).toBe('true')
    expect(screen.getByTestId('bingo-tile-12').getAttribute('data-marked')).toBe('true')
  })

  it('does not mark tiles outside the specified indices', () => {
    render(<BingoBoard phrases={PHRASES} markedIndices={MARKED_INDICES} />)
    expect(screen.getByTestId('bingo-tile-1').getAttribute('data-marked')).toBe('false')
    expect(screen.getByTestId('bingo-tile-24').getAttribute('data-marked')).toBe('false')
  })

  it('renders correct phrase text in each tile', () => {
    render(<BingoBoard phrases={PHRASES} markedIndices={new Set()} />)
    expect(screen.getByText('phrase-1')).toBeDefined()
    expect(screen.getByText('phrase-25')).toBeDefined()
  })
})
