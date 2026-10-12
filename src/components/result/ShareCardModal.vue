<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameSummary } from '@/types/game.types'
import { copyShareTextToClipboard, downloadBlob, exportResultCardBlob, shareResultCard } from '@/utils/share-card.utils'

const props = defineProps<{
  open: boolean
  summary: GameSummary
  roomCode?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const previewUrl = ref<string | null>(null)
const cachedBlob = ref<Blob | null>(null)
const isGenerating = ref(false)
const isSharing = ref(false)
const shareSuccessNotice = ref<string | null>(null)

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.origin
})

const canNativeShare = computed(() => {
  return typeof navigator !== 'undefined' && 'canShare' in navigator
})

async function generatePreview(): Promise<void> {
  if (cachedBlob.value && previewUrl.value) return
  isGenerating.value = true
  try {
    const blob = await exportResultCardBlob(props.summary, props.roomCode)
    cachedBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    console.error('Failed to generate result card preview:', err)
  } finally {
    isGenerating.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void generatePreview()
    } else {
      shareSuccessNotice.value = null
    }
  },
  { immediate: true },
)

function handleDownload(): void {
  if (!cachedBlob.value) return
  downloadBlob(cachedBlob.value, `bestie-match-${props.summary.compatibility}persen.png`)
  shareSuccessNotice.value = 'Gambar berhasil diunduh!'
  setTimeout(() => {
    shareSuccessNotice.value = null
  }, 3000)
}

async function handleCopyText(): Promise<void> {
  const copied = await copyShareTextToClipboard(props.summary, shareUrl.value)
  if (copied) {
    shareSuccessNotice.value = 'Teks & link berhasil disalin ke clipboard!'
    setTimeout(() => {
      shareSuccessNotice.value = null
    }, 3000)
  }
}

async function handleShare(): Promise<void> {
  if (!cachedBlob.value) return
  isSharing.value = true
  try {
    const shared = await shareResultCard(
      cachedBlob.value,
      `Hasil BestieMatch: ${props.summary.title}`,
      `Tingkat kecocokan kami ${props.summary.compatibility}% (${props.summary.matches}/${props.summary.totalRounds} cocok)!`,
      shareUrl.value,
    )
    if (!shared) {
      // Fallback to download if user cancelled or share failed
      handleDownload()
    } else {
      shareSuccessNotice.value = 'Berhasil dibagikan!'
      setTimeout(() => {
        shareSuccessNotice.value = null
      }, 3000)
    }
  } finally {
    isSharing.value = false
  }
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-stone-900/60"
      data-testid="share-card-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
    >
      <div
        class="card flex max-h-[92vh] w-full max-w-md flex-col items-center gap-4 p-5 shadow-2xl animate-pop-in overflow-y-auto"
        data-testid="share-card-modal-content"
      >
        <div class="flex w-full items-center justify-between">
          <h2 id="share-card-title" class="font-display text-xl font-bold">
            Kartu Hasil BestieMatch
          </h2>
          <button
            type="button"
            class="text-stone-400 hover:text-ink text-xl p-1"
            data-testid="share-card-close-button"
            aria-label="Tutup"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <div
          v-if="isGenerating"
          class="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-cream text-stone-500"
          data-testid="share-card-loading"
        >
          <span class="text-4xl animate-wiggle">🎨</span>
          <p class="font-fun text-sm font-semibold">Membuat kartu aesthetic…</p>
        </div>

        <div
          v-else-if="previewUrl"
          class="flex w-full justify-center overflow-hidden rounded-2xl border-2 border-line bg-cream/40 p-2"
        >
          <img
            :src="previewUrl"
            alt="Pratinjau Kartu Hasil BestieMatch"
            class="max-h-[50vh] w-auto rounded-xl object-contain shadow-md"
            data-testid="share-card-preview-image"
          />
        </div>

        <p
          v-if="shareSuccessNotice"
          class="font-fun text-xs font-semibold text-match animate-pop-in"
          data-testid="share-card-notice"
        >
          ✨ {{ shareSuccessNotice }}
        </p>

        <div class="flex w-full flex-col gap-2 pt-1">
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-primary flex-1 py-3 text-base"
              :disabled="isGenerating"
              data-testid="share-card-download-button"
              @click="handleDownload"
            >
              📥 Unduh Gambar
            </button>

            <button
              v-if="canNativeShare"
              type="button"
              class="btn-ghost flex-1 border-2 border-lavender py-3 text-base text-lavender hover:bg-lavender/10"
              :disabled="isGenerating || isSharing"
              data-testid="share-card-share-button"
              @click="handleShare"
            >
              📱 Bagikan
            </button>
          </div>

          <button
            type="button"
            class="btn-ghost flex items-center justify-center gap-1.5 w-full py-2.5 font-fun text-sm font-semibold border-2 border-line hover:border-tangerine hover:text-tangerine transition"
            data-testid="share-card-copy-button"
            @click="handleCopyText"
          >
            <span>📋</span>
            <span>Salin Teks Ringkasan & Tautan</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
