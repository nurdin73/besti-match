<script setup lang="ts">
import type { Player, Role } from '@/types/game.types'

defineProps<{ players: Record<Role, Player | null>; myRole: Role }>()

const SLOTS: { role: Role; label: string; tint: string }[] = [
  { role: 'host', label: 'Host', tint: 'bg-tangerine' },
  { role: 'guest', label: 'Tamu', tint: 'bg-lavender' },
]
</script>

<template>
  <section class="grid grid-cols-2 gap-4" data-testid="player-ready-list">
    <div
      v-for="slot in SLOTS"
      :key="slot.role"
      class="card flex flex-col items-center gap-3 p-5 text-center"
      :class="{ 'border-dashed bg-cream/60': !players[slot.role] }"
      :data-testid="`player-ready-list-${slot.role}`"
    >
      <template v-if="players[slot.role]">
        <span class="grid size-16 place-items-center rounded-full font-display text-2xl font-bold text-white animate-pop-in" :class="slot.tint">
          {{ players[slot.role]!.name.charAt(0).toUpperCase() }}
        </span>
        <span class="font-display text-lg font-bold">{{ players[slot.role]!.name }}</span>
        <span class="chip" :class="players[slot.role]!.connected ? 'bg-match/10 text-match' : 'bg-miss/10 text-miss'">
          {{ players[slot.role]!.connected ? '● Siap' : '○ Terputus' }}
          <template v-if="slot.role === myRole"> · Kamu</template>
        </span>
      </template>
      <template v-else>
        <span class="grid size-16 animate-pulse place-items-center rounded-full border-2 border-dashed border-line text-2xl">⏳</span>
        <span class="text-sm text-stone-500">Menunggu bestie bergabung…</span>
      </template>
    </div>
  </section>
</template>
