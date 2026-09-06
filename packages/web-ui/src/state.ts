import { createStore } from './lib/store'
import type { StudioState } from './lib/types'

// The opening render mirrors the README's hero example, so the studio's
// first impression is the library's own canonical styled code.
export const DEFAULT_STATE: StudioState = {
  value: 'https://github.com/monodyle/sqrc',
  ecc: 'M',
  shape: 'rounded',
  eyePatternShape: 'rounded',
  gap: 0,
  eyePatternGap: 0,
  foreground: {
    gradient: true,
    color: '#1a1a2e',
    from: '#1a1a2e',
    to: '#0d0d17',
    rotation: 45,
  },
  background: {
    gradient: false,
    color: '#ffffff',
    from: '#ffffff',
    to: '#f1f1ec',
    rotation: 90,
  },
  eyeColorMode: 'inherit',
  eyeColor: '#b91c1c',
  eyeColors: ['#e5484d', '#2563eb', '#16a34a'],
  logo: {
    dataUrl: null,
    name: null,
    size: 20,
    padding: 8,
    opacity: 1,
    style: 'square',
    emptyBackground: true,
  },
  exportSize: 512,
}

export const store = createStore<StudioState>(DEFAULT_STATE)
