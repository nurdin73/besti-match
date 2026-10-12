<script setup lang="ts">
import { computed } from 'vue'
import type { GameSummary } from '@/types/game.types'

const props = defineProps<{ summary: GameSummary }>()

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashOffset = computed(() => CIRCUMFERENCE * (1 - props.summary.compatibility / 100))
</script>

<template>
  <section class="card flex flex-col items-center gap-4 bg-linear-to-b from-white to-peach/30 py-10 text-center" data-testid="bestie-score-summary">
    <p class="font-fun text-sm font-semibold uppercase tracking-widest text-stone-500">Bestie Match Meter</p>
    <div class="relative grid size-48 place-items-center">
      <svg class="absolute inset-0 -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
        <defs>
          <linearGradient id="meter-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#ff6b4a" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" :r="RADIUS" fill="none" stroke="#ebe5df" stroke-width="14" />
        <circle
          cx="80" cy="80" :r="RADIUS" fill="none" stroke="url(#meter-gradient)" stroke-width="14" stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE" :stroke-dashoffset="dashOffset"
          class="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span class="font-fun text-5xl font-semibold" data-testid="bestie-score-percent">{{ summary.compatibility }}%</span>
    </div>
    <h1 class="text-3xl font-bold animate-pop-in" data-testid="bestie-score-title">{{ summary.title }}</h1>
    <p class="text-stone-600" data-testid="bestie-score-matches">{{ summary.matches }} dari {{ summary.totalRounds }} jawaban cocok</p>
  </section>
</template>
