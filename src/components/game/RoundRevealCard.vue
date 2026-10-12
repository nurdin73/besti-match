<script setup lang="ts">
import { computed } from 'vue'
import type { MatchMethod, RoundResult } from '@/types/game.types'

const props = defineProps<{
  result: RoundResult
  targetName: string
  guesserName: string
  iAmTarget: boolean
  isHost: boolean
  isLastRound: boolean
}>()
const emit = defineEmits<{ override: []; next: [] }>()

const METHOD_LABELS: Record<MatchMethod, string> = {
  exact: 'Sama persis',
  typo: 'Beda tipis (typo)',
  overlap: 'Kata kuncinya sama',
  semantic: 'Dinilai AI (makna)',
  empty: 'Ada yang tidak menjawab',
}

const percent = computed(() => Math.round(props.result.similarity * 100))
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="round-reveal-card">
    <div class="grid gap-4 sm:grid-cols-2">
      <article class="card animate-flip-in border-tangerine/30" data-testid="round-reveal-target-answer">
        <p class="font-fun text-sm font-semibold text-tangerine">Jawaban asli {{ targetName }}</p>
        <p class="mt-2 font-display text-2xl font-bold break-words">{{ result.targetAnswer || '—' }}</p>
      </article>
      <article class="card animate-flip-in border-lavender/30 [animation-delay:250ms]" data-testid="round-reveal-guess-answer">
        <p class="font-fun text-sm font-semibold text-lavender">Tebakan {{ guesserName }}</p>
        <p class="mt-2 font-display text-2xl font-bold break-words">{{ result.guessAnswer || '—' }}</p>
      </article>
    </div>

    <div
      class="card flex flex-col items-center gap-3 text-center animate-pop-in [animation-delay:550ms]"
      :class="result.isMatch ? 'border-match/40 bg-match/5' : 'border-miss/30 bg-miss/5'"
      data-testid="round-reveal-verdict"
    >
      <span class="text-5xl" :class="result.isMatch ? 'animate-float' : 'animate-wiggle'">{{ result.isMatch ? '🎉' : '😵' }}</span>
      <p class="font-display text-3xl font-bold" :class="result.isMatch ? 'text-match' : 'text-miss'" data-testid="round-reveal-verdict-text">
        {{ result.isMatch ? 'COCOK!' : 'MELESET!' }}
      </p>
      <div class="w-full max-w-xs">
        <div class="h-3 overflow-hidden rounded-full bg-line">
          <div class="h-full rounded-full bg-linear-to-r from-lavender to-bubblegum transition-[width] duration-700" :style="{ width: `${percent}%` }" />
        </div>
        <p class="mt-2 font-fun text-sm text-stone-500" data-testid="round-reveal-similarity">
          Kemiripan {{ percent }}% · {{ METHOD_LABELS[result.method] }}<template v-if="result.overridden"> · diubah oleh {{ targetName }}</template>
        </p>
      </div>
      <button v-if="iAmTarget" class="btn-ghost text-sm" data-testid="round-reveal-override" @click="emit('override')">
        {{ result.isMatch ? '🙅 Sebenarnya beda' : '🙌 Cocok kok!' }}
      </button>
      <p v-else class="text-xs text-stone-400">AI salah nilai? {{ targetName }} bisa mengoreksinya.</p>
    </div>

    <button v-if="isHost" class="btn-primary text-lg" data-testid="round-reveal-next" @click="emit('next')">
      {{ isLastRound ? '🏁 Lihat Hasil Akhir' : 'Ronde Berikutnya →' }}
    </button>
    <p v-else class="text-center font-fun text-stone-500" data-testid="round-reveal-waiting">Menunggu host lanjut…</p>
  </section>
</template>
