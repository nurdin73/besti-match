import Peer, { type DataConnection } from 'peerjs'
import type {
  ConnectionStatus,
  GuestToHostMessage,
  HostToGuestMessage,
} from '@/types/p2p.types'

const PEER_ID_PREFIX = 'bestie-match-v1-'
const RETRY_DELAY_MS = 2000
const MAX_RETRIES = 5
const CONNECT_TIMEOUT_MS = 4500

export const peerIdFor = (roomCode: string) => `${PEER_ID_PREFIX}${roomCode}`

type StatusListener = (status: ConnectionStatus) => void

interface HostRoomHandlers {
  onStatus: StatusListener
  /** Return `true` to accept, or a REJECTED message to send before closing. */
  onJoin: (payload: Extract<GuestToHostMessage, { type: 'JOIN' }>['payload']) => HostToGuestMessage | true
  onGuestReady: () => void
  onMessage: (message: Exclude<GuestToHostMessage, { type: 'JOIN' }>) => void
  onGuestLeft: () => void
}

/** Host side: owns the deterministic room peer ID and a single active guest connection. */
export class HostRoom {
  private peer: Peer | null = null
  private guest: DataConnection | null = null
  private destroyed = false
  private retries = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private unloadCleanup: (() => void) | null = null

  constructor(private readonly roomCode: string, private readonly handlers: HostRoomHandlers) {
    this.setupUnloadCleanup()
  }

  private setupUnloadCleanup(): void {
    const handleUnload = () => {
      if (this.peer && !this.peer.destroyed) {
        try {
          this.peer.destroy()
        } catch {
          // Ignore unload errors
        }
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
    this.unloadCleanup = () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }

  start(): void {
    if (this.destroyed) return
    this.clearRetryTimer()
    this.handlers.onStatus(this.retries ? 'reconnecting' : 'connecting')

    try {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy()
      }
    } catch {
      // Ignore cleanup error
    }

    const peer = new Peer(peerIdFor(this.roomCode))
    this.peer = peer

    peer.on('open', () => {
      this.retries = 0
      this.handlers.onStatus('open')
    })

    peer.on('connection', (conn) => this.acceptConnection(conn))

    peer.on('disconnected', () => {
      if (this.destroyed || !peer || peer.destroyed) return
      // If we already have a working guest connection, keep the game alive
      // and silently reconnect to the broker in the background.
      try {
        peer.reconnect()
      } catch {
        if (!this.guest) {
          this.scheduleRestart()
        }
      }
    })

    peer.on('error', (error) => {
      if (this.destroyed) return
      // If we have an active guest, ignore transient broker socket drops
      if (this.guest && (error.type === 'disconnected' || error.type === 'socket-closed')) {
        return
      }
      // After a refresh the signaling server may still hold our old ID for a few seconds.
      if (error.type === 'unavailable-id') {
        if (this.retries < MAX_RETRIES) {
          this.scheduleRestart()
          return
        }
        this.handlers.onStatus('error')
        return
      }

      if (error.type === 'network' || error.type === 'server-error' || error.type === 'socket-error' || error.type === 'socket-closed') {
        if (!this.guest) {
          this.scheduleRestart()
          return
        }
      }

      if (!this.guest) {
        this.handlers.onStatus('error')
      }
    })
  }

  private scheduleRestart(): void {
    if (this.destroyed || this.retryTimer || this.guest) return
    this.retries++
    this.handlers.onStatus('reconnecting')
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (!this.destroyed && !this.guest) this.start()
    }, RETRY_DELAY_MS)
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  reconnect(): void {
    this.retries = 0
    this.start()
  }

  send(message: HostToGuestMessage): void {
    if (this.guest) {
      try {
        void this.guest.send(message)
      } catch {
        // Send failure
      }
    }
  }

  destroy(): void {
    this.destroyed = true
    this.clearRetryTimer()
    if (this.unloadCleanup) {
      this.unloadCleanup()
      this.unloadCleanup = null
    }
    if (this.guest) {
      try {
        this.guest.close()
      } catch {}
      this.guest = null
    }
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {}
      this.peer = null
    }
  }

  private acceptConnection(conn: DataConnection): void {
    conn.on('data', (raw) => {
      const message = raw as GuestToHostMessage
      if (message.type === 'JOIN') return this.handleJoin(conn, message.payload)
      if (conn === this.guest) this.handlers.onMessage(message)
    })

    conn.on('close', () => {
      if (conn !== this.guest) return
      this.guest = null
      this.handlers.onGuestLeft()
    })

    conn.on('error', () => {
      if (conn !== this.guest) return
      this.guest = null
      this.handlers.onGuestLeft()
    })
  }

  private handleJoin(conn: DataConnection, payload: Extract<GuestToHostMessage, { type: 'JOIN' }>['payload']): void {
    const verdict = this.handlers.onJoin(payload)
    if (verdict !== true) {
      void conn.send(verdict)
      setTimeout(() => {
        try { conn.close() } catch {}
      }, 500)
      return
    }
    if (this.guest && this.guest !== conn) {
      try { this.guest.close() } catch {}
    }
    this.guest = conn
    this.handlers.onGuestReady()
  }
}

interface GuestRoomHandlers {
  onStatus: StatusListener
  onMessage: (message: HostToGuestMessage) => void
}

/** Guest side: connects to the host and keeps retrying until rejected or destroyed. */
export class GuestRoom {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private destroyed = false
  private stopped = false
  private retries = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private unloadCleanup: (() => void) | null = null

  constructor(
    private readonly roomCode: string,
    private readonly joinPayload: Extract<GuestToHostMessage, { type: 'JOIN' }>['payload'],
    private readonly handlers: GuestRoomHandlers,
  ) {
    this.setupUnloadCleanup()
  }

  private setupUnloadCleanup(): void {
    const handleUnload = () => {
      if (this.conn && this.conn.open) {
        try {
          this.conn.send({ type: 'LEAVE', payload: { reason: 'Lawan menutup halaman atau berpindah aplikasi.' } })
          this.conn.close()
        } catch {}
      }
      if (this.peer && !this.peer.destroyed) {
        try {
          this.peer.destroy()
        } catch {}
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
    this.unloadCleanup = () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }

  private cleanupCurrentConnection(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }
    if (this.conn) {
      const conn = this.conn
      this.conn = null
      try {
        conn.off('open')
        conn.off('data')
        conn.off('close')
        conn.off('error')
        conn.close()
      } catch {}
    }
  }

  start(): void {
    if (this.destroyed) return
    this.clearAllTimers()
    this.cleanupCurrentConnection()
    this.handlers.onStatus(this.retries ? 'reconnecting' : 'connecting')

    try {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy()
      }
    } catch {}

    const peer = new Peer()
    this.peer = peer

    peer.on('open', () => this.connect())

    peer.on('disconnected', () => {
      if (this.destroyed || this.stopped || !peer || peer.destroyed) return
      // If we are already connected to the host via DataConnection,
      // DO NOT tear down or retry! The WebRTC game connection is alive and working.
      if (this.conn?.open) {
        try {
          peer.reconnect()
        } catch {}
        return
      }
      this.scheduleRetry()
    })

    peer.on('error', (error) => {
      if (this.destroyed || this.stopped) return
      // If already connected to host, broker signaling hiccups must not kill the game
      if (this.conn?.open && (error.type === 'disconnected' || error.type === 'socket-closed')) {
        return
      }
      if (
        error.type === 'peer-unavailable' ||
        error.type === 'network' ||
        error.type === 'server-error' ||
        error.type === 'socket-error' ||
        error.type === 'socket-closed' ||
        error.type === 'disconnected'
      ) {
        this.scheduleRetry()
      } else {
        this.handlers.onStatus('error')
      }
    })
  }

  reconnect(): void {
    this.retries = 0
    this.stopped = false
    this.clearAllTimers()
    this.cleanupCurrentConnection()
    this.start()
  }

  send(message: GuestToHostMessage): void {
    if (this.conn) {
      try {
        void this.conn.send(message)
      } catch {}
    }
  }

  destroy(): void {
    this.destroyed = true
    this.clearAllTimers()
    this.cleanupCurrentConnection()
    if (this.unloadCleanup) {
      this.unloadCleanup()
      this.unloadCleanup = null
    }
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {}
      this.peer = null
    }
  }

  private connect(): void {
    if (this.destroyed || this.stopped) return
    if (!this.peer || this.peer.destroyed || !this.peer.open || this.peer.disconnected) {
      this.start()
      return
    }

    this.cleanupCurrentConnection()

    const conn = this.peer.connect(peerIdFor(this.roomCode), { reliable: true })
    this.conn = conn

    this.connectTimeoutTimer = setTimeout(() => {
      if (!conn.open && !this.destroyed && !this.stopped) {
        this.cleanupCurrentConnection()
        this.scheduleRetry()
      }
    }, CONNECT_TIMEOUT_MS)

    conn.on('open', () => {
      this.clearAllTimers()
      this.retries = 0
      this.handlers.onStatus('open')
      try {
        void conn.send({ type: 'JOIN', payload: this.joinPayload } satisfies GuestToHostMessage)
      } catch {}
    })

    conn.on('data', (raw) => {
      const message = raw as HostToGuestMessage
      if (message.type === 'REJECTED') {
        this.stopped = true
        this.clearAllTimers()
        this.cleanupCurrentConnection()
      }
      this.handlers.onMessage(message)
    })

    conn.on('close', () => {
      if (conn === this.conn) {
        this.cleanupCurrentConnection()
        this.scheduleRetry()
      }
    })

    conn.on('error', () => {
      if (conn === this.conn) {
        this.cleanupCurrentConnection()
        this.scheduleRetry()
      }
    })
  }

  private scheduleRetry(): void {
    if (this.destroyed || this.stopped || this.retryTimer || this.conn?.open) return
    if (this.retries >= MAX_RETRIES) {
      this.clearAllTimers()
      this.cleanupCurrentConnection()
      this.handlers.onStatus('error')
      return
    }
    this.retries++
    this.handlers.onStatus('reconnecting')
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.conn?.open) return
      if (!this.peer || this.peer.destroyed || !this.peer.open || this.peer.disconnected) {
        this.start()
      } else {
        this.connect()
      }
    }, RETRY_DELAY_MS)
  }

  private clearAllTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }
  }
}
