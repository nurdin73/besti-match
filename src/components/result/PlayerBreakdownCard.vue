<script setup lang="ts">
import type { PlayerBreakdown, Player, Role, RoundState } from '@/types/game.types'

defineProps<{ players: PlayerBreakdown[]; history: RoundState[]; names: Record<Role, Player | null> }>()

const TINT: Record<Role, string> = { host: 'bg-tangerine', guest: 'bg-lavender' }
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="player-breakdown-card">
    <div class="grid grid-cols-2 gap-4">
      <article v-for="p in players" :key="p.role" class="card flex flex-col items-center gap-2 p-5 text-center" :data-testid="`player-breakdown-${p.role}`">
        <span class="grid size-12 place-items-center rounded-full font-display text-xl font-bold text-white" :class="TINT[p.role]">{{ p.name.charAt(0).toUpperCase() }}</span>
        <p class="font-display font-bold">{{ p.name }}</p>
        <p class="font-fun text-3xl font-semibold">{{ p.correctGuesses }}<span class="text-lg text-stone-400">/{{ p.guessAttempts }}</span></p>
        <p class="text-xs text-stone-500">tebakan benar</p>
      </article>
    </div>

    <details class="card p-0" data-testid="player-breakdown-history">
      <summary class="cursor-pointer list-none px-6 py-4 font-display font-bold">📜 Rekap per ronde</summary>
      <ol class="flex flex-col divide-y divide-line border-t border-line">
        <li v-for="r in history" :key="r.index" class="flex items-start gap-3 px-6 py-3 text-sm" :data-testid="`player-breakdown-round-${r.index}`">
          <span class="mt-0.5 text-lg">{{ r.result?.isMatch ? '✅' : '❌' }}</span>
          <div class="flex-1">
            <p class="font-medium">{{ r.questionText }}</p>
            <p class="text-stone-500">
              {{ names[r.targetRole]?.name }}: <b class="text-ink">{{ r.result?.targetAnswer || '—' }}</b> ·
              tebakan: <b class="text-ink">{{ r.result?.guessAnswer || '—' }}</b>
            </p>
          </div>
        </li>
      </ol>
    </details>
  </section>
</template>
