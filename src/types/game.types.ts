export type Role = 'host' | 'guest'

export type CategoryId =
  | 'kocak'
  | 'romantis'
  | 'deep'
  | 'harian'
  | 'kantor'
  | 'popkultur'
  | 'nostalgia'
  | 'custom'

export interface Question {
  id: string
  category: CategoryId
  /** Uses `{target}` as the placeholder for the subject player's name. */
  template: string
  /** Cosine-similarity threshold for the semantic tier. */
  threshold: number
}

export type RoundCount = 5 | 10 | 15
/** `null` means no time limit. */
export type TimerSeconds = 45 | null

export interface GameSettings {
  totalRounds: RoundCount
  timerSeconds: TimerSeconds
  categories: CategoryId[]
  customQuestions: Question[]
}

export interface Player {
  name: string
  connected: boolean
}

export type MatchMethod = 'exact' | 'typo' | 'overlap' | 'semantic' | 'empty'

export interface MatchVerdict {
  similarity: number
  method: MatchMethod
  isMatch: boolean
}

export interface RoundResult extends MatchVerdict {
  targetAnswer: string
  guessAnswer: string
  /** True when the target player flipped the AI verdict. */
  overridden: boolean
}

export interface RoundState {
  index: number
  questionText: string
  category: CategoryId
  targetRole: Role
  submitted: Record<Role, boolean>
  /** Host clock epoch ms; null when no timer. */
  deadline: number | null
  result: RoundResult | null
}

export type GamePhase = 'lobby' | 'answering' | 'evaluating' | 'reveal' | 'finished'

export interface GameState {
  roomCode: string
  phase: GamePhase
  players: Record<Role, Player | null>
  settings: GameSettings
  round: RoundState | null
  history: RoundState[]
}

export interface PlayerBreakdown {
  role: Role
  name: string
  correctGuesses: number
  guessAttempts: number
}

export interface GameSummary {
  compatibility: number
  matches: number
  totalRounds: number
  title: string
  players: PlayerBreakdown[]
}
