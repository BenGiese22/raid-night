import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BingoTile } from '@/components/board/BingoTile'

describe('BingoTile', () => {
  it('renders the phrase text', () => {
    render(<BingoTile phrase="tank pulled early" index={0} marked={false} />)
    expect(screen.getByText('tank pulled early')).toBeDefined()
  })

  it('applies marked styling when marked is true', () => {
    render(<BingoTile phrase="wipe on trash" index={1} marked={true} />)
    const tile = screen.getByText('wipe on trash').closest('[data-testid="bingo-tile-1"]')
    expect(tile?.getAttribute('data-marked')).toBe('true')
  })

  it('applies unmarked styling when marked is false', () => {
    render(<BingoTile phrase="loot drama" index={2} marked={false} />)
    const tile = screen.getByText('loot drama').closest('[data-testid="bingo-tile-2"]')
    expect(tile?.getAttribute('data-marked')).toBe('false')
  })
})
