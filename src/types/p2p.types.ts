import type { GameSettings, GameState, Role } from './game.types'

export interface ReactionPayload {
  id: string
  emoji: string
  senderRole: Role
  senderName: string
}

/**
 * Wire protocol. The host is authoritative and pushes full `STATE` snapshots
 * (hidden answers are never included before reveal). This keeps reconnection
 * trivial: a rejoining guest just receives the latest snapshot.
 */
export type GuestToHostMessage =
  | { type: 'JOIN'; payload: { name: string; token: string } }
  | { type: 'SUBMIT_ANSWER'; payload: { roundIndex: number; answer: string } }
  | { type: 'TOGGLE_OVERRIDE'; payload: { roundIndex: number } }
  | { type: 'REACTION'; payload: ReactionPayload }
  | { type: 'LEAVE'; payload: { reason?: string } }

export type HostToGuestMessage =
  | { type: 'STATE'; payload: { state: GameState; hostNow: number } }
  | { type: 'REJECTED'; payload: { reason: 'ROOM_FULL' | 'GAME_IN_PROGRESS' } }
  | { type: 'GAME_ABORTED'; payload: { reason?: string } }
  | { type: 'REACTION'; payload: ReactionPayload }

export type P2PMessage = GuestToHostMessage | HostToGuestMessage

export type SettingsPatch = Partial<Omit<GameSettings, 'customQuestions'>>

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error'
