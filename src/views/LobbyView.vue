<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import EntryCard from '@/components/lobby/EntryCard.vue'
import RoomShareCard from '@/components/lobby/RoomShareCard.vue'
import PlayerReadyList from '@/components/lobby/PlayerReadyList.vue'
import HostSetupCard from '@/components/lobby/HostSetupCard.vue'
import ModelDownloadBanner from '@/components/common/ModelDownloadBanner.vue'

const game = useGameStore()
</script>

<template>
  <EntryCard v-if="!game.role" @create="game.createRoom" @join="game.joinRoom" />

  <section v-else-if="!game.state" class="card flex flex-col items-center gap-4 py-12 text-center" data-testid="lobby-connecting">
    <span class="text-5xl animate-wiggle">📡</span>
    <h1 class="text-2xl font-bold">Menyambung ke ruangan…</h1>
    <p class="text-stone-500">Pastikan host masih membuka halaman game-nya.</p>
    <button class="btn-ghost" data-testid="lobby-connecting-cancel" @click="game.leave()">Batal</button>
  </section>

  <section v-else class="flex flex-col gap-5" data-testid="lobby-room">
    <h1 class="sr-only">Ruang tunggu Bestie Match</h1>
    <RoomShareCard v-if="game.isHost" :room-code="game.state.roomCode" />
    <ModelDownloadBanner v-if="game.isHost" :is-host="true" />
    <PlayerReadyList :players="game.state.players" :my-role="game.role" />
    <HostSetupCard
      :settings="game.state.settings"
      :editable="game.isHost"
      @update="game.updateSettings"
      @add-question="game.addCustomQuestion"
      @remove-question="game.removeCustomQuestion"
    />

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button class="btn-ghost" data-testid="lobby-room-leave" @click="game.leave()">Keluar</button>
      <button v-if="game.isHost" class="btn-primary text-lg" :disabled="!game.canStart" data-testid="lobby-room-start" @click="game.startGame()">
        🚀 Mulai Game
      </button>
      <p v-else class="self-center font-fun text-stone-500" data-testid="lobby-room-waiting">Menunggu host memulai game…</p>
    </div>
  </section>
</template>
