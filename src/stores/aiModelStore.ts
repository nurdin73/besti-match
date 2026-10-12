import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { loadEmbedder, type ProgressCallbackInfo } from '@/services/semantic-embedder'

export type ModelLoadStatus = 'idle' | 'downloading' | 'ready' | 'error'

const ESTIMATED_TOTAL_BYTES = 118 * 1024 * 1024 // ~118 MB for paraphrase-multilingual-MiniLM-L12-v2

export const useAiModelStore = defineStore('aiModel', () => {
  const status = ref<ModelLoadStatus>('idle')
  const progress = ref(0) // 0 - 100
  const loadedBytes = ref(0)
  const totalBytes = ref(ESTIMATED_TOTAL_BYTES)
  const currentFile = ref('')
  const error = ref<string | null>(null)

  // Track progress per individual asset file downloaded by Transformers.js
  const fileProgressMap = new Map<string, { loaded: number; total: number }>()

  const isReady = computed(() => status.value === 'ready')
  const isDownloading = computed(() => status.value === 'downloading')
  const isError = computed(() => status.value === 'error')

  const formattedLoaded = computed(() => {
    const mb = loadedBytes.value / (1024 * 1024)
    return mb.toFixed(1)
  })

  const formattedTotal = computed(() => {
    const mb = totalBytes.value / (1024 * 1024)
    return mb.toFixed(0)
  })

  function handleProgress(info: ProgressCallbackInfo): void {
    if (info.status === 'initiate') {
      status.value = 'downloading'
      if (info.file) currentFile.value = info.file
    } else if (info.status === 'progress') {
      status.value = 'downloading'
      if (info.file) {
        currentFile.value = info.file
        fileProgressMap.set(info.file, {
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        })
      }

      // Aggregate loaded across all tracked files
      let totalLoaded = 0
      let maxKnownTotal = ESTIMATED_TOTAL_BYTES
      for (const item of fileProgressMap.values()) {
        totalLoaded += item.loaded
        if (item.total > 0 && item.total > maxKnownTotal) {
          maxKnownTotal = item.total
        }
      }

      loadedBytes.value = totalLoaded
      totalBytes.value = Math.max(maxKnownTotal, totalLoaded)
      const calculatedPct = Math.min(99, Math.round((totalLoaded / totalBytes.value) * 100))
      progress.value = Math.max(progress.value, calculatedPct)
    } else if (info.status === 'done') {
      if (info.file && fileProgressMap.has(info.file)) {
        const item = fileProgressMap.get(info.file)!
        if (item.total > 0) item.loaded = item.total
      }
    } else if (info.status === 'ready') {
      status.value = 'ready'
      progress.value = 100
      loadedBytes.value = totalBytes.value
      error.value = null
    }
  }

  async function init(): Promise<void> {
    if (status.value === 'ready' || status.value === 'downloading') return
    status.value = 'downloading'
    error.value = null
    try {
      const pipelineInstance = await loadEmbedder(handleProgress)
      if (pipelineInstance) {
        status.value = 'ready'
        progress.value = 100
      } else {
        status.value = 'error'
        error.value = 'Gagal memuat model. Game akan menggunakan pencocokan kata dasar.'
      }
    } catch (err: unknown) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Terjadi kendala saat mengunduh model AI.'
    }
  }

  function retry(): void {
    status.value = 'idle'
    fileProgressMap.clear()
    progress.value = 0
    loadedBytes.value = 0
    void init()
  }

  return {
    status,
    progress,
    loadedBytes,
    totalBytes,
    currentFile,
    error,
    isReady,
    isDownloading,
    isError,
    formattedLoaded,
    formattedTotal,
    init,
    retry,
  }
})
