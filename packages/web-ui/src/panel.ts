import type { QRCodeErrorCorrectionLevelType } from 'sqrc'
import { copySvg, downloadPng, downloadSvg } from './exporters'
import { flashButton } from './lib/dom'
import { buildSnippet } from './lib/snippet'
import type { StudioState } from './lib/types'
import { matchPreset, PRESETS } from './presets'
import { DEFAULT_STATE, store } from './state'
import type { Binding } from './ui/el'
import { h, svg } from './ui/el'
import { icons } from './ui/icons'
import {
  button,
  buttonRow,
  colorRow,
  fileRow,
  iconButton,
  noteRow,
  segmentRow,
  selectRow,
  textRow,
  toggleRow,
} from './ui/rows'
import { scrubRow } from './ui/scrub'
import { group, section } from './ui/section'

type NestedKey = 'foreground' | 'background' | 'logo'

function field<K extends keyof StudioState>(key: K): Binding<StudioState[K]> {
  return {
    read: () => store.get()[key],
    write: (value) => store.set({ [key]: value } as Partial<StudioState>),
    subscribe: store.subscribe,
  }
}

function nested<K extends NestedKey, P extends keyof StudioState[K]>(
  key: K,
  prop: P,
): Binding<StudioState[K][P]> {
  return {
    read: () => store.get()[key][prop],
    write: (value) => {
      const patch: Partial<StudioState[K]> = {}
      patch[prop] = value
      store.setDeep(key, patch)
    },
    subscribe: store.subscribe,
  }
}

function eyeAt(index: 0 | 1 | 2): Binding<string> {
  return {
    read: () => store.get().eyeColors[index],
    write: (value) => {
      const colors = [...store.get().eyeColors] as StudioState['eyeColors']
      colors[index] = value
      store.set({ eyeColors: colors })
    },
    subscribe: store.subscribe,
  }
}

function show(
  element: HTMLElement,
  when: (state: StudioState) => boolean,
): HTMLElement {
  const sync = () => {
    element.hidden = !when(store.get())
  }
  store.subscribe(sync)
  sync()
  return element
}

const px = (value: number) => `${value}px`
const percent = (value: number) => `${Math.round(value)}%`
const degrees = (value: number) => `${value}°`

function fillRows(key: 'foreground' | 'background', label: string) {
  const gradientOn = (state: StudioState) => state[key].gradient
  const gradientOff = (state: StudioState) => !state[key].gradient
  const gradient = nested(key, 'gradient')
  return [
    segmentRow(
      label,
      [
        { value: 'solid', label: 'Solid' },
        { value: 'gradient', label: 'Gradient' },
      ],
      {
        read: () => (gradient.read() ? 'gradient' : 'solid'),
        write: (value) => gradient.write(value === 'gradient'),
        subscribe: gradient.subscribe,
      },
    ),
    show(colorRow('Color', nested(key, 'color')), gradientOff),
    show(colorRow('From', nested(key, 'from')), gradientOn),
    show(colorRow('To', nested(key, 'to')), gradientOn),
    show(
      scrubRow({
        label: 'Angle',
        min: 0,
        max: 180,
        step: 5,
        format: degrees,
        binding: nested(key, 'rotation'),
      }),
      gradientOn,
    ),
  ]
}

function presetBinding(): Binding<string> {
  return {
    read: () => matchPreset(store.get())?.name ?? 'custom',
    write: (name) => {
      const preset = PRESETS.find((candidate) => candidate.name === name)
      if (preset) store.set(preset.patch)
    },
    subscribe: store.subscribe,
  }
}

function header(): HTMLElement {
  const github = h(
    'a',
    {
      class: 'icon-btn',
      attrs: {
        href: 'https://github.com/monodyle/sqrc',
        target: '_blank',
        rel: 'noreferrer',
        'aria-label': 'GitHub',
        title: 'GitHub',
      },
    },
    svg(icons.github),
  )
  return h(
    'header',
    { class: 'panel-head' },
    h(
      'h1',
      { class: 'wordmark' },
      'sqrc',
      h('span', { class: 'wordmark-studio', text: 'studio' }),
    ),
    github,
  )
}

function toolbar(): HTMLElement {
  const presets = selectRow(
    'Preset',
    [
      ...PRESETS.map((preset) => ({ value: preset.name, label: preset.name })),
      { value: 'custom', label: 'Custom', disabled: true },
    ],
    presetBinding(),
  )
  presets.id = 'preset-select'
  const reset = iconButton(icons.reset, 'Reset to defaults', () =>
    store.set(DEFAULT_STATE),
  )
  return h('div', { class: 'toolbar' }, presets, reset)
}

function bindSlashShortcut(input: HTMLTextAreaElement): void {
  window.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
      return
    const active = document.activeElement
    const typing =
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLInputElement ||
      active?.getAttribute('role') === 'listbox' ||
      (active instanceof HTMLElement && active.isContentEditable)
    if (typing) return
    event.preventDefault()
    input.focus()
    input.select()
  })
}

export function mountPanel(root: HTMLElement): void {
  const value = textRow('Value', 'https://…', field('value'))
  value.input.id = 'ctl-value'
  bindSlashShortcut(value.input)

  const requireValue = (): boolean => {
    if (store.get().value.trim()) return true
    value.root.classList.remove('nudge')
    void value.root.offsetWidth
    value.root.classList.add('nudge')
    value.input.focus()
    return false
  }

  const exportAction =
    (run: () => Promise<void>, okLabel: string) =>
    (element: HTMLButtonElement) => {
      if (requireValue()) flashButton(element, run, okLabel)
    }

  const data = section(
    'Data',
    value.root,
    segmentRow<QRCodeErrorCorrectionLevelType>(
      'Error correction',
      [
        { value: 'L', label: 'L' },
        { value: 'M', label: 'M' },
        { value: 'Q', label: 'Q' },
        { value: 'H', label: 'H' },
      ],
      field('ecc'),
    ),
    show(
      noteRow('A logo hides modules. H keeps the most room for scanning.'),
      (state) =>
        state.logo.dataUrl !== null && (state.ecc === 'L' || state.ecc === 'M'),
    ),
  )

  const modules = section(
    'Modules',
    selectRow(
      'Shape',
      [
        { value: 'square', label: 'Square' },
        { value: 'circle', label: 'Circle' },
        { value: 'rounded', label: 'Rounded' },
        { value: 'diamond', label: 'Diamond' },
      ],
      field('shape'),
    ),
    selectRow(
      'Eye shape',
      [
        { value: 'square', label: 'Square' },
        { value: 'rounded', label: 'Rounded' },
      ],
      field('eyePatternShape'),
    ),
    scrubRow({
      label: 'Gap',
      min: 0,
      max: 10,
      step: 0.5,
      format: px,
      binding: field('gap'),
    }),
    scrubRow({
      label: 'Eye gap',
      min: 0,
      max: 10,
      step: 0.5,
      format: px,
      binding: field('eyePatternGap'),
    }),
  )

  const eyeMode = (mode: StudioState['eyeColorMode']) => (state: StudioState) =>
    state.eyeColorMode === mode

  const colors = section(
    'Colors',
    ...fillRows('foreground', 'Foreground'),
    ...fillRows('background', 'Background'),
    segmentRow(
      'Eyes',
      [
        { value: 'inherit', label: 'Match' },
        { value: 'single', label: 'Single' },
        { value: 'triple', label: 'Per eye' },
      ],
      field('eyeColorMode'),
    ),
    show(colorRow('Eye color', field('eyeColor')), eyeMode('single')),
    show(colorRow('Top left', eyeAt(0)), eyeMode('triple')),
    show(colorRow('Top right', eyeAt(1)), eyeMode('triple')),
    show(colorRow('Bottom left', eyeAt(2)), eyeMode('triple')),
  )

  const hasLogo = (state: StudioState) => state.logo.dataUrl !== null
  const logo = section(
    'Logo',
    fileRow('Image', {
      read: () => {
        const { dataUrl, name } = store.get().logo
        return { dataUrl, name }
      },
      write: (value) => store.setDeep('logo', value),
      subscribe: store.subscribe,
    }),
    show(
      scrubRow({
        label: 'Size',
        min: 8,
        max: 40,
        step: 1,
        format: percent,
        binding: nested('logo', 'size'),
      }),
      hasLogo,
    ),
    show(
      scrubRow({
        label: 'Padding',
        min: 0,
        max: 24,
        step: 1,
        format: px,
        binding: nested('logo', 'padding'),
      }),
      hasLogo,
    ),
    show(
      scrubRow({
        label: 'Opacity',
        min: 0.2,
        max: 1,
        step: 0.05,
        format: (value) => percent(value * 100),
        binding: nested('logo', 'opacity'),
      }),
      hasLogo,
    ),
    show(
      segmentRow(
        'Clip',
        [
          { value: 'square', label: 'Square' },
          { value: 'circle', label: 'Circle' },
        ],
        nested('logo', 'style'),
      ),
      hasLogo,
    ),
    show(
      toggleRow('Clear behind logo', nested('logo', 'emptyBackground')),
      hasLogo,
    ),
  )

  const exportSize: Binding<string> = {
    read: () => String(store.get().exportSize),
    write: (value) => store.set({ exportSize: Number(value) }),
    subscribe: store.subscribe,
  }
  const exporter = section(
    'Export',
    selectRow(
      'Size',
      ['256', '512', '1024', '2048'].map((size) => ({
        value: size,
        label: `${size} px`,
      })),
      exportSize,
    ),
    buttonRow(
      button('Copy SVG', exportAction(copySvg, 'Copied')),
      button('Copy code', (element) =>
        flashButton(
          element,
          () => navigator.clipboard.writeText(buildSnippet(store.get())),
          'Copied',
        ),
      ),
    ),
    buttonRow(
      button('Download SVG', exportAction(downloadSvg, 'Saved')),
      button('Download PNG', exportAction(downloadPng, 'Saved'), 'primary'),
    ),
  )

  root.append(header(), group(toolbar()), data, modules, colors, logo, exporter)
}
