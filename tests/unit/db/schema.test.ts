import { describe, expect, it } from 'vitest'

import { bingoEvents, calledPhrases, phraseSubmissions, sessions, tileMarks } from '@/db/schema'
import { getTableConfig } from 'drizzle-orm/pg-core'

describe('schema exports', () => {
  it('exports all 5 tables', () => {
    expect(sessions).toBeDefined()
    expect(phraseSubmissions).toBeDefined()
    expect(calledPhrases).toBeDefined()
    expect(tileMarks).toBeDefined()
    expect(bingoEvents).toBeDefined()
  })
})

describe('sessions table', () => {
  const config = getTableConfig(sessions)

  it('is named "sessions"', () => {
    expect(config.name).toBe('sessions')
  })

  it('has all expected columns', () => {
    const columnNames = config.columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'code',
        'phrase_pool',
        'status',
        'visibility',
        'created_at',
        'last_activity_at',
        'scheduled_lock_at',
        'locked_at',
      ]),
    )
  })

  it('has a unique constraint on code', () => {
    const codeCol = config.columns.find((c) => c.name === 'code')
    expect(codeCol?.isUnique).toBe(true)
  })
})

describe('phraseSubmissions table', () => {
  const config = getTableConfig(phraseSubmissions)

  it('is named "phrase_submissions"', () => {
    expect(config.name).toBe('phrase_submissions')
  })

  it('has a composite unique constraint on (session_id, phrase)', () => {
    expect(config.uniqueConstraints.length).toBeGreaterThanOrEqual(1)
    const cols = config.uniqueConstraints[0]?.columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['session_id', 'phrase']))
  })
})

describe('calledPhrases table', () => {
  const config = getTableConfig(calledPhrases)

  it('is named "called_phrases"', () => {
    expect(config.name).toBe('called_phrases')
  })

  it('has a composite unique constraint on (session_id, phrase)', () => {
    expect(config.uniqueConstraints.length).toBeGreaterThanOrEqual(1)
    const cols = config.uniqueConstraints[0]?.columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['session_id', 'phrase']))
  })
})

describe('tileMarks table', () => {
  const config = getTableConfig(tileMarks)

  it('is named "tile_marks"', () => {
    expect(config.name).toBe('tile_marks')
  })

  it('has a composite unique constraint on (player_id, tile_index)', () => {
    expect(config.uniqueConstraints.length).toBeGreaterThanOrEqual(1)
    const cols = config.uniqueConstraints[0]?.columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['player_id', 'tile_index']))
  })
})

describe('bingoEvents table', () => {
  const config = getTableConfig(bingoEvents)

  it('is named "bingo_events"', () => {
    expect(config.name).toBe('bingo_events')
  })

  it('has all expected columns', () => {
    const columnNames = config.columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'session_id', 'player_id', 'pattern', 'fired_at']),
    )
  })
})
