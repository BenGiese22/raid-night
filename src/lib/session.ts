const ADJECTIVES = [
  'arcane',
  'burning',
  'crimson',
  'dark',
  'elder',
  'frost',
  'golden',
  'hollow',
  'iron',
  'jade',
  'keen',
  'lost',
  'mystic',
  'nether',
  'obsidian',
  'primal',
  'rune',
  'shadow',
  'thunder',
  'void',
] as const

const NOUNS = [
  'blade',
  'drake',
  'fang',
  'gate',
  'hawk',
  'keep',
  'lance',
  'moon',
  'oath',
  'peak',
  'realm',
  'shard',
  'thorn',
  'vale',
  'ward',
  'wolf',
  'wyrm',
  'zenith',
  'crest',
  'forge',
] as const

/** Result of phrase pool validation */
export interface ValidationResult {
  readonly valid: boolean
  readonly phrases: readonly string[]
  readonly errors: readonly string[]
}

/**
 * Generates a human-readable session code in adjective-noun-number format.
 * Uses Math.random() — codes are meant to be unique-ish, not deterministic.
 *
 * @returns Session code string (e.g. "frost-wolf-42")
 */
export function generateSessionCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] ?? ADJECTIVES[0]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)] ?? NOUNS[0]
  const num = Math.floor(Math.random() * 90) + 10
  return `${adj}-${noun}-${String(num)}`
}

/**
 * Validates and normalises a phrase pool for a bingo session.
 * Trims, lowercases, and deduplicates phrases. Enforces min 25 and max 100.
 *
 * @param phrases - Raw phrase array from user input
 * @returns Validation result with cleaned phrases and any errors
 */
export function validatePhrasePool(phrases: string[]): ValidationResult {
  const errors: string[] = []

  const seen = new Set<string>()
  const cleaned: string[] = []

  for (const phrase of phrases) {
    const normalised = phrase.trim().toLowerCase()
    if (normalised && !seen.has(normalised)) {
      seen.add(normalised)
      cleaned.push(normalised)
    }
  }

  if (cleaned.length < 25) {
    errors.push('Phrase pool must contain at least 25 unique phrases')
  }

  if (cleaned.length > 100) {
    errors.push('Phrase pool must not exceed 100 unique phrases')
  }

  return { valid: errors.length === 0, phrases: cleaned, errors }
}
