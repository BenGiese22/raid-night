import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PhraseCallList } from '@/components/session/PhraseCallList'

const ALL_PHRASES = ['tank pulled early', 'wipe on trash', 'loot drama', 'afk bio']
const CALLED = new Set(['wipe on trash'])

describe('PhraseCallList', () => {
  it('renders only uncalled phrases', () => {
    render(
      <PhraseCallList
        phrasePool={ALL_PHRASES}
        calledPhrases={CALLED}
        onCallPhrase={vi.fn()}
        disabled={false}
      />,
    )
    expect(screen.getByText('tank pulled early')).toBeDefined()
    expect(screen.getByText('loot drama')).toBeDefined()
    expect(screen.getByText('afk bio')).toBeDefined()
    expect(screen.queryByText('wipe on trash')).toBeNull()
  })

  it('filters phrases by search input', async () => {
    const user = userEvent.setup()
    render(
      <PhraseCallList
        phrasePool={ALL_PHRASES}
        calledPhrases={new Set()}
        onCallPhrase={vi.fn()}
        disabled={false}
      />,
    )
    await user.type(screen.getByPlaceholderText('Search phrases...'), 'tank')
    expect(screen.getByText('tank pulled early')).toBeDefined()
    expect(screen.queryByText('loot drama')).toBeNull()
  })

  it('calls onCallPhrase with the phrase when clicked', async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()
    render(
      <PhraseCallList
        phrasePool={ALL_PHRASES}
        calledPhrases={new Set()}
        onCallPhrase={onCall}
        disabled={false}
      />,
    )
    await user.click(screen.getByText('tank pulled early'))
    expect(onCall).toHaveBeenCalledWith('tank pulled early')
  })

  it('disables buttons when disabled prop is true', () => {
    render(
      <PhraseCallList
        phrasePool={ALL_PHRASES}
        calledPhrases={new Set()}
        onCallPhrase={vi.fn()}
        disabled={true}
      />,
    )
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.hasAttribute('disabled')).toBe(true)
    }
  })
})
