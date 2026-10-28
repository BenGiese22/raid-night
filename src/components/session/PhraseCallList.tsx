'use client'

import { useState } from 'react'

interface PhraseCallListProps {
  readonly phrasePool: readonly string[]
  readonly calledPhrases: ReadonlySet<string>
  readonly onCallPhrase: (phrase: string) => void
  readonly disabled: boolean
}

/**
 * Scrollable, searchable list of uncalled phrases.
 * Players tap a phrase to call it, which auto-marks matching tiles on all boards.
 *
 * @param phrasePool - Full array of phrases from the session
 * @param calledPhrases - Set of phrases already called this session
 * @param onCallPhrase - Callback fired with the phrase string when a player calls it
 * @param disabled - When true, all call buttons are disabled (e.g. session locked)
 */
export function PhraseCallList({
  phrasePool,
  calledPhrases,
  onCallPhrase,
  disabled,
}: PhraseCallListProps) {
  const [search, setSearch] = useState('')

  const uncalled = phrasePool.filter((p) => !calledPhrases.has(p))
  const filtered = search
    ? uncalled.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : uncalled

  return (
    <div className="space-y-2">
      <label htmlFor="phrase-search" className="sr-only">
        Search phrases
      </label>
      <input
        id="phrase-search"
        type="text"
        placeholder="Search phrases..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
        }}
        className="field text-sm"
      />
      <div className="max-h-64 overflow-y-auto rounded-md border border-rule bg-panel">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-mist">
            {uncalled.length === 0
              ? 'Every phrase has been called.'
              : 'No phrase matches that search.'}
          </p>
        ) : (
          filtered.map((phrase) => (
            <button
              key={phrase}
              type="button"
              disabled={disabled}
              onClick={() => {
                onCallPhrase(phrase)
              }}
              className="block w-full border-b border-rule/50 px-3 py-2.5 text-left text-sm text-bone transition last:border-b-0 hover:bg-hl hover:text-hl-ink disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-bone"
            >
              {phrase}
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-mist">
        {String(uncalled.length)} of {String(phrasePool.length)} phrases remaining
      </p>
    </div>
  )
}
