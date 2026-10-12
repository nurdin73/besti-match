import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

// Configure Transformers.js for client-side browser caching and remote HuggingFace Hub loading
env.allowLocalModels = false
env.useBrowserCache = true

export const MULTILINGUAL_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'

export interface ProgressCallbackInfo {
  status: string
  name?: string
  file?: string
  progress?: number
  loaded?: number
  total?: number
}

export type ProgressListener = (info: ProgressCallbackInfo) => void

let embedderPromise: Promise<FeatureExtractionPipeline | null> | null = null
const progressListeners = new Set<ProgressListener>()

/**
 * Register a listener for model download progress.
 */
export function onModelProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener)
  return () => progressListeners.delete(listener)
}

function broadcastProgress(info: ProgressCallbackInfo): void {
  for (const listener of progressListeners) {
    try {
      listener(info)
    } catch (e: unknown) {
      console.warn('[semantic-embedder] Progress listener error:', e)
    }
  }
}

/**
 * Lazily loads the multilingual transformer pipeline once per tab.
 * Resolves to `null` on failure (offline, CDN blocked) so the game degrades
 * gracefully to lexical matching.
 */
export function loadEmbedder(onProgress?: ProgressListener): Promise<FeatureExtractionPipeline | null> {
  if (onProgress) {
    progressListeners.add(onProgress)
  }

  if (embedderPromise) return embedderPromise

  broadcastProgress({ status: 'initiate', file: 'Initializing AI model pipeline...' })

  embedderPromise = pipeline('feature-extraction', MULTILINGUAL_MODEL_ID, {
    progress_callback: (progressData: unknown) => {
      const data = progressData as ProgressCallbackInfo
      broadcastProgress(data)
    },
  })
    .then((instance) => {
      broadcastProgress({ status: 'ready' })
      return instance as FeatureExtractionPipeline
    })
    .catch((error: unknown) => {
      console.warn('[bestie-match] Multilingual model unavailable, using lexical matching only.', error)
      broadcastProgress({ status: 'error' })
      embedderPromise = null // Allow retry
      return null
    })

  return embedderPromise
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (!a.length || !b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const valA = a[i]!
    const valB = b[i]!
    dot += valA * valB
    normA += valA * valA
    normB += valB * valB
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

/**
 * Extracts normalized vector embeddings and computes semantic similarity.
 */
export async function semanticSimilarity(a: string, b: string): Promise<number | null> {
  const trimmedA = a.trim()
  const trimmedB = b.trim()
  if (!trimmedA || !trimmedB) return null

  const extractor = await loadEmbedder()
  if (!extractor) return null

  try {
    const outA = await extractor(trimmedA, { pooling: 'mean', normalize: true })
    const outB = await extractor(trimmedB, { pooling: 'mean', normalize: true })

    const vecA = outA.data as ArrayLike<number>
    const vecB = outB.data as ArrayLike<number>

    return cosineSimilarity(vecA, vecB)
  } catch (err: unknown) {
    console.warn('[bestie-match] Error during semantic embedding extraction:', err)
    return null
  }
}
