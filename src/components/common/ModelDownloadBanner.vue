<script setup lang="ts">
import { useAiModelStore } from '@/stores/aiModelStore'

const props = withDefaults(
  defineProps<{
    isHost?: boolean
  }>(),
  {
    isHost: false,
  },
)

const modelStore = useAiModelStore()
</script>

<template>
  <div
    v-if="modelStore.isDownloading"
    class="card border-2 border-lavender/30 bg-lavender/5 p-4 transition-all"
    data-testid="model-download-banner"
  >
    <div class="flex items-start gap-3">
      <div class="text-2xl animate-bounce" aria-hidden="true">🌐</div>
      <div class="flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-display font-bold text-ink" data-testid="model-download-title">
            Menyiapkan Otak AI Pintar...
          </h3>
          <span
            class="font-fun text-sm font-bold text-lavender"
            data-testid="model-download-percent"
          >
            {{ modelStore.progress }}%
          </span>
        </div>

        <p class="mt-1 text-xs text-stone-600" data-testid="model-download-description">
          Cuma diunduh <strong>1x saja</strong> di browser ini biar AI bisa mendeteksi kemiripan jawaban &amp; sinonim (ID/EN) otomatis. Sesi berikutnya langsung ngebut!
        </p>

        <!-- Progress Bar -->
        <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            class="h-full bg-gradient-to-r from-lavender to-tangerine transition-all duration-300 ease-out"
            :style="{ width: `${modelStore.progress}%` }"
            data-testid="model-download-progress-bar"
          />
        </div>

        <div class="mt-2 flex items-center justify-between text-xs text-stone-500">
          <span data-testid="model-download-size">
            {{ modelStore.formattedLoaded }} MB / ~{{ modelStore.formattedTotal }} MB
          </span>
          <span v-if="props.isHost" class="italic text-stone-400">
            Mau langsung main? Bisa kok! Game tetap jalan dengan pencocokan kata biasa.
          </span>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="modelStore.isReady"
    class="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800"
    data-testid="model-download-ready-badge"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm">✨</span>
      <span><strong>Otak AI Siap:</strong> Deteksi jawaban pintar aktif &amp; siap main!</span>
    </div>
    <span class="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">Tersimpan di Cache</span>
  </div>

  <div
    v-else-if="modelStore.isError"
    class="card border-2 border-amber-200 bg-amber-50/50 p-4"
    data-testid="model-download-error-banner"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs text-amber-800">
        <span>⚠️</span>
        <span>{{ modelStore.error }}</span>
      </div>
      <button
        type="button"
        class="rounded-xl border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        data-testid="model-download-retry-btn"
        @click="modelStore.retry()"
      >
        Coba Lagi
      </button>
    </div>
  </div>
</template>
