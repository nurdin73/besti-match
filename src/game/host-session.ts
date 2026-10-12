import type {
  GameSettings,
  GameState,
  MatchVerdict,
  Question,
  Role,
} from '@/types/game.types'
import type { SettingsPatch } from '@/types/p2p.types'
import { DEFAULT_THRESHOLD, otherRole, pickQuestions, renderQuestion, targetRoleFor } from './game-rules.utils'

/** Grace period so a guest's auto-submit at 0s still arrives before the host locks the round. */
export const TIMER_GRACE_MS = 1500

export type JoinVerdict = true | 'ROOM_FULL' | 'GAME_IN_PROGRESS'

export interface HostSessionDeps {
  evaluate: (target: string, guess: string, threshold: number) => Promise<MatchVerdict>
  onChange: (state: GameState) => void
  now?: () => number
}

/** Everything needed to resume a host after a page refresh. */
export interface HostSnapshot {
  state: GameState
  answers: Partial<Record<Role, string>>
  plan: Question[]
  guestToken: string | null
}

export const DEFAULT_SETTINGS: GameSettings = {
  totalRounds: 5,
  timerSeconds: 45,
  categories: ['kocak', 'harian'],
  customQuestions: [],
}

/**
 * Authoritative game engine running in the host tab. Holds hidden answers that
 * are never part of the broadcast `GameState` until the round is revealed.
 */
export class HostSession {
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly now: () => number

  private constructor(private data: HostSnapshot, private readonly deps: HostSessionDeps) {
    this.now = deps.now ?? Date.now
  }

  static create(roomCode: string, hostName: string, deps: HostSessionDeps): HostSession {
    const state: GameState = {
      roomCode,
      phase: 'lobby',
      players: { host: { name: hostName, connected: true }, guest: null },
      settings: structuredClone(DEFAULT_SETTINGS),
      round: null,
      history: [],
    }
    return new HostSession({ state, answers: {}, plan: [], guestToken: null }, deps)
  }

  static restore(snapshot: HostSnapshot, deps: HostSessionDeps): HostSession {
    const session = new HostSession(structuredClone(snapshot), deps)
    session.resumePendingWork()
    return session
  }

  get state(): GameState {
    return this.data.state
  }

  snapshot(): HostSnapshot {
    return structuredClone(this.data)
  }

  handleJoin(name: string, token: string): JoinVerdict {
    const { state } = this.data
    const isReturningGuest = this.data.guestToken === token
    if (!isReturningGuest && this.data.guestToken && state.players.guest?.connected) return 'ROOM_FULL'
    if (!isReturningGuest && state.phase !== 'lobby') return 'GAME_IN_PROGRESS'
    this.data.guestToken = token
    state.players.guest = { name: isReturningGuest && state.players.guest ? state.players.guest.name : name, connected: true }
    this.emit()
    return true
  }

  setGuestConnected(connected: boolean): void {
    const guest = this.data.state.players.guest
    if (!guest) return
    // A guest who leaves the lobby frees the slot; mid-game we keep it for reconnection.
    if (!connected && this.data.state.phase === 'lobby') {
      this.data.state.players.guest = null
      this.data.guestToken = null
    } else {
      guest.connected = connected
    }
    this.emit()
  }

  updateSettings(patch: SettingsPatch): void {
    if (this.data.state.phase !== 'lobby') return
    Object.assign(this.data.state.settings, patch)
    this.emit()
  }

  addCustomQuestion(text: string): void {
    const template = text.trim()
    if (!template || this.data.state.phase !== 'lobby') return
    const id = `custom-${this.now().toString(36)}-${this.data.state.settings.customQuestions.length}`
    this.data.state.settings.customQuestions.push({ id, category: 'custom', template, threshold: DEFAULT_THRESHOLD })
    this.emit()
  }

  removeCustomQuestion(id: string): void {
    const settings = this.data.state.settings
    settings.customQuestions = settings.customQuestions.filter((q) => q.id !== id)
    this.emit()
  }

  canStart(bank: Question[]): boolean {
    const { state } = this.data
    if (state.phase !== 'lobby' || !state.players.guest?.connected) return false
    return pickQuestions(bank, state.settings.categories, state.settings.customQuestions, 1).length > 0
  }

  startGame(bank: Question[]): void {
    if (!this.canStart(bank)) return
    const { settings } = this.data.state
    this.data.plan = pickQuestions(bank, settings.categories, settings.customQuestions, settings.totalRounds)
    this.data.state.history = []
    this.beginRound(0)
  }

  submitAnswer(role: Role, roundIndex: number, answer: string): void {
    const round = this.data.state.round
    if (this.data.state.phase !== 'answering' || round?.index !== roundIndex || round.submitted[role]) return
    this.data.answers[role] = answer.trim().slice(0, 120)
    round.submitted[role] = true
    this.emit()
    if (round.submitted.host && round.submitted.guest) void this.evaluateRound()
  }

  toggleOverride(role: Role, roundIndex: number): void {
    const round = this.data.state.round
    if (this.data.state.phase !== 'reveal' || round?.index !== roundIndex || !round.result) return
    if (round.targetRole !== role) return
    round.result.isMatch = !round.result.isMatch
    round.result.overridden = !round.result.overridden
    this.emit()
  }

  nextRound(): void {
    const { state } = this.data
    if (state.phase !== 'reveal' || !state.round) return
    state.history.push(structuredClone(state.round))
    const next = state.round.index + 1
    if (next >= this.data.plan.length) {
      state.phase = 'finished'
      state.round = null
      this.emit()
      return
    }
    this.beginRound(next)
  }

  backToLobby(): void {
    this.clearTimer()
    Object.assign(this.data.state, { phase: 'lobby', round: null, history: [] })
    this.data.answers = {}
    this.emit()
  }

  dispose(): void {
    this.clearTimer()
  }

  private beginRound(index: number): void {
    const { state } = this.data
    const question = this.data.plan[index]!
    const targetRole = targetRoleFor(index)
    const deadline = state.settings.timerSeconds ? this.now() + state.settings.timerSeconds * 1000 : null
    this.data.answers = {}
    state.phase = 'answering'
    state.round = {
      index,
      questionText: renderQuestion(question.template, state.players[targetRole]?.name ?? '???'),
      category: question.category,
      targetRole,
      submitted: { host: false, guest: false },
      deadline,
      result: null,
    }
    this.scheduleTimeout()
    this.emit()
  }

  private scheduleTimeout(): void {
    this.clearTimer()
    const deadline = this.data.state.round?.deadline
    if (!deadline) return
    const delay = Math.max(0, deadline + TIMER_GRACE_MS - this.now())
    this.timer = setTimeout(() => void this.evaluateRound(), delay)
  }

  private async evaluateRound(): Promise<void> {
    const { state } = this.data
    const round = state.round
    if (!round || (state.phase !== 'answering' && state.phase !== 'evaluating')) return
    this.clearTimer()
    state.phase = 'evaluating'
    this.emit()

    const targetAnswer = this.data.answers[round.targetRole] ?? ''
    const guessAnswer = this.data.answers[otherRole(round.targetRole)] ?? ''
    const threshold = this.data.plan[round.index]?.threshold ?? DEFAULT_THRESHOLD
    const verdict = await this.deps.evaluate(targetAnswer, guessAnswer, threshold)

    if (state.round !== round) return
    round.result = { ...verdict, targetAnswer, guessAnswer, overridden: false }
    state.phase = 'reveal'
    this.emit()
  }

  private resumePendingWork(): void {
    const phase = this.data.state.phase
    if (phase === 'evaluating') void this.evaluateRound()
    if (phase === 'answering') this.scheduleTimeout()
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private emit(): void {
    this.deps.onChange(structuredClone(this.data.state))
  }
}
