import { describe, expect, test } from 'bun:test'
import type { Question, RoundState } from '@/types/game.types'
import {
  CATEGORY_LABELS,
  compatibilityTitle,
  generateRoomCode,
  isValidRoomCode,
  pickQuestions,
  renderQuestion,
  summarizeGame,
  targetRoleFor,
} from './game-rules.utils'
import rawQuestions from '../../public/questions.json'

const q = (id: string, category: Question['category']): Question => ({ id, category, template: `${id} {target}`, threshold: 0.7 })

describe('room code', () => {
  test('generates valid 6-char codes', () => {
    const code = generateRoomCode()
    expect(code).toHaveLength(6)
    expect(isValidRoomCode(code)).toBe(true)
  })
  test('rejects ambiguous / malformed codes', () => {
    expect(isValidRoomCode('ABC0O1')).toBe(false)
    expect(isValidRoomCode('abcdef')).toBe(false)
  })
})

describe('turn order and templates', () => {
  test('alternates host/guest as subject', () => {
    expect([0, 1, 2, 3].map(targetRoleFor)).toEqual(['host', 'guest', 'host', 'guest'])
  })
  test('replaces every {target}', () => {
    expect(renderQuestion('{target} suka apa, {target}?', 'Budi')).toBe('Budi suka apa, Budi?')
  })
})

describe('pickQuestions', () => {
  const bank = [q('a', 'kocak'), q('b', 'deep'), q('c', 'kocak')]
  test('filters by category and puts custom questions first', () => {
    const picked = pickQuestions(bank, ['kocak'], [q('x', 'custom')], 3, () => 0)
    expect(picked[0]?.id).toBe('x')
    expect(picked.every((p) => p.category !== 'deep')).toBe(true)
  })
  test('cycles when the pool is smaller than the round count', () => {
    expect(pickQuestions(bank, ['deep'], [], 3)).toHaveLength(3)
  })
  test('returns empty when nothing is selectable', () => {
    expect(pickQuestions(bank, [], [], 5)).toEqual([])
  })
})

describe('summarizeGame', () => {
  const round = (index: number, isMatch: boolean): RoundState => ({
    index,
    questionText: '',
    category: 'kocak',
    targetRole: targetRoleFor(index),
    submitted: { host: true, guest: true },
    deadline: null,
    result: { targetAnswer: 'a', guessAnswer: 'b', similarity: 1, method: 'exact', isMatch, overridden: false },
  })

  test('computes compatibility and per-player guessing breakdown', () => {
    const summary = summarizeGame({
      players: { host: { name: 'Ani', connected: true }, guest: { name: 'Budi', connected: true } },
      history: [round(0, true), round(1, false), round(2, true), round(3, true)],
    })
    expect(summary.compatibility).toBe(75)
    // Rounds 0 & 2 target the host -> guest guessed (2/2). Rounds 1 & 3 -> host guessed (1/2).
    expect(summary.players.find((p) => p.role === 'guest')).toMatchObject({ correctGuesses: 2, guessAttempts: 2 })
    expect(summary.players.find((p) => p.role === 'host')).toMatchObject({ correctGuesses: 1, guessAttempts: 2 })
  })

  test('titles scale with the score', () => {
    expect(compatibilityTitle(95)).toContain('Soulmate')
    expect(compatibilityTitle(10)).toContain('Kenal')
  })
})

describe('question bank integrity', () => {
  const bank = rawQuestions as Question[]

  test('contains at least 80 questions with unique ids', () => {
    expect(bank.length).toBeGreaterThanOrEqual(80)
    const ids = new Set(bank.map((item) => item.id))
    expect(ids.size).toBe(bank.length)
  })

  test('every question has valid template, category, and calibrated threshold', () => {
    for (const item of bank) {
      expect(item.template).toContain('{target}')
      expect(item.threshold).toBeGreaterThanOrEqual(0.6)
      expect(item.threshold).toBeLessThanOrEqual(0.85)
      expect(CATEGORY_LABELS[item.category]).toBeDefined()
    }
  })
})
