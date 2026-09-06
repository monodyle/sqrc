import { type Binding, bindElement, h } from './el'

export type ScrubOptions = {
  label: string
  min: number
  max: number
  step: number
  format: (value: number) => string
  binding: Binding<number>
}

const DRAG_THRESHOLD = 3

function decimals(step: number): number {
  const text = String(step)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

export function scrubRow(options: ScrubOptions): HTMLElement {
  const { min, max, step, binding } = options
  const places = decimals(step)

  const snap = (raw: number): number => {
    const clamped = Math.min(max, Math.max(min, raw))
    return Number(
      (Math.round((clamped - min) / step) * step + min).toFixed(places),
    )
  }

  const value = h('span', { class: 'row-value' })
  const root = h(
    'div',
    {
      class: 'row row-scrub',
      attrs: {
        role: 'slider',
        tabindex: '0',
        'aria-label': options.label,
        'aria-valuemin': String(min),
        'aria-valuemax': String(max),
      },
    },
    h('span', { class: 'scrub-fill' }),
    h('span', { class: 'scrub-ticks' }),
    h('span', { class: 'row-label', text: options.label }),
    value,
  )

  bindElement(binding, (current) => {
    value.textContent = options.format(current)
    root.setAttribute('aria-valuenow', String(current))
    root.setAttribute('aria-valuetext', options.format(current))
    const ratio = max === min ? 0 : (current - min) / (max - min)
    root.style.setProperty('--fill', `${(ratio * 100).toFixed(2)}%`)
  })

  const commit = (next: number) => {
    const snapped = snap(next)
    if (snapped !== binding.read()) binding.write(snapped)
  }

  let editor: HTMLInputElement | null = null

  const closeEditor = (save: boolean) => {
    if (!editor) return
    const input = editor
    editor = null
    if (save && input.value.trim() !== '') {
      const parsed = Number(input.value)
      if (!Number.isNaN(parsed)) commit(parsed)
    }
    input.remove()
    value.hidden = false
    root.dataset.editing = 'false'
    root.focus()
  }

  const openEditor = () => {
    if (editor) return
    const input = h('input', {
      class: 'row-input',
      attrs: {
        type: 'text',
        inputmode: 'decimal',
        'aria-label': options.label,
      },
    })
    input.value = String(binding.read())
    editor = input
    value.hidden = true
    root.dataset.editing = 'true'
    root.append(input)
    input.focus()
    input.select()
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') closeEditor(true)
      if (event.key === 'Escape') closeEditor(false)
      event.stopPropagation()
    })
    input.addEventListener('blur', () => closeEditor(true))
  }

  let startX = 0
  let startValue = 0
  let dragging = false
  let pointerId: number | null = null

  root.addEventListener('pointerdown', (event) => {
    if (editor || event.button !== 0) return
    pointerId = event.pointerId
    startX = event.clientX
    startValue = binding.read()
    dragging = false
    root.setPointerCapture(event.pointerId)
  })

  root.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return
    const dx = event.clientX - startX
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      dragging = true
      root.dataset.dragging = 'true'
    }
    const perPixel = (max - min) / root.clientWidth
    commit(startValue + dx * perPixel)
  })

  const release = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    pointerId = null
    if (root.hasPointerCapture(event.pointerId))
      root.releasePointerCapture(event.pointerId)
    root.dataset.dragging = 'false'
    if (!dragging && event.type === 'pointerup') openEditor()
    dragging = false
  }
  root.addEventListener('pointerup', release)
  root.addEventListener('pointercancel', release)

  root.addEventListener('keydown', (event) => {
    if (editor) return
    const multiplier = event.shiftKey ? 10 : 1
    const current = binding.read()
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        commit(current + step * multiplier)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        commit(current - step * multiplier)
        break
      case 'Home':
        commit(min)
        break
      case 'End':
        commit(max)
        break
      case 'Enter':
        openEditor()
        break
      default:
        return
    }
    event.preventDefault()
  })

  return root
}
