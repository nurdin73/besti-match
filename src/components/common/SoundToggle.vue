<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'

const settings = useSettingsStore()
</script>

<template>
  <button
    type="button"
    class="grid size-11 place-items-center rounded-2xl border-2 border-line bg-white text-xl transition hover:-translate-y-0.5 hover:border-lavender"
    :aria-label="settings.muted ? 'Nyalakan suara' : 'Matikan suara'"
    :aria-pressed="!settings.muted"
    data-testid="sound-toggle-button"
    @click="settings.toggleMuted()"
  >
    {{ settings.muted ? '🔇' : '🔊' }}
  </button>
</template>
