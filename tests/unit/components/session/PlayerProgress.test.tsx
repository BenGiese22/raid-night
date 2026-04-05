// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PlayerProgress } from '@/components/session/PlayerProgress'

describe('PlayerProgress', () => {
  it('excludes current player from display', () => {
    const marks = new Map<string, readonly number[]>([
      ['player-self', [0, 1, 2]],
      ['player-other', [3, 4, 5, 6]],
    ])
    render(<PlayerProgress allPlayerMarks={marks} currentPlayerId="player-self" />)
    expect(screen.queryByText(/3\/25/)).toBeNull()
    expect(screen.getByText(/4\/25/)).toBeDefined()
  })

  it('renders nothing when no other players', () => {
    const marks = new Map<string, readonly number[]>([['player-self', [0, 1]]])
    const { container } = render(
      <PlayerProgress allPlayerMarks={marks} currentPlayerId="player-self" />,
    )
    expect(container.querySelector('[data-testid="player-progress"]')?.children.length ?? 0).toBe(0)
  })

  it('shows correct count for multiple other players', () => {
    const marks = new Map<string, readonly number[]>([
      ['player-a', [0, 1, 2, 3, 4]],
      ['player-b', [10, 11]],
      ['player-self', [5]],
    ])
    render(<PlayerProgress allPlayerMarks={marks} currentPlayerId="player-self" />)
    expect(screen.getByText(/5\/25/)).toBeDefined()
    expect(screen.getByText(/2\/25/)).toBeDefined()
  })
})
