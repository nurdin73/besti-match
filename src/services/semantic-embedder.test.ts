import { describe, expect, test } from 'bun:test'
import { cosineSimilarity, onModelProgress } from './semantic-embedder'

describe('cosineSimilarity', () => {
  test('returns 1 for identical vectors', () => {
    const a = [1, 0, 0]
    const b = [1, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })

  test('returns 0 for orthogonal vectors', () => {
    const a = [1, 0]
    const b = [0, 1]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  test('returns correct cosine for known angles', () => {
    const a = [1, 1]
    const b = [1, 0]
    // cos(45 deg) = 1 / sqrt(2) ≈ 0.7071
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.7071, 4)
  })

  test('handles empty vectors safely', () => {
    expect(cosineSimilarity([], [])).toBe(0)
    expect(cosineSimilarity([1], [])).toBe(0)
  })
})

describe('onModelProgress', () => {
  test('registers and unregisters listener cleanly', () => {
    let called = false
    const unsubscribe = onModelProgress(() => {
      called = true
    })
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    expect(called).toBe(false)
  })
})
