<script setup lang="ts">
import { ref } from 'vue'
import type { CategoryId, GameSettings, RoundCount, TimerSeconds } from '@/types/game.types'
import type { SettingsPatch } from '@/types/p2p.types'
import { CATEGORY_LABELS } from '@/game/game-rules.utils'

const props = defineProps<{ settings: GameSettings; editable: boolean }>()
const emit = defineEmits<{
  update: [patch: SettingsPatch]
  addQuestion: [text: string]
  removeQuestion: [id: string]
}>()

const ROUND_OPTIONS: RoundCount[] = [5, 10, 15]
const TIMER_OPTIONS: { value: TimerSeconds; label: string }[] = [
  { value: 45, label: '⏱️ 45 detik' },
  { value: null, label: '🐢 Santai' },
]
const PRESET_CATEGORIES: CategoryId[] = ['kocak', 'romantis', 'deep', 'harian']

const draft = ref('')

function toggleCategory(id: CategoryId): void {
  const current = props.settings.categories
  emit('update', { categories: current.includes(id) ? current.filter((c) => c !== id) : [...current, id] })
}

function submitDraft(): void {
  if (!draft.value.trim()) return
  emit('addQuestion', draft.value)
  draft.value = ''
}

const pill = (active: boolean) =>
  active ? 'border-tangerine bg-tangerine text-white shadow-[0_3px_0_0_#d9502f]' : 'border-line bg-white text-ink hover:border-tangerine'
</script>

<template>
  <section class="card flex flex-col gap-6" data-testid="host-setup-card">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Pengaturan Game</h2>
      <span v-if="!editable" class="chip bg-lavender/10 text-lavender" data-testid="host-setup-readonly-badge">Diatur oleh host</span>
    </div>

    <fieldset class="flex flex-col gap-2" :disabled="!editable">
      <legend class="mb-2 font-display font-bold">Jumlah ronde</legend>
      <div class="flex gap-2">
        <button
          v-for="count in ROUND_OPTIONS" :key="count" type="button"
          class="flex-1 rounded-2xl border-2 py-2 font-fun text-lg font-semibold transition disabled:cursor-default"
          :class="pill(settings.totalRounds === count)"
          :data-testid="`host-setup-rounds-${count}`"
          @click="emit('update', { totalRounds: count })"
        >{{ count }}</button>
      </div>
    </fieldset>

    <fieldset class="flex flex-col gap-2" :disabled="!editable">
      <legend class="mb-2 font-display font-bold">Timer per soal</legend>
      <div class="flex gap-2">
        <button
          v-for="option in TIMER_OPTIONS" :key="String(option.value)" type="button"
          class="flex-1 rounded-2xl border-2 py-2 font-fun font-semibold transition disabled:cursor-default"
          :class="pill(settings.timerSeconds === option.value)"
          :data-testid="`host-setup-timer-${option.value ?? 'off'}`"
          @click="emit('update', { timerSeconds: option.value })"
        >{{ option.label }}</button>
      </div>
    </fieldset>

    <fieldset class="flex flex-col gap-2" :disabled="!editable">
      <legend class="mb-2 font-display font-bold">Kategori soal</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="id in PRESET_CATEGORIES" :key="id" type="button"
          class="rounded-full border-2 px-4 py-1.5 font-fun font-semibold transition disabled:cursor-default"
          :class="settings.categories.includes(id) ? 'border-lavender bg-lavender text-white' : 'border-line bg-white hover:border-lavender'"
          :data-testid="`host-setup-category-${id}`"
          @click="toggleCategory(id)"
        >{{ CATEGORY_LABELS[id] }}</button>
      </div>
    </fieldset>

    <div class="flex flex-col gap-3" data-testid="host-setup-custom-questions">
      <h3 class="font-display font-bold">Soal kustom <span class="font-sans text-sm font-normal text-stone-500">({{ settings.customQuestions.length }})</span></h3>
      <form v-if="editable" class="flex gap-2" @submit.prevent="submitDraft">
        <input v-model="draft" class="input" maxlength="140" placeholder="Pakai {target} untuk nama, mis: Apa cita-cita {target}?" data-testid="host-setup-custom-input" />
        <button class="btn-ghost shrink-0" :disabled="!draft.trim()" data-testid="host-setup-custom-add">＋</button>
      </form>
      <ul class="flex flex-col gap-2">
        <li v-for="q in settings.customQuestions" :key="q.id" class="flex items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-2 text-sm animate-pop-in">
          <span>{{ q.template }}</span>
          <button v-if="editable" class="text-stone-400 hover:text-miss" :aria-label="`Hapus soal ${q.template}`" :data-testid="`host-setup-custom-remove-${q.id}`" @click="emit('removeQuestion', q.id)">✕</button>
        </li>
      </ul>
      <p v-if="!settings.categories.length && !settings.customQuestions.length" class="text-sm text-miss" data-testid="host-setup-empty-warning">
        Pilih minimal satu kategori atau tambahkan soal kustom.
      </p>
    </div>
  </section>
</template>
