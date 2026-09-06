import type { FillState, StudioState } from './lib/types'

const solid = (color: string): FillState => ({
  gradient: false,
  color,
  from: color,
  to: color,
  rotation: 45,
})

const gradient = (from: string, to: string, rotation = 45): FillState => ({
  gradient: true,
  color: from,
  from,
  to,
  rotation,
})

export type Preset = {
  name: string
  patch: Partial<StudioState>
}

// Each preset replaces the fill objects wholesale, so merging a patch over
// DEFAULT_STATE always yields a complete state.
export const PRESETS: Preset[] = [
  {
    name: 'Ink',
    patch: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      foreground: solid('#17181c'),
      background: solid('#ffffff'),
      eyeColorMode: 'inherit',
    },
  },
  {
    name: 'Laser',
    patch: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      foreground: gradient('#e5484d', '#7f1d1d', 135),
      background: solid('#ffffff'),
      eyeColorMode: 'single',
      eyeColor: '#b91c1c',
    },
  },
  {
    name: 'Blueprint',
    patch: {
      shape: 'square',
      eyePatternShape: 'square',
      gap: 0,
      eyePatternGap: 0,
      foreground: gradient('#1e40af', '#3b82f6', 90),
      background: solid('#eff6ff'),
      eyeColorMode: 'single',
      eyeColor: '#1e40af',
    },
  },
  {
    name: 'Mint',
    patch: {
      shape: 'circle',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      foreground: gradient('#047857', '#10b981'),
      background: solid('#ecfdf5'),
      eyeColorMode: 'single',
      eyeColor: '#065f46',
    },
  },
  {
    name: 'Sunset',
    patch: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      foreground: gradient('#ea580c', '#dc2626'),
      background: solid('#fff7ed'),
      eyeColorMode: 'inherit',
    },
  },
  {
    name: 'Terminal',
    patch: {
      shape: 'square',
      eyePatternShape: 'square',
      gap: 1.5,
      eyePatternGap: 0,
      foreground: gradient('#14532d', '#16a34a', 90),
      background: solid('#f0fdf4'),
      eyeColorMode: 'single',
      eyeColor: '#166534',
    },
  },
  {
    name: 'Tri-eye',
    patch: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      foreground: solid('#17181c'),
      background: solid('#ffffff'),
      eyeColorMode: 'triple',
      eyeColors: ['#dc2626', '#2563eb', '#16a34a'],
    },
  },
]

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function matchPreset(state: StudioState): Preset | undefined {
  return PRESETS.find((preset) =>
    Object.entries(preset.patch).every(([key, value]) =>
      same(state[key as keyof StudioState], value),
    ),
  )
}
