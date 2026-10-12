<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioSfx } from '@/composables/useAudioSfx'
import BestieScoreSummary from '@/components/result/BestieScoreSummary.vue'
import PlayerBreakdownCard from '@/components/result/PlayerBreakdownCard.vue'
import ShareCardModal from '@/components/result/ShareCardModal.vue'

const game = useGameStore()
const { play } = useAudioSfx()
const showShareModal = ref(false)

onMounted(() => game.summary && play('victory'))
</script>

<template>
  <section v-if="game.summary && game.state" class="flex flex-col gap-5" data-testid="result-view">
    <BestieScoreSummary :summary="game.summary" />
    <PlayerBreakdownCard :players="game.summary.players" :history="game.state.history" :names="game.state.players" />

    <div class="flex justify-center">
      <button
        type="button"
        class="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 text-lg font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition"
        data-testid="result-view-open-share"
        @click="showShareModal = true"
      >
        <span>📸</span>
        <span>Simpan & Bagikan Kartu Hasil</span>
      </button>
    </div>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button class="btn-ghost" data-testid="result-view-leave" @click="game.leave()">Keluar</button>
      <button v-if="game.isHost" class="btn-primary text-lg" data-testid="result-view-play-again" @click="game.backToLobby()">🔁 Main Lagi</button>
      <p v-else class="self-center font-fun text-stone-500" data-testid="result-view-waiting">Host bisa memulai ronde baru.</p>
    </div>

    <ShareCardModal
      :open="showShareModal"
      :summary="game.summary"
      :room-code="game.state.roomCode"
      @close="showShareModal = false"
    />
  </section>
</template>
