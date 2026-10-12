<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const game = useGameStore()

const isProblematic = computed(() => {
  if (game.status === 'error' || game.status === 'reconnecting') return true
  const guest = game.state?.players.guest
  if (game.isHost && game.state?.phase !== 'lobby' && guest && !guest.connected) return true
  return false
})

const message = computed(() => {
  if (game.status === 'error') return 'Koneksi gagal tersambung.'
  if (game.status === 'reconnecting') return 'Koneksi terputus, mencoba menyambung ulang…'
  const guest = game.state?.players.guest
  if (game.isHost && game.state?.phase !== 'lobby' && guest && !guest.connected) {
    return `${guest.name} terputus. Menunggu dia kembali…`
  }
  return null
})
</script>

<template>
  <Transition enter-active-class="animate-pop-in" leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0">
    <div v-if="isProblematic && message" class="relative z-20 mx-auto mb-4 max-w-3xl px-5" data-testid="connection-banner">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-ink p-4 text-cream shadow-lg" role="status">
        <p class="flex items-center gap-2 text-sm font-medium">
          <span class="size-2.5 shrink-0 animate-ping rounded-full bg-tangerine" />
          {{ message }}
        </p>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="game.status === 'reconnecting' || game.status === 'error'"
            type="button"
            class="rounded-xl bg-tangerine px-3 py-1.5 font-fun text-xs font-semibold text-white transition hover:brightness-110 active:translate-y-0.5"
            data-testid="connection-banner-retry"
            @click="game.retryConnection()"
          >
            🔄 Hubungkan Ulang
          </button>
          <button
            type="button"
            class="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-fun text-xs font-semibold text-cream transition hover:bg-white/20 active:translate-y-0.5"
            data-testid="connection-banner-leave"
            @click="game.abortGame('Keluar saat koneksi terputus')"
          >
            🚪 Keluar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
