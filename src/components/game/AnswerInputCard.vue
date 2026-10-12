<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

defineProps<{ submitted: boolean; otherSubmitted: boolean; otherName: string; iAmTarget: boolean }>()
const emit = defineEmits<{ submit: [] }>()
const draft = defineModel<string>('draft', { required: true })

const input = ref<HTMLInputElement | null>(null)
onMounted(() => nextTick(() => input.value?.focus()))
</script>

<template>
  <section class="card flex flex-col gap-4" data-testid="answer-input-card">
    <form v-if="!submitted" class="flex flex-col gap-3 sm:flex-row" @submit.prevent="draft.trim() && emit('submit')">
      <input
        ref="input"
        v-model="draft"
        class="input text-lg"
        maxlength="120"
        autocomplete="off"
        :placeholder="iAmTarget ? 'Jawaban jujurmu…' : 'Tebakanmu…'"
        data-testid="answer-input-field"
      />
      <button class="btn-primary shrink-0 text-lg" :disabled="!draft.trim()" data-testid="answer-input-submit">🔒 Kunci</button>
    </form>

    <div v-else class="flex items-center gap-3 rounded-2xl bg-match/10 px-4 py-3 font-medium text-match animate-pop-in" data-testid="answer-input-locked">
      <span class="text-2xl">🔒</span> Jawabanmu sudah dikunci. Rahasia aman!
    </div>

    <p class="flex items-center gap-2 text-sm text-stone-500" data-testid="answer-input-opponent-status">
      <template v-if="otherSubmitted"><span class="text-match">●</span> {{ otherName }} sudah mengunci jawaban.</template>
      <template v-else>
        <span class="flex gap-1">
          <span v-for="i in 3" :key="i" class="size-1.5 animate-bounce rounded-full bg-stone-400" :style="{ animationDelay: `${i * 120}ms` }" />
        </span>
        {{ otherName }} sedang mengetik…
      </template>
    </p>
  </section>
</template>
