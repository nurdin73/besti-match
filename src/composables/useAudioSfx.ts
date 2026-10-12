import { useSettingsStore } from '@/stores/settingsStore'

export type SfxName = 'pop' | 'lock' | 'tick' | 'match' | 'miss' | 'victory'

interface Note {
  freq: number
  at: number
  dur: number
  type?: OscillatorType
}

/** Tiny synthesized sound bank: no audio assets to download. */
const SOUNDS: Record<SfxName, Note[]> = {
  pop: [{ freq: 660, at: 0, dur: 0.08, type: 'triangle' }],
  lock: [
    { freq: 520, at: 0, dur: 0.07, type: 'square' },
    { freq: 780, at: 0.07, dur: 0.09, type: 'square' },
  ],
  tick: [{ freq: 1100, at: 0, dur: 0.04, type: 'sine' }],
  match: [
    { freq: 523, at: 0, dur: 0.12, type: 'triangle' },
    { freq: 659, at: 0.1, dur: 0.12, type: 'triangle' },
    { freq: 784, at: 0.2, dur: 0.12, type: 'triangle' },
    { freq: 1047, at: 0.3, dur: 0.25, type: 'triangle' },
  ],
  miss: [
    { freq: 330, at: 0, dur: 0.18, type: 'sawtooth' },
    { freq: 247, at: 0.16, dur: 0.3, type: 'sawtooth' },
  ],
  victory: [
    { freq: 523, at: 0, dur: 0.15, type: 'triangle' },
    { freq: 659, at: 0.15, dur: 0.15, type: 'triangle' },
    { freq: 784, at: 0.3, dur: 0.15, type: 'triangle' },
    { freq: 1047, at: 0.45, dur: 0.45, type: 'triangle' },
  ],
}

let context: AudioContext | null = null

export function useAudioSfx() {
  const settings = useSettingsStore()

  function play(name: SfxName): void {
    if (settings.muted) return
    context ??= new AudioContext()
    const start = context.currentTime
    for (const note of SOUNDS[name]) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = note.type ?? 'sine'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0.0001, start + note.at)
      gain.gain.exponentialRampToValueAtTime(0.12, start + note.at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.dur)
      osc.connect(gain).connect(context.destination)
      osc.start(start + note.at)
      osc.stop(start + note.at + note.dur + 0.02)
    }
  }

  return { play }
}
