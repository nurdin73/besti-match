<script setup lang="ts">
import { watch } from 'vue'
import { useGameStore, type ActiveReaction } from '@/stores/gameStore'
import { useAudioSfx } from '@/composables/useAudioSfx'

const game = useGameStore()
const { play } = useAudioSfx()

function handleReactionEnded(id: string): void {
  game.removeReaction(id)
}

watch(
  () => game.activeReactions.length,
  (newLen, oldLen) => {
    if (newLen > (oldLen ?? 0)) {
      play('pop')
    }
  },
)
</script>

<template>
  <div
    class="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    aria-live="polite"
    aria-atomic="false"
    data-testid="live-reaction-overlay"
  >
    <TransitionGroup name="reaction-float">
      <div
        v-for="item in game.activeReactions"
        :key="item.id"
        class="reaction-bubble absolute bottom-24 flex flex-col items-center gap-1"
        :class="item.senderRole === game.role ? 'right-6 md:right-16' : 'left-6 md:left-16'"
        :data-testid="`reaction-bubble-${item.id}`"
        @animationend="handleReactionEnded(item.id)"
      >
        <span class="text-5xl select-none filter drop-shadow-md animate-bounce-short">{{ item.emoji }}</span>
        <span
          class="rounded-full bg-stone-900/75 px-2 py-0.5 font-fun text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs"
          :data-testid="`reaction-author-${item.id}`"
        >
          {{ item.senderRole === game.role ? 'Kamu' : item.senderName }}
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
@keyframes floatUpFade {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.6) rotate(-8deg);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1.15) rotate(4deg);
  }
  30% {
    transform: translateY(-40px) scale(1) rotate(-4deg);
  }
  75% {
    opacity: 0.95;
    transform: translateY(-160px) scale(1.05) rotate(2deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-240px) scale(0.8) rotate(0deg);
  }
}

.reaction-bubble {
  animation: floatUpFade 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes bounceShort {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.animate-bounce-short {
  animation: bounceShort 0.6s ease-in-out infinite;
}
</style>
