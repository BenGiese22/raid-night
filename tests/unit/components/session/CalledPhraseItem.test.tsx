// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CalledPhraseItem } from '@/components/session/CalledPhraseItem'

describe('CalledPhraseItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the phrase text', () => {
    render(
      <CalledPhraseItem
        phrase="tank pulled early"
        calledAt={new Date()}
        canUndo={true}
        onUndo={vi.fn()}
      />,
    )
    expect(screen.getByText('tank pulled early')).toBeDefined()
  })

  it('shows undo button when canUndo is true', () => {
    render(
      <CalledPhraseItem
        phrase="tank pulled early"
        calledAt={new Date()}
        canUndo={true}
        onUndo={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /undo/i })).toBeDefined()
  })

  it('hides undo button when canUndo is false', () => {
    render(
      <CalledPhraseItem
        phrase="tank pulled early"
        calledAt={new Date()}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull()
  })

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onUndo = vi.fn()
    render(
      <CalledPhraseItem
        phrase="tank pulled early"
        calledAt={new Date()}
        canUndo={true}
        onUndo={onUndo}
      />,
    )
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('hides undo button after 30 seconds', () => {
    render(
      <CalledPhraseItem
        phrase="tank pulled early"
        calledAt={new Date()}
        canUndo={true}
        onUndo={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /undo/i })).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(30_100)
    })

    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull()
  })
})
