// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { BingoToast } from '@/components/session/BingoToast'
import type { BingoEventRecord } from '@/hooks/useRealtimeSession'

const SELF_EVENT: BingoEventRecord = {
  id: 'evt-1',
  playerId: 'player-self',
  pattern: 'row_0',
  firedAt: new Date(),
}

const OTHER_EVENT: BingoEventRecord = {
  id: 'evt-2',
  playerId: 'player-other',
  pattern: 'col_1',
  firedAt: new Date(),
}

describe('BingoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "You got BINGO!" for own events', () => {
    render(<BingoToast bingoEvents={[SELF_EVENT]} playerId="player-self" />)
    expect(screen.getByText(/you got bingo/i)).toBeDefined()
  })

  it('shows "Someone got BINGO!" for other player events', () => {
    render(<BingoToast bingoEvents={[OTHER_EVENT]} playerId="player-self" />)
    expect(screen.getByText(/someone got bingo/i)).toBeDefined()
  })

  it('auto-dismisses after 5 seconds', () => {
    render(<BingoToast bingoEvents={[SELF_EVENT]} playerId="player-self" />)
    expect(screen.getByText(/you got bingo/i)).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(5100)
    })

    expect(screen.queryByText(/you got bingo/i)).toBeNull()
  })

  it('renders nothing when no events', () => {
    const { container } = render(<BingoToast bingoEvents={[]} playerId="player-self" />)
    expect(container.textContent).toBe('')
  })
})
