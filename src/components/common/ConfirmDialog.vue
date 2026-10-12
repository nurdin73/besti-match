<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        data-testid="confirm-dialog-backdrop"
        @click.self="emit('cancel')"
      >
        <div
          class="card w-full max-w-md flex flex-col gap-5 bg-white p-6 shadow-2xl animate-pop-in"
          data-testid="confirm-dialog-card"
        >
          <div class="flex items-start gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-miss/10 text-2xl text-miss">
              ⚠️
            </span>
            <div class="flex flex-col gap-1">
              <h2 class="font-display text-xl font-bold text-ink" data-testid="confirm-dialog-title">
                {{ title }}
              </h2>
              <p class="text-sm text-stone-600 leading-relaxed" data-testid="confirm-dialog-description">
                {{ description }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              class="btn-ghost px-4 py-2 text-sm"
              data-testid="confirm-dialog-cancel"
              @click="emit('cancel')"
            >
              {{ cancelText ?? 'Batal' }}
            </button>
            <button
              type="button"
              class="btn px-4 py-2 text-sm font-bold text-white transition active:translate-y-0.5"
              :class="danger !== false ? 'bg-miss shadow-[0_3px_0_0_#d12c49] hover:brightness-105' : 'bg-tangerine shadow-[0_3px_0_0_#d9502f] hover:brightness-105'"
              data-testid="confirm-dialog-confirm"
              @click="emit('confirm')"
            >
              {{ confirmText ?? 'Ya, Lanjutkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
