import { describe, expect, test } from 'bun:test'
import type { GameState, MatchVerdict, Question } from '@/types/game.types'
import { HostSession } from './host-session'

const bank: Question[] = [
  { id: 'q1', category: 'kocak', template: 'Makanan favorit {target}?', threshold: 0.7 },
  { id: 'q2', category: 'kocak', template: 'Hobi {target}?', threshold: 0.7 },
]

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(verdict: MatchVerdict = { similarity: 1, method: 'exact', isMatch: true }) {
  const emitted: GameState[] = []
  const session = HostSession.create('ABCDEF', 'Ani', {
    evaluate: async () => verdict,
    onChange: (state) => emitted.push(state),
  })
  session.updateSettings({ timerSeconds: null, totalRounds: 5 })
  return { session, emitted, last: () => emitted[emitted.length - 1]! }
}

describe('HostSession lobby', () => {
  test('accepts one guest and rejects a second one', () => {
    const { session } = setup()
    expect(session.handleJoin('Budi', 't1')).toBe(true)
    expect(session.handleJoin('Caca', 't2')).toBe('ROOM_FULL')
  })

  test('cannot start without a connected guest', () => {
    const { session } = setup()
    expect(session.canStart(bank)).toBe(false)
    session.handleJoin('Budi', 't1')
    expect(session.canStart(bank)).toBe(true)
  })

  test('frees the guest slot when the guest leaves the lobby', () => {
    const { session } = setup()
    session.handleJoin('Budi', 't1')
    session.setGuestConnected(false)
    expect(session.state.players.guest).toBeNull()
    expect(session.handleJoin('Caca', 't2')).toBe(true)
  })
})

describe('HostSession rounds', () => {
  test('hides answers until both submit, then reveals the result', async () => {
    const { session, last } = setup()
    session.handleJoin('Budi', 't1')
    session.startGame(bank)

    expect(last().round?.questionText).toContain('Ani')
    session.submitAnswer('host', 0, 'Nasi goreng')
    expect(JSON.stringify(last())).not.toContain('Nasi goreng')

    session.submitAnswer('guest', 0, 'nasi goreng')
    await flush()
    expect(last().phase).toBe('reveal')
    expect(last().round?.result).toMatchObject({ targetAnswer: 'Nasi goreng', guessAnswer: 'nasi goreng', isMatch: true })
  })

  test('only the target may flip the verdict', async () => {
    const { session, last } = setup({ similarity: 0.3, method: 'semantic', isMatch: false })
    session.handleJoin('Budi', 't1')
    session.startGame(bank)
    session.submitAnswer('host', 0, 'rebahan')
    session.submitAnswer('guest', 0, 'mager')
    await flush()

    session.toggleOverride('guest', 0)
    expect(last().round?.result?.isMatch).toBe(false)
    session.toggleOverride('host', 0)
    expect(last().round?.result).toMatchObject({ isMatch: true, overridden: true })
  })

  test('alternates the subject and finishes after the planned rounds', async () => {
    const { session, last } = setup()
    session.handleJoin('Budi', 't1')
    session.updateSettings({ totalRounds: 5 })
    session.startGame(bank)

    for (let i = 0; i < 5; i++) {
      expect(last().round?.targetRole).toBe(i % 2 === 0 ? 'host' : 'guest')
      session.submitAnswer('host', i, 'a')
      session.submitAnswer('guest', i, 'a')
      await flush()
      session.nextRound()
    }
    expect(last().phase).toBe('finished')
    expect(last().history).toHaveLength(5)
  })

  test('rejects new guests mid-game but lets the original guest rejoin', () => {
    const { session } = setup()
    session.handleJoin('Budi', 't1')
    session.startGame(bank)
    session.setGuestConnected(false)
    expect(session.handleJoin('Caca', 't2')).toBe('GAME_IN_PROGRESS')
    expect(session.handleJoin('Budi', 't1')).toBe(true)
    expect(session.state.players.guest?.connected).toBe(true)
  })
})
