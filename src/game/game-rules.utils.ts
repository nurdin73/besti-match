import type {
  CategoryId,
  GameState,
  GameSummary,
  PlayerBreakdown,
  Question,
  Role,
} from '@/types/game.types'

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  kocak: '😂 Lucu & Kocak',
  harian: '☕ Harian',
  kantor: '💼 Dunia Kerja',
  popkultur: '🍿 Pop Culture',
  nostalgia: '🎒 Masa Kecil',
  deep: '🌙 Deep Talk',
  romantis: '💘 Romantis',
  custom: '✍️ Soal Kustom',
}

export const DEFAULT_THRESHOLD = 0.7
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]).join('')
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z2-9]{6}$/.test(code)
}

/** Host is the subject on even rounds (0-based), guest on odd ones. */
export function targetRoleFor(roundIndex: number): Role {
  return roundIndex % 2 === 0 ? 'host' : 'guest'
}

export function otherRole(role: Role): Role {
  return role === 'host' ? 'guest' : 'host'
}

export function renderQuestion(template: string, targetName: string): string {
  return template.replaceAll('{target}', targetName)
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/** Custom questions go first, then preset ones; repeats only if the pool is too small. */
export function pickQuestions(
  bank: Question[],
  categories: CategoryId[],
  custom: Question[],
  count: number,
  random: () => number = Math.random,
): Question[] {
  const preset = bank.filter((q) => categories.includes(q.category))
  const pool = [...shuffle(custom, random), ...shuffle(preset, random)]
  if (!pool.length) return []
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]!)
}

export function compatibilityTitle(percent: number): string {
  if (percent >= 90) return 'Soulmate Sejati 💞'
  if (percent >= 70) return 'Bestie Level Dewa ✨'
  if (percent >= 50) return 'Bestie Nongkrong ☕'
  if (percent >= 30) return 'Temen Biasa Aja 🙂'
  return 'Kalian Kenal Gak Sih? 🤨'
}

export function summarizeGame(state: Pick<GameState, 'history' | 'players'>): GameSummary {
  const rounds = state.history.filter((r) => r.result)
  const matches = rounds.filter((r) => r.result?.isMatch).length
  const compatibility = rounds.length ? Math.round((matches / rounds.length) * 100) : 0

  const players: PlayerBreakdown[] = (['host', 'guest'] as const).map((role) => {
    const guessed = rounds.filter((r) => otherRole(r.targetRole) === role)
    return {
      role,
      name: state.players[role]?.name ?? '-',
      guessAttempts: guessed.length,
      correctGuesses: guessed.filter((r) => r.result?.isMatch).length,
    }
  })

  return { compatibility, matches, totalRounds: rounds.length, title: compatibilityTitle(compatibility), players }
}
