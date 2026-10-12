<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioSfx } from '@/composables/useAudioSfx'
import { otherRole } from '@/game/game-rules.utils'
import TimerBar from '@/components/common/TimerBar.vue'
import QuestionPrompt from '@/components/game/QuestionPrompt.vue'
import AnswerInputCard from '@/components/game/AnswerInputCard.vue'
import RoundRevealCard from '@/components/game/RoundRevealCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const game = useGameStore()
const { play } = useAudioSfx()
const draft = ref('')
const showAbortConfirm = ref(false)

const round = computed(() => game.state?.round ?? null)
const me = computed(() => game.role ?? 'host')
const nameOf = (role: 'host' | 'guest') => game.state?.players[role]?.name ?? '???'
const iAmTarget = computed(() => round.value?.targetRole === me.value)
const targetName = computed(() => (round.value ? nameOf(round.value.targetRole) : ''))
const guesserName = computed(() => (round.value ? nameOf(otherRole(round.value.targetRole)) : ''))
const totalRounds = computed(() => game.state?.settings.totalRounds ?? 0)

function submit(): void {
  game.submitAnswer(draft.value)
  play('lock')
}

/** On timeout, lock whatever was typed; the host waits a short grace period for it. */
function onTimerExpired(): void {
  if (round.value && !round.value.submitted[me.value]) submit()
}

function handleConfirmAbort(): void {
  showAbortConfirm.value = false
  game.abortGame('Permainan dihentikan oleh salah satu pemain.')
}

watch(() => round.value?.index, () => (draft.value = ''))
watch(() => game.state?.phase, (phase) => {
  if (phase === 'reveal') play(round.value?.result?.isMatch ? 'match' : 'miss')
})
</script>

<template>
  <section v-if="round && game.state" class="flex flex-col gap-5" data-testid="game-view">
    <QuestionPrompt :round="round" :total-rounds="totalRounds" :i-am-target="iAmTarget" :target-name="targetName" />

    <template v-if="game.state.phase === 'answering'">
      <TimerBar
        v-if="game.localDeadline && game.state.settings.timerSeconds"
        :key="round.index"
        :deadline="game.localDeadline"
        :total-seconds="game.state.settings.timerSeconds"
        @tick="(s) => s > 0 && s <= 5 && play('tick')"
        @expired="onTimerExpired"
      />
      <AnswerInputCard
        v-model:draft="draft"
        :submitted="round.submitted[me]"
        :other-submitted="round.submitted[otherRole(me)]"
        :other-name="nameOf(otherRole(me))"
        :i-am-target="iAmTarget"
        @submit="submit"
      />
    </template>

    <div v-else-if="game.state.phase === 'evaluating'" class="card flex flex-col items-center gap-3 py-10 text-center" data-testid="game-view-evaluating">
      <span class="text-5xl animate-wiggle">🤖</span>
      <p class="font-display text-xl font-bold">Wasit AI sedang menilai…</p>
      <p class="text-sm text-stone-500">Membandingkan makna kedua jawaban</p>
    </div>

    <RoundRevealCard
      v-else-if="game.state.phase === 'reveal' && round.result"
      :result="round.result"
      :target-name="targetName"
      :guesser-name="guesserName"
      :i-am-target="iAmTarget"
      :is-host="game.isHost"
      :is-last-round="round.index + 1 >= totalRounds"
      @override="game.toggleOverride()"
      @next="game.nextRound()"
    />

    <div class="flex justify-center pt-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/70 px-4 py-2 font-fun text-xs font-semibold text-stone-500 transition hover:border-miss/40 hover:bg-white hover:text-miss active:translate-y-0.5"
        data-testid="game-view-abort-button"
        @click="showAbortConfirm = true"
      >
        <span>⏹️</span>
        <span>Hentikan Permainan</span>
      </button>
    </div>

    <ConfirmDialog
      :open="showAbortConfirm"
      title="Hentikan Permainan?"
      description="Apakah kamu yakin ingin menghentikan permainan ini? Kedua pemain akan diarahkan kembali ke halaman utama."
      confirm-text="Ya, Hentikan"
      cancel-text="Batal"
      :danger="true"
      @confirm="handleConfirmAbort"
      @cancel="showAbortConfirm = false"
    />
  </section>
</template>
