import type { Role } from '@/types/game.types'
import type { HostSnapshot } from '@/game/host-session'

const SESSION_KEY = 'bestie-match:session'
const HOST_KEY = 'bestie-match:host'

/** Per-tab session so an accidental refresh can rejoin the same room. */
export interface StoredSession {
  role: Role
  roomCode: string
  name: string
  token: string
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const sessionPersistence = {
  load: () => read<StoredSession>(SESSION_KEY),
  save: (session: StoredSession) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)),
  loadHost: () => read<HostSnapshot>(HOST_KEY),
  saveHost: (snapshot: HostSnapshot) => sessionStorage.setItem(HOST_KEY, JSON.stringify(snapshot)),
  clear: () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(HOST_KEY)
  },
}
