<script setup lang="ts">
import type { RoundState } from '@/types/game.types'
import { CATEGORY_LABELS } from '@/game/game-rules.utils'

defineProps<{ round: RoundState; totalRounds: number; iAmTarget: boolean; targetName: string }>()
</script>

<template>
  <section class="card relative overflow-hidden text-center" data-testid="question-prompt">
    <div class="mb-5 flex flex-wrap items-center justify-center gap-2">
      <span class="chip bg-ink text-cream" data-testid="question-prompt-round">Ronde {{ round.index + 1 }}/{{ totalRounds }}</span>
      <span class="chip bg-lavender/10 text-lavender" data-testid="question-prompt-category">{{ CATEGORY_LABELS[round.category] }}</span>
    </div>
    <h1 :key="round.index" class="text-2xl font-bold leading-snug text-balance sm:text-3xl animate-pop-in" data-testid="question-prompt-text">
      {{ round.questionText }}
    </h1>
    <p
      class="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
      :class="iAmTarget ? 'bg-peach/60 text-[#b4441f]' : 'bg-lavender/10 text-lavender'"
      data-testid="question-prompt-role"
    >
      <template v-if="iAmTarget">🙋 Ini tentang kamu — jawab sejujurnya!</template>
      <template v-else>🔮 Tebak jawaban {{ targetName }}!</template>
    </p>
  </section>
</template>
