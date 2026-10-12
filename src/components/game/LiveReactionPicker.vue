<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const game = useGameStore()

const REACTION_EMOJIS = ['🤣', '💀', '🔥', '👀', '❤️', '😱'] as const
const isCooldown = ref(false)

function onPick(emoji: string): void {
  if (isCooldown.value) return
  game.sendReaction(emoji)
  isCooldown.value = true
  setTimeout(() => {
    isCooldown.value = false
  }, 350)
}
</script>

<template>
  <div
    class="flex items-center justify-center gap-1.5 rounded-full border-2 border-line bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-md transition"
    data-testid="live-reaction-picker"
  >
    <span class="mr-1 hidden font-fun text-xs font-semibold text-stone-400 sm:inline select-none">
      Reaksi:
    </span>
    <button
      v-for="emoji in REACTION_EMOJIS"
      :key="emoji"
      type="button"
      class="grid size-9 place-items-center rounded-full text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-95 disabled:opacity-50"
      :disabled="isCooldown"
      :data-testid="`reaction-btn-${emoji}`"
      :aria-label="`Kirim reaksi ${emoji}`"
      @click="onPick(emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>
