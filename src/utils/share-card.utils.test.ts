import { describe, expect, it } from 'bun:test'
import type { GameSummary } from '@/types/game.types'
import { copyShareTextToClipboard, downloadBlob, formatShareText, renderResultCardToCanvas } from './share-card.utils'

const mockSummary: GameSummary = {
  compatibility: 80,
  matches: 4,
  totalRounds: 5,
  title: 'Bestie Level Dewa ✨',
  players: [
    {
      role: 'host',
      name: 'Aldi',
      correctGuesses: 2,
      guessAttempts: 2,
    },
    {
      role: 'guest',
      name: 'Budi',
      correctGuesses: 2,
      guessAttempts: 3,
    },
  ],
}

describe('share-card.utils', () => {
  it('renderResultCardToCanvas produces a canvas with correct dimensions', () => {
    const mockCtx = {
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      arcTo: () => {},
      closePath: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      measureText: () => ({ width: 100 }),
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: (type: string) => (type === '2d' ? mockCtx : null),
    }

    // @ts-expect-error test DOM mock
    globalThis.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockCanvas
        return {}
      },
    }

    const canvas = renderResultCardToCanvas(mockSummary, 'ABC234')
    expect(canvas).toBeDefined()
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1350)
  })

  it('downloadBlob attaches, clicks, and removes link element', () => {
    let clicked = false
    let appended = false
    let removed = false

    const fakeAnchor = {
      href: '',
      download: '',
      click: () => {
        clicked = true
      },
    }

    // @ts-expect-error test DOM mock
    globalThis.document = {
      createElement: (tag: string) => {
        if (tag === 'a') return fakeAnchor
        return {}
      },
      body: {
        appendChild: () => {
          appended = true
        },
        removeChild: () => {
          removed = true
        },
      },
    }

    // @ts-expect-error test URL mock
    globalThis.URL = {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {},
    }

    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'custom-result.png')

    expect(clicked).toBe(true)
    expect(appended).toBe(true)
    expect(removed).toBe(true)
    expect(fakeAnchor.download).toBe('custom-result.png')
  })

  it('formatShareText formats text with player names, score, and link', () => {
    const text = formatShareText(mockSummary, 'https://bestie-match.web.app')
    expect(text).toContain('Aldi')
    expect(text).toContain('Budi')
    expect(text).toContain('80%')
    expect(text).toContain('Bestie Level Dewa ✨')
    expect(text).toContain('https://bestie-match.web.app')
  })

  it('copyShareTextToClipboard writes text via navigator.clipboard', async () => {
    let written = ''
    // @ts-expect-error test navigator mock
    globalThis.navigator = {
      clipboard: {
        writeText: async (t: string) => {
          written = t
        },
      },
    }

    const success = await copyShareTextToClipboard(mockSummary, 'https://bestie-match.web.app')
    expect(success).toBe(true)
    expect(written).toContain('Aldi')
    expect(written).toContain('https://bestie-match.web.app')
  })
})
