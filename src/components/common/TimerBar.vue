<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ deadline: number; totalSeconds: number }>()
const emit = defineEmits<{ tick: [secondsLeft: number]; expired: [] }>()

const now = ref(Date.now())
const interval = setInterval(() => (now.value = Date.now()), 200)
onBeforeUnmount(() => clearInterval(interval))

const secondsLeft = computed(() => Math.max(0, Math.ceil((props.deadline - now.value) / 1000)))
const progress = computed(() => Math.min(100, (secondsLeft.value / props.totalSeconds) * 100))
const urgent = computed(() => secondsLeft.value <= 10)

watch(secondsLeft, (s, prev) => {
  if (s === prev) return
  emit('tick', s)
  if (s === 0) emit('expired')
})
</script>

<template>
  <div class="flex items-center gap-3" data-testid="timer-bar">
    <div class="h-3 flex-1 overflow-hidden rounded-full bg-line">
      <div
        class="h-full rounded-full transition-[width] duration-200 ease-linear"
        :class="urgent ? 'bg-miss' : 'bg-linear-to-r from-tangerine to-bubblegum'"
        :style="{ width: `${progress}%` }"
        data-testid="timer-bar-fill"
      />
    </div>
    <span
      class="w-12 text-right font-fun text-lg font-semibold tabular-nums"
      :class="urgent ? 'text-miss animate-wiggle' : 'text-ink'"
      data-testid="timer-bar-seconds"
    >{{ secondsLeft }}s</span>
  </div>
</template>
