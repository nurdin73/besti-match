<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { isValidRoomCode } from '@/game/game-rules.utils'

const emit = defineEmits<{ create: [name: string]; join: [name: string, roomCode: string] }>()

const settings = useSettingsStore()
const route = useRoute()
const roomCode = ref(typeof route.query.room === 'string' ? route.query.room.toUpperCase() : '')

const name = computed(() => settings.playerName.trim())
const hasName = computed(() => name.value.length >= 2)
const canJoin = computed(() => hasName.value && isValidRoomCode(roomCode.value))
const invitedByLink = computed(() => isValidRoomCode(roomCode.value) && Boolean(route.query.room))

function onCodeInput(event: Event): void {
  roomCode.value = (event.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
</script>

<template>
  <section class="flex flex-col gap-6" data-testid="lobby-entry">
    <div class="text-center">
      <span class="chip mb-4 bg-peach/70 text-tangerine" data-testid="lobby-entry-badge">🎮 Game P2P untuk berdua</span>
      <h1 class="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Seberapa kenal kamu<br />sama <span class="relative whitespace-nowrap text-tangerine">bestie-mu?</span>
      </h1>
      <p class="mx-auto mt-4 max-w-md text-stone-600">
        Jawab pertanyaan tentang dirimu, tebak jawaban temanmu. AI yang jadi wasit — tanpa server, langsung dari browser ke browser.
      </p>
    </div>

    <div class="card flex flex-col gap-5">
      <label class="flex flex-col gap-2">
        <span class="font-display font-bold">Nama panggilanmu</span>
        <input v-model="settings.playerName" class="input text-lg" maxlength="20" placeholder="contoh: Budi" autocomplete="nickname" data-testid="lobby-entry-name-input" />
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <button
          v-if="!invitedByLink"
          class="btn-primary text-lg"
          :disabled="!hasName"
          data-testid="lobby-entry-create-button"
          @click="emit('create', name)"
        >✨ Buat Ruangan</button>

        <div class="flex flex-col gap-2" :class="{ 'sm:col-span-2': invitedByLink }">
          <input
            :value="roomCode"
            class="input text-center font-fun text-xl font-semibold uppercase tracking-[0.35em]"
            placeholder="KODE"
            inputmode="text"
            aria-label="Kode ruangan"
            data-testid="lobby-entry-code-input"
            @input="onCodeInput"
          />
          <button class="btn-secondary" :disabled="!canJoin" data-testid="lobby-entry-join-button" @click="emit('join', name, roomCode)">
            🚪 Gabung Ruangan
          </button>
        </div>
      </div>
      <p v-if="!hasName" class="text-center text-sm text-stone-500" data-testid="lobby-entry-hint">Isi nama minimal 2 huruf dulu ya.</p>
    </div>

    <ol class="grid gap-3 text-sm sm:grid-cols-3" data-testid="lobby-entry-steps">
      <li v-for="(step, i) in ['Buat ruangan & bagikan link', 'Jawab jujur soal tentang dirimu', 'Tebak jawaban bestie-mu']" :key="step" class="card flex items-center gap-3 p-4">
        <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-lavender/10 font-fun font-semibold text-lavender">{{ i + 1 }}</span>
        {{ step }}
      </li>
    </ol>
  </section>
</template>
