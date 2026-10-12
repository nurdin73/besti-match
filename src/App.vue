<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import type { GamePhase } from '@/types/game.types'
import SoundToggle from '@/components/common/SoundToggle.vue'
import ConnectionBanner from '@/components/common/ConnectionBanner.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import logoImg from '@/assets/logo.webp'

const game = useGameStore()
const router = useRouter()
const showLeaveConfirm = ref(false)

const ROUTE_FOR_PHASE: Record<GamePhase, string> = {
  lobby: '/',
  answering: '/game',
  evaluating: '/game',
  reveal: '/game',
  finished: '/result',
}

const isMidGame = computed(() => {
  const phase = game.state?.phase
  return phase === 'answering' || phase === 'evaluating' || phase === 'reveal'
})

function handleConfirmLeave(): void {
  showLeaveConfirm.value = false
  game.abortGame('Pemain keluar dari ruangan.')
}

watch(
  () => game.state?.phase,
  (phase) => {
    const target = phase ? ROUTE_FOR_PHASE[phase] : '/'
    if (router.currentRoute.value.path !== target) void router.replace(target)
  },
)

onMounted(() => game.resumeSession())
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden" data-testid="app-shell">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-0">
      <div class="absolute -left-24 -top-24 size-72 rounded-full bg-peach/60 blur-3xl" />
      <div class="absolute -right-20 top-1/3 size-80 rounded-full bg-lavender/15 blur-3xl" />
      <div class="absolute -bottom-24 left-1/4 size-72 rounded-full bg-bubblegum/10 blur-3xl" />
      <span class="absolute left-[8%] top-[22%] animate-float text-4xl opacity-60">💛</span>
      <span class="absolute right-[10%] top-[14%] animate-float text-3xl opacity-50 [animation-delay:-2s]">✨</span>
      <span class="absolute bottom-[12%] right-[16%] animate-float text-4xl opacity-50 [animation-delay:-4s]">💬</span>
    </div>

    <header class="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-5 py-5" data-testid="app-header">
      <div class="flex items-center gap-2" data-testid="app-header-logo">
        <img
          :src="logoImg"
          alt="Bestie Match Logo"
          class="size-10 rounded-2xl object-cover shadow-[0_3px_0_0_#d9502f]"
          data-testid="app-logo-image"
        />
        <span class="font-display text-xl font-bold tracking-tight">Bestie<span class="text-tangerine">Match</span></span>
      </div>

      <div class="flex items-center gap-3">
        <button
          v-if="game.state && !isMidGame"
          type="button"
          class="rounded-2xl border-2 border-line bg-white/80 px-3.5 py-2 font-fun text-sm font-semibold text-stone-600 transition hover:-translate-y-0.5 hover:border-miss hover:text-miss active:translate-y-0 shadow-xs"
          data-testid="header-leave-button"
          @click="showLeaveConfirm = true"
        >
          🚪 Keluar
        </button>
        <SoundToggle />
      </div>
    </header>

    <ConnectionBanner />

    <main class="relative z-10 mx-auto max-w-3xl px-5 pb-16">
      <div
        v-if="game.notice"
        class="card mb-5 flex items-center justify-between gap-3 border-miss/30 bg-miss/5 py-4 animate-pop-in"
        data-testid="app-notice-toast"
        role="alert"
      >
        <p class="font-medium text-miss">{{ game.notice }}</p>
        <button class="font-fun text-sm text-stone-500 hover:text-ink" data-testid="app-notice-dismiss" @click="game.dismissNotice()">Tutup</button>
      </div>

      <RouterView v-slot="{ Component }">
        <Transition mode="out-in" enter-active-class="animate-pop-in" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <ConfirmDialog
      :open="showLeaveConfirm"
      title="Keluar dari Ruangan?"
      description="Apakah kamu yakin ingin keluar dari ruangan ini?"
      confirm-text="Ya, Keluar"
      cancel-text="Batal"
      :danger="true"
      @confirm="handleConfirmLeave"
      @cancel="showLeaveConfirm = false"
    />
  </div>
</template>
