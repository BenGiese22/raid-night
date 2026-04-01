/**
 * All application enums. Reference these everywhere — never use raw strings
 * for categorical values.
 */

/** Session lifecycle status */
export enum SessionStatus {
  Collecting = 'collecting',
  Locked = 'locked',
}

/** Controls whether phrase submissions are visible during collection */
export enum SubmissionVisibility {
  /** Live feed — all connected clients see new phrases as they arrive */
  Open = 'open',
  /** Count only — phrases revealed when session locks */
  Blind = 'blind',
}

/** World of Warcraft class options for the dice roller */
export enum WowClass {
  Warrior = 'warrior',
  Mage = 'mage',
  Priest = 'priest',
  Paladin = 'paladin',
  Rogue = 'rogue',
  Druid = 'druid',
  Warlock = 'warlock',
  Hunter = 'hunter',
  Shaman = 'shaman',
}

/** All possible bingo winning patterns on a 5x5 grid */
export enum BingoPattern {
  Row0 = 'row_0',
  Row1 = 'row_1',
  Row2 = 'row_2',
  Row3 = 'row_3',
  Row4 = 'row_4',
  Col0 = 'col_0',
  Col1 = 'col_1',
  Col2 = 'col_2',
  Col3 = 'col_3',
  Col4 = 'col_4',
  DiagTL = 'diagonal_tl',
  DiagTR = 'diagonal_tr',
}

/** Sound events triggered by game actions */
export enum SoundEvent {
  TileMarked = 'tile_marked',
  PhraseCalled = 'phrase_called',
  BingoWon = 'bingo_won',
  UndoFired = 'undo_fired',
}

/** Supabase real-time event types */
export enum RealtimeEvent {
  TileMark = 'tile_mark',
  PhraseCall = 'phrase_call',
  BingoEvent = 'bingo_event',
  UndoEvent = 'undo_event',
}
