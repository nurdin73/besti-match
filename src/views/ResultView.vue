<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioSfx } from '@/composables/useAudioSfx'
import BestieScoreSummary from '@/components/result/BestieScoreSummary.vue'
import PlayerBreakdownCard from '@/components/result/PlayerBreakdownCard.vue'

const game = useGameStore()
const { play } = useAudioSfx()

onMounted(() => game.summary && play('victory'))
</script>

<template>
  <section v-if="game.summary && game.state" class="flex flex-col gap-5" data-testid="result-view">
    <BestieScoreSummary :summary="game.summary" />
    <PlayerBreakdownCard :players="game.summary.players" :history="game.state.history" :names="game.state.players" />

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button class="btn-ghost" data-testid="result-view-leave" @click="game.leave()">Keluar</button>
      <button v-if="game.isHost" class="btn-primary text-lg" data-testid="result-view-play-again" @click="game.backToLobby()">🔁 Main Lagi</button>
      <p v-else class="self-center font-fun text-stone-500" data-testid="result-view-waiting">Host bisa memulai ronde baru.</p>
    </div>
  </section>
</template>
