// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DateTimePicker } from '@/components/ui/DateTimePicker'

describe('DateTimePicker', () => {
  beforeEach(() => {
    // Only fake Date so user-event and React timers keep working
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves the time forward when Today is clicked after the default time has passed', async () => {
    vi.setSystemTime(new Date(2026, 9, 28, 21, 32))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimePicker value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(onChange).toHaveBeenLastCalledWith('2026-10-28T21:40')
    expect(screen.getByText(/today at/i)).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('disables Today when no slot is left before midnight', () => {
    vi.setSystemTime(new Date(2026, 9, 28, 23, 58))
    render(<DateTimePicker value="" onChange={vi.fn()} />)

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Today' }).disabled).toBe(true)
  })

  it('keeps the chosen time when Tomorrow is more than 24 hours away', async () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 0))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimePicker value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))

    expect(onChange).toHaveBeenLastCalledWith('2026-10-29T20:00')
  })

  it('schedules a later day in the week from its chip', async () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 0))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimePicker value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Sat.*31/ }))

    expect(onChange).toHaveBeenLastCalledWith('2026-10-31T20:00')
    expect(screen.getByText(/saturday at/i)).toBeDefined()
  })

  it('offers seven day chips', () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 0))
    render(<DateTimePicker value="" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Day' }).querySelectorAll('button')).toHaveLength(7)
  })

  it('sets a time from a quick pick', async () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 2))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimePicker value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'In 2 hours' }))

    expect(onChange).toHaveBeenLastCalledWith('2026-10-28T17:05')
  })

  it('clears the schedule and emits an empty value', async () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 0))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimePicker value="" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Today' }))
    await user.click(screen.getByRole('button', { name: /don.t auto-deal/i }))

    expect(onChange).toHaveBeenLastCalledWith('')
    expect(screen.getByText(/no auto-deal/i)).toBeDefined()
  })

  it('reports validity so the form can block submit', () => {
    vi.setSystemTime(new Date(2026, 9, 28, 15, 0))
    const onValidityChange = vi.fn()
    // An initial value in the past renders as invalid
    render(
      <DateTimePicker
        value="2026-10-28T10:00"
        onChange={vi.fn()}
        onValidityChange={onValidityChange}
      />,
    )

    expect(onValidityChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('alert').textContent).toMatch(/already passed/)
  })
})
