import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const NAME_KEY = 'bestie-match:name'
const MUTED_KEY = 'bestie-match:muted'

/** Device-level preferences, persisted across sessions. */
export const useSettingsStore = defineStore('settings', () => {
  const playerName = ref(localStorage.getItem(NAME_KEY) ?? '')
  const muted = ref(localStorage.getItem(MUTED_KEY) === '1')

  watch(playerName, (name) => localStorage.setItem(NAME_KEY, name.trim()))
  watch(muted, (value) => localStorage.setItem(MUTED_KEY, value ? '1' : '0'))

  return { playerName, muted, toggleMuted: () => (muted.value = !muted.value) }
})
