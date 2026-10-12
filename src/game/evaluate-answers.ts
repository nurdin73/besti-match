import type { MatchVerdict } from '@/types/game.types'
import { semanticSimilarity } from '@/services/semantic-embedder'
import { combineWithSemantic, lexicalVerdict, normalizeAnswer } from './matcher.utils'

/** Hybrid pipeline: cheap lexical tiers first, MediaPipe only when they are inconclusive. */
export async function evaluateAnswers(target: string, guess: string, threshold: number): Promise<MatchVerdict> {
  const lexical = lexicalVerdict(target, guess)
  if (lexical.isMatch !== null) return lexical
  const cosine = await semanticSimilarity(normalizeAnswer(target), normalizeAnswer(guess))
  return combineWithSemantic(lexical.similarity, cosine, threshold)
}
