import type { MatchVerdict } from '@/types/game.types'

const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'itu', 'ini', 'sih', 'aja', 'saja', 'deh', 'dong', 'kok',
  'nya', 'si', 'sama', 'atau', 'juga', 'lah', 'kah', 'the', 'a', 'an', 'of', 'and',
])

export const OVERLAP_MATCH_THRESHOLD = 0.8
export const TYPO_MATCH_THRESHOLD = 0.8
/** Short words differ meaningfully by one letter (merah/marah), so typo tolerance needs length. */
export const TYPO_MIN_LENGTH = 6

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(di|ke)(sini|sana|mana)\b/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

export function contentTokens(normalized: string): Set<string> {
  const tokens = normalized.split(' ').filter((t) => t && !STOPWORDS.has(t))
  return new Set(tokens.length ? tokens : normalized.split(' ').filter(Boolean))
}

function isPrepositionAttachment(prefixed: string, root: string): boolean {
  if (!prefixed.startsWith('di') || prefixed.length < 6) return false
  const remainder = prefixed.slice(2)
  if (remainder !== root) return false
  // Root words in Indonesian do not start with internal nasal clusters like nc-, ng-, ny-
  if (/^n[cgy]/.test(remainder)) return false
  return true
}

/**
 * Checks if two tokens are equivalent, allowing common Indonesian 'di-' preposition
 * attachments (e.g. 'dicelana' vs 'celana', 'dirumah' vs 'rumah').
 */
export function areTokensEquivalent(a: string, b: string): boolean {
  if (a === b) return true
  if (isPrepositionAttachment(a, b) || isPrepositionAttachment(b, a)) return true
  return false
}

/** |A∩B| / min(|A|,|B|) — "mangga" vs "mangga arumanis" scores 1, with token equivalence. */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const token of smaller) {
    for (const other of larger) {
      if (areTokensEquivalent(token, other)) {
        shared++
        break
      }
    }
  }
  return shared / smaller.size
}

export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1
  const longest = Math.max(a.length, b.length)
  if (!longest) return 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost)
    }
    prev = curr
  }
  return 1 - prev[b.length]! / longest
}

/**
 * Cheap lexical tiers. Returns a final verdict when confident, otherwise the
 * best lexical score so the semantic tier can take over.
 */
export function lexicalVerdict(target: string, guess: string): MatchVerdict | { similarity: number; isMatch: null } {
  const a = normalizeAnswer(target)
  const b = normalizeAnswer(guess)
  if (!a || !b) return { similarity: 0, method: 'empty', isMatch: false }
  if (a === b) return { similarity: 1, method: 'exact', isMatch: true }

  const typo = levenshteinRatio(a, b)
  const longEnough = Math.max(a.length, b.length) >= TYPO_MIN_LENGTH
  if (longEnough && typo >= TYPO_MATCH_THRESHOLD) return { similarity: typo, method: 'typo', isMatch: true }

  const overlap = overlapCoefficient(contentTokens(a), contentTokens(b))
  if (overlap >= OVERLAP_MATCH_THRESHOLD) return { similarity: overlap, method: 'overlap', isMatch: true }

  return { similarity: Math.max(typo, overlap), isMatch: null }
}

export const SEMANTIC_BASELINE = 0.50

/**
 * Rescales raw cosine similarity to counteract Universal Sentence Encoder's narrow-cone anisotropy
 * (where random unrelated nouns often share a baseline cosine of 0.50-0.65).
 * Scores <= baseline become 0; raw score 0.85 maps to 0.70.
 */
export function calibrateCosine(rawCosine: number, baseline: number = SEMANTIC_BASELINE): number {
  if (rawCosine <= baseline) return 0
  return Math.min(1, Math.max(0, (rawCosine - baseline) / (1 - baseline)))
}

export function combineWithSemantic(lexicalScore: number, cosine: number | null, threshold: number): MatchVerdict {
  if (cosine === null) {
    return { similarity: lexicalScore, method: 'overlap', isMatch: false }
  }
  const calibrated = calibrateCosine(cosine)
  const similarity = Math.max(lexicalScore, calibrated)
  return { similarity, method: 'semantic', isMatch: calibrated >= threshold }
}
