import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { GameState, Question, Role } from '@/types/game.types'
import type { ConnectionStatus, GuestToHostMessage, HostToGuestMessage, ReactionPayload, SettingsPatch } from '@/types/p2p.types'
import { HostSession } from '@/game/host-session'
import { evaluateAnswers } from '@/game/evaluate-answers'
import { generateRoomCode, summarizeGame } from '@/game/game-rules.utils'
import { GuestRoom, HostRoom } from '@/services/peer-room'
import { useAiModelStore } from './aiModelStore'
import { sessionPersistence } from './session-persistence'

export interface ActiveReaction extends ReactionPayload {
  createdAt: number
}

const REJECTION_TEXT = {
  ROOM_FULL: 'Ruangan sudah penuh. Game ini cuma buat berdua 😅',
  GAME_IN_PROGRESS: 'Game di ruangan ini sudah dimulai tanpa kamu.',
} as const

/**
 * Single façade for the UI. The host runs the authoritative `HostSession`
 * locally; the guest forwards intents to the host and renders received snapshots.
 */
export const useGameStore = defineStore('game', () => {
  const role = ref<Role | null>(null)
  const state = ref<GameState | null>(null)
  const status = ref<ConnectionStatus>('idle')
  const notice = ref<string | null>(null)
  /** hostClock - localClock, used to render the host's deadline on the guest. */
  const clockOffset = ref(0)
  const bank = shallowRef<Question[]>([])
  const activeReactions = ref<ActiveReaction[]>([])

  let host: HostSession | null = null
  let hostRoom: HostRoom | null = null
  let guestRoom: GuestRoom | null = null

  const isHost = computed(() => role.value === 'host')
  const summary = computed(() => (state.value?.phase === 'finished' ? summarizeGame(state.value) : null))
  const localDeadline = computed(() => {
    const deadline = state.value?.round?.deadline
    return deadline ? deadline - clockOffset.value : null
  })
  const canStart = computed(() => Boolean(state.value && host?.canStart(bank.value)))

  async function loadBank(): Promise<void> {
    if (bank.value.length) return
    bank.value = (await fetch(`${import.meta.env.BASE_URL}questions.json`).then((r) => r.json())) as Question[]
  }

  function publishHostState(next: GameState): void {
    state.value = next
    hostRoom?.send({ type: 'STATE', payload: { state: next, hostNow: Date.now() } })
    if (host) sessionPersistence.saveHost(host.snapshot())
  }

  function openHostRoom(roomCode: string): void {
    hostRoom = new HostRoom(roomCode, {
      onStatus: (s) => (status.value = s),
      onJoin: ({ name, token }) => {
        const verdict = host!.handleJoin(name, token)
        return verdict === true ? true : { type: 'REJECTED', payload: { reason: verdict } }
      },
      onGuestReady: () => host && publishHostState(host.state),
      onMessage: handleGuestIntent,
      onGuestLeft: () => host?.setGuestConnected(false),
    })
    hostRoom.start()
    void useAiModelStore().init()
    void loadBank()
  }

  function pushReaction(payload: ReactionPayload): void {
    activeReactions.value = [...activeReactions.value, { ...payload, createdAt: Date.now() }]
  }

  function removeReaction(id: string): void {
    activeReactions.value = activeReactions.value.filter((r) => r.id !== id)
  }

  function sendReaction(emoji: string): void {
    if (!role.value || !state.value) return
    const myRole = role.value
    const myName = state.value.players[myRole]?.name ?? 'Anonymous'
    const payload: ReactionPayload = {
      id: crypto.randomUUID(),
      emoji,
      senderRole: myRole,
      senderName: myName,
    }
    pushReaction(payload)
    if (myRole === 'host') {
      hostRoom?.send({ type: 'REACTION', payload })
    } else {
      guestRoom?.send({ type: 'REACTION', payload })
    }
  }

  function handleGuestIntent(message: Exclude<GuestToHostMessage, { type: 'JOIN' }>): void {
    if (message.type === 'SUBMIT_ANSWER') host?.submitAnswer('guest', message.payload.roundIndex, message.payload.answer)
    if (message.type === 'TOGGLE_OVERRIDE') host?.toggleOverride('guest', message.payload.roundIndex)
    if (message.type === 'REACTION') pushReaction(message.payload)
    if (message.type === 'LEAVE') {
      const reason = message.payload.reason
      notice.value =
        reason === 'Page unloaded'
          ? 'Lawan menutup halaman atau berpindah aplikasi.'
          : reason || 'Lawan telah keluar dari permainan.'
      host?.setGuestConnected(false)
    }
  }

  function handleHostMessage(message: HostToGuestMessage): void {
    if (message.type === 'STATE') {
      clockOffset.value = message.payload.hostNow - Date.now()
      state.value = message.payload.state
      return
    }
    if (message.type === 'REACTION') {
      pushReaction(message.payload)
      return
    }
    if (message.type === 'GAME_ABORTED') {
      notice.value = message.payload.reason || 'Permainan dihentikan oleh host.'
      leave()
      return
    }
    notice.value = REJECTION_TEXT[message.payload.reason]
    leave()
  }

  function createRoom(name: string): void {
    leave()
    const roomCode = generateRoomCode()
    role.value = 'host'
    host = HostSession.create(roomCode, name, { evaluate: evaluateAnswers, onChange: publishHostState })
    sessionPersistence.save({ role: 'host', roomCode, name, token: crypto.randomUUID() })
    publishHostState(host.state)
    openHostRoom(roomCode)
  }

  function joinRoom(name: string, roomCode: string, token: string = crypto.randomUUID()): void {
    leave()
    role.value = 'guest'
    sessionPersistence.save({ role: 'guest', roomCode, name, token })
    guestRoom = new GuestRoom(roomCode, { name, token }, {
      onStatus: (s) => (status.value = s),
      onMessage: handleHostMessage,
    })
    guestRoom.start()
  }

  /** Called once on app boot to survive an accidental refresh. */
  function resumeSession(): void {
    const session = sessionPersistence.load()
    if (!session) return
    if (session.role === 'guest') return joinRoom(session.name, session.roomCode, session.token)
    const snapshot = sessionPersistence.loadHost()
    if (!snapshot) return sessionPersistence.clear()
    role.value = 'host'
    host = HostSession.restore(snapshot, { evaluate: evaluateAnswers, onChange: publishHostState })
    state.value = host.state
    openHostRoom(session.roomCode)
  }

  function abortGame(reason?: string): void {
    if (role.value === 'host') {
      hostRoom?.send({ type: 'GAME_ABORTED', payload: { reason: reason || 'Host menghentikan permainan.' } })
    } else if (role.value === 'guest') {
      guestRoom?.send({ type: 'LEAVE', payload: { reason: reason || 'Lawan keluar dari permainan.' } })
    }
    leave()
  }

  function retryConnection(): void {
    if (role.value === 'host') {
      hostRoom?.reconnect()
    } else if (role.value === 'guest') {
      guestRoom?.reconnect()
    }
  }

  function leave(): void {
    host?.dispose()
    hostRoom?.destroy()
    guestRoom?.destroy()
    host = hostRoom = guestRoom = null
    role.value = null
    state.value = null
    status.value = 'idle'
    activeReactions.value = []
    sessionPersistence.clear()
  }

  function sendIntent(message: Exclude<GuestToHostMessage, { type: 'JOIN' }>): void {
    if (role.value === 'guest') return guestRoom?.send(message)
    if (message.type === 'SUBMIT_ANSWER') host?.submitAnswer('host', message.payload.roundIndex, message.payload.answer)
    if (message.type === 'TOGGLE_OVERRIDE') host?.toggleOverride('host', message.payload.roundIndex)
  }

  const roundIndex = () => state.value?.round?.index ?? -1

  return {
    role, state, status, notice, isHost, summary, localDeadline, canStart, bank, activeReactions,
    createRoom, joinRoom, resumeSession, leave, abortGame, retryConnection,
    submitAnswer: (answer: string) => sendIntent({ type: 'SUBMIT_ANSWER', payload: { roundIndex: roundIndex(), answer } }),
    toggleOverride: () => sendIntent({ type: 'TOGGLE_OVERRIDE', payload: { roundIndex: roundIndex() } }),
    sendReaction,
    removeReaction,
    updateSettings: (patch: SettingsPatch) => host?.updateSettings(patch),
    addCustomQuestion: (text: string) => host?.addCustomQuestion(text),
    removeCustomQuestion: (id: string) => host?.removeCustomQuestion(id),
    startGame: () => host?.startGame(bank.value),
    nextRound: () => host?.nextRound(),
    backToLobby: () => host?.backToLobby(),
    dismissNotice: () => (notice.value = null),
  }
})
