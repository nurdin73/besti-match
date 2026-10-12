import { describe, expect, test } from 'bun:test'
import {
  areTokensEquivalent,
  calibrateCosine,
  combineWithSemantic,
  levenshteinRatio,
  lexicalVerdict,
  normalizeAnswer,
  overlapCoefficient,
} from './matcher.utils'

describe('normalizeAnswer', () => {
  test('lowercases, strips punctuation/accents, collapses spaces', () => {
    expect(normalizeAnswer('  Mangga   ARUMANIS!! ')).toBe('mangga arumanis')
    expect(normalizeAnswer('Café-latte')).toBe('cafe latte')
  })
  test('separates attached demonstratives like disini and kemana', () => {
    expect(normalizeAnswer('ketinggalan disini')).toBe('ketinggalan di sini')
    expect(normalizeAnswer('mau kemana')).toBe('mau ke mana')
  })
})

describe('areTokensEquivalent', () => {
  test('matches identical tokens', () => {
    expect(areTokensEquivalent('kopi', 'kopi')).toBe(true)
  })
  test('matches attached di- prefixes with root length >= 4', () => {
    expect(areTokensEquivalent('dicelana', 'celana')).toBe(true)
    expect(areTokensEquivalent('celana', 'dicelana')).toBe(true)
    expect(areTokensEquivalent('dirumah', 'rumah')).toBe(true)
    expect(areTokensEquivalent('rumah', 'dirumah')).toBe(true)
  })
  test('does not mistakenly slice real root words like kencing or dingin', () => {
    expect(areTokensEquivalent('kencing', 'ncing')).toBe(false)
    expect(areTokensEquivalent('dingin', 'ngin')).toBe(false)
    expect(areTokensEquivalent('kelinci', 'linci')).toBe(false)
  })
})

describe('overlapCoefficient', () => {
  test('subset scores 1', () => {
    expect(overlapCoefficient(new Set(['mangga']), new Set(['mangga', 'arumanis']))).toBe(1)
  })
  test('empty set scores 0', () => expect(overlapCoefficient(new Set(), new Set(['a']))).toBe(0))
  test('scores 1 when preposition attachments match root words', () => {
    expect(overlapCoefficient(new Set(['dicelana']), new Set(['celana']))).toBe(1)
  })
})

describe('lexicalVerdict', () => {
  test('empty answer is an immediate mismatch', () => {
    expect(lexicalVerdict('', 'mangga')).toEqual({ similarity: 0, method: 'empty', isMatch: false })
  })
  test('case/punctuation differences are exact matches', () => {
    expect(lexicalVerdict('Bali!', 'bali')).toMatchObject({ method: 'exact', isMatch: true })
  })
  test('typos in long words match', () => {
    expect(lexicalVerdict('mangga', 'manga')).toMatchObject({ method: 'typo', isMatch: true })
  })
  test('short words with one different letter do not match on typo tier', () => {
    expect(lexicalVerdict('merah', 'marah').isMatch).toBeNull()
  })
  test('token containment matches, ignoring stopwords', () => {
    expect(lexicalVerdict('buah mangga yang manis', 'mangga manis')).toMatchObject({ method: 'overlap', isMatch: true })
  })
  test('unrelated answers defer to semantic tier', () => {
    expect(lexicalVerdict('rebahan', 'main game').isMatch).toBeNull()
  })
  test('matches answers with attached prepositions like dicelana vs di celana', () => {
    expect(lexicalVerdict('waktu main malah kencing dicelana', 'kencing di celana')).toMatchObject({
      isMatch: true,
      method: 'overlap',
      similarity: 1,
    })
  })
})

describe('calibrateCosine', () => {
  test('rescales scores at or below baseline (0.50) to 0', () => {
    expect(calibrateCosine(0.50)).toBe(0)
    expect(calibrateCosine(0.40)).toBe(0)
  })
  test('reduces false positive similarity (e.g. raw 0.65 -> 0.30)', () => {
    expect(calibrateCosine(0.65)).toBeCloseTo(0.30, 2)
  })
  test('preserves high true similarity (e.g. raw 0.85 -> 0.70)', () => {
    expect(calibrateCosine(0.85)).toBeCloseTo(0.70, 2)
  })
  test('exact raw 1.0 remains 1.0', () => {
    expect(calibrateCosine(1.0)).toBe(1.0)
  })
})

describe('combineWithSemantic', () => {
  test('rejects false-positive raw scores like 0.65 against threshold 0.60', () => {
    // Calibrated score for 0.65 is 0.30, which is below 0.60 -> mismatch!
    const verdict = combineWithSemantic(0, 0.65, 0.60)
    expect(verdict.isMatch).toBe(false)
    expect(verdict.similarity).toBeCloseTo(0.30, 2)
  })

  test('accepts genuine strong synonyms with raw score >= 0.85', () => {
    // Calibrated score for 0.85 is 0.70 >= 0.65 -> match!
    const verdict = combineWithSemantic(0.2, 0.85, 0.65)
    expect(verdict.isMatch).toBe(true)
    expect(verdict.method).toBe('semantic')
    expect(verdict.similarity).toBeCloseTo(0.70, 2)
  })

  test('falls back to mismatch when the model is unavailable', () => {
    expect(combineWithSemantic(0.4, null, 0.7)).toMatchObject({ isMatch: false, similarity: 0.4 })
  })
})
