// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PresenceCount } from '@/components/session/PresenceCount'

describe('PresenceCount', () => {
  it('displays singular form for 1 player', () => {
    render(<PresenceCount playerCount={1} />)
    expect(screen.getByText('1 player in session')).toBeDefined()
  })

  it('displays plural form for multiple players', () => {
    render(<PresenceCount playerCount={4} />)
    expect(screen.getByText('4 players in session')).toBeDefined()
  })
})
