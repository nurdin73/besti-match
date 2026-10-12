import { describe, expect, it } from 'bun:test'
import type { GameSummary } from '@/types/game.types'
import { downloadBlob, renderResultCardToCanvas } from './share-card.utils'

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
})
