<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ roomCode: string }>()

const copied = ref(false)
const inviteLink = computed(() => `${location.origin}${import.meta.env.BASE_URL}?room=${props.roomCode}`)

async function copyLink(): Promise<void> {
  const shareData = { title: 'Bestie Match', text: 'Seberapa kenal kamu sama aku? Main yuk!', url: inviteLink.value }
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    await navigator.share(shareData).catch(() => undefined)
    return
  }
  await navigator.clipboard.writeText(inviteLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}
</script>

<template>
  <section class="card flex flex-col items-center gap-4 bg-linear-to-br from-white to-peach/30 text-center" data-testid="room-share-card">
    <p class="font-fun text-sm font-semibold uppercase tracking-widest text-stone-500">Kode Ruangan</p>
    <p class="font-fun text-5xl font-semibold tracking-[0.3em] text-lavender" data-testid="room-share-code">{{ roomCode }}</p>
    <button class="btn-primary w-full sm:w-auto" data-testid="room-share-copy-button" @click="copyLink">
      {{ copied ? '✅ Link tersalin!' : '🔗 Bagikan Link Undangan' }}
    </button>
    <p class="text-sm text-stone-500">Kirim link ini ke bestie-mu, atau minta dia ketik kodenya.</p>
  </section>
</template>
