<script setup lang="ts">
import { computed } from 'vue'
import type { RoundState } from '@/types/game.types'
import { CATEGORY_LABELS } from '@/game/game-rules.utils'

const props = defineProps<{ round: RoundState; totalRounds: number; iAmTarget: boolean; targetName: string }>()

interface TextSegment {
  text: string
  isTarget: boolean
}

const segments = computed<TextSegment[]>(() => {
  const text = props.round.questionText
  const name = props.targetName.trim()
  if (!name) return [{ text, isTarget: false }]

  const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.filter(Boolean).map((part) => ({
    text: part,
    isTarget: part.toLowerCase() === name.toLowerCase(),
  }))
})
</script>

<template>
  <section class="card relative overflow-hidden text-center" data-testid="question-prompt">
    <div class="mb-5 flex flex-wrap items-center justify-center gap-2">
      <span class="chip bg-ink text-cream" data-testid="question-prompt-round">Ronde {{ round.index + 1 }}/{{ totalRounds }}</span>
      <span class="chip bg-lavender/10 text-lavender" data-testid="question-prompt-category">{{ CATEGORY_LABELS[round.category] }}</span>
    </div>
    <h1 :key="round.index" class="text-2xl font-bold leading-relaxed text-balance sm:text-3xl animate-pop-in" data-testid="question-prompt-text">
      <template v-for="(seg, i) in segments" :key="i">
        <span
          v-if="seg.isTarget"
          class="inline-block rounded-xl bg-tangerine/15 px-2.5 py-0.5 text-tangerine font-extrabold underline decoration-tangerine/40 decoration-wavy underline-offset-4 shadow-2xs"
          data-testid="question-prompt-target-accent"
        >
          {{ seg.text }}
        </span>
        <template v-else>{{ seg.text }}</template>
      </template>
    </h1>
    <p
      class="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
      :class="iAmTarget ? 'bg-peach/60 text-[#b4441f]' : 'bg-lavender/10 text-lavender'"
      data-testid="question-prompt-role"
    >
      <template v-if="iAmTarget">🙋 Ini tentang kamu — jawab sejujurnya!</template>
      <template v-else>🔮 Tebak jawaban <strong class="font-bold underline decoration-lavender/50">{{ targetName }}</strong>!</template>
    </p>
  </section>
</template>
