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
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
      />
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-500">
            {uncalled.length === 0 ? 'All phrases called!' : 'No matching phrases'}
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
              className="w-full rounded px-3 py-1.5 text-left text-sm text-gray-300 transition hover:bg-gray-800 disabled:opacity-50"
            >
              {phrase}
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-gray-500">
        {String(uncalled.length)} of {String(phrasePool.length)} phrases remaining
      </p>
    </div>
  )
}
