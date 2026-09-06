import { normalizeHex } from '../lib/dom'
import { type Binding, bindElement, h, svg } from './el'
import { icons } from './icons'

export type Option<T extends string> = {
  value: T
  label: string
  disabled?: boolean
}

export function colorRow(label: string, binding: Binding<string>): HTMLElement {
  const hex = h('input', {
    class: 'row-input hex',
    attrs: {
      type: 'text',
      spellcheck: 'false',
      autocomplete: 'off',
      maxlength: '7',
      'aria-label': `${label} hex`,
    },
  })
  const picker = h('input', {
    attrs: { type: 'color', 'aria-label': `${label} color` },
  })
  const swatch = h('label', { class: 'swatch' }, picker)
  const root = h(
    'div',
    { class: 'row row-color' },
    h('span', { class: 'row-label', text: label }),
    hex,
    swatch,
  )

  picker.addEventListener('input', () => binding.write(picker.value))
  hex.addEventListener('input', () => {
    const normalized = normalizeHex(hex.value)
    hex.dataset.invalid = normalized ? 'false' : 'true'
    if (normalized) binding.write(normalized)
  })
  hex.addEventListener('blur', () => {
    hex.value = binding.read()
    hex.dataset.invalid = 'false'
  })

  bindElement(binding, (color) => {
    if (picker.value !== color) picker.value = color
    swatch.style.setProperty('--swatch', color)
    if (document.activeElement !== hex) hex.value = color
  })

  return root
}

let menuCount = 0

export function selectRow<T extends string>(
  label: string,
  options: readonly Option<T>[],
  binding: Binding<T>,
): HTMLElement {
  const menuId = `menu-${++menuCount}`
  const value = h('span', { class: 'row-value' })
  const trigger = h(
    'button',
    {
      class: 'row row-select',
      attrs: {
        type: 'button',
        'aria-label': label,
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-controls': menuId,
      },
    },
    h('span', { class: 'row-label', text: label }),
    value,
    svg(icons.chevron),
  )
  const items = options.map((option, index) =>
    h(
      'div',
      {
        class: 'menu-item',
        attrs: {
          id: `${menuId}-${index}`,
          role: 'option',
          'data-value': option.value,
          'aria-selected': 'false',
          'aria-disabled': option.disabled ? 'true' : 'false',
        },
      },
      h('span', { text: option.label }),
      svg(icons.check),
    ),
  )
  const menu = h(
    'div',
    {
      class: 'menu',
      attrs: {
        id: menuId,
        role: 'listbox',
        popover: 'auto',
        tabindex: '-1',
        'aria-label': label,
      },
    },
    ...items,
  )
  const root = h('div', { class: 'row-select-wrap' }, trigger, menu)

  const enabled = (index: number) => options[index].disabled !== true
  let active = -1

  const setActive = (index: number) => {
    active = index
    items.forEach((item, i) => {
      item.dataset.active = i === index ? 'true' : 'false'
    })
    if (index >= 0) menu.setAttribute('aria-activedescendant', items[index].id)
    else menu.removeAttribute('aria-activedescendant')
  }

  const step = (from: number, direction: 1 | -1) => {
    let next = from
    for (let i = 0; i < options.length; i++) {
      next = (next + direction + options.length) % options.length
      if (enabled(next)) return next
    }
    return from
  }

  const edge = (direction: 1 | -1) =>
    step(direction === 1 ? options.length - 1 : 0, direction)

  const place = () => {
    const rect = trigger.getBoundingClientRect()
    const gap = 4
    const height = menu.offsetHeight
    const below = rect.bottom + gap
    const fits = below + height <= window.innerHeight - 8
    menu.style.left = `${rect.left}px`
    menu.style.width = `${rect.width}px`
    menu.style.top = `${fits ? below : rect.top - gap - height}px`
  }

  const choose = (index: number) => {
    if (!enabled(index)) return
    binding.write(options[index].value)
    menu.hidePopover()
  }

  const open = () => {
    if (menu.matches(':popover-open')) return
    menu.showPopover()
    place()
    const selected = options.findIndex((o) => o.value === binding.read())
    setActive(selected >= 0 && enabled(selected) ? selected : edge(1))
    trigger.setAttribute('aria-expanded', 'true')
    menu.focus()
    window.addEventListener('scroll', place, { capture: true })
    window.addEventListener('resize', place)
  }

  // Light dismiss (outside click, Escape) closes without going through us.
  menu.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState === 'open') return
    setActive(-1)
    trigger.setAttribute('aria-expanded', 'false')
    window.removeEventListener('scroll', place, { capture: true })
    window.removeEventListener('resize', place)
    if (menu.contains(document.activeElement)) trigger.focus()
  })

  // Light dismiss already closed the menu on pointerdown; the click that
  // follows must not reopen it.
  let closedByPress = false
  trigger.addEventListener('pointerdown', () => {
    closedByPress = menu.matches(':popover-open')
  })
  trigger.addEventListener('click', () => {
    if (closedByPress) closedByPress = false
    else open()
  })
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open()
    }
  })

  menu.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        setActive(step(active, 1))
        break
      case 'ArrowUp':
        setActive(step(active, -1))
        break
      case 'Home':
        setActive(edge(1))
        break
      case 'End':
        setActive(edge(-1))
        break
      case 'Enter':
      case ' ':
        if (active >= 0) choose(active)
        break
      case 'Tab':
        menu.hidePopover()
        return
      default:
        return
    }
    event.preventDefault()
  })

  items.forEach((item, index) => {
    item.addEventListener('pointermove', () => {
      if (enabled(index) && active !== index) setActive(index)
    })
    item.addEventListener('click', () => choose(index))
  })

  bindElement(binding, (current) => {
    value.textContent =
      options.find((option) => option.value === current)?.label ?? current
    items.forEach((item, index) => {
      item.setAttribute(
        'aria-selected',
        String(options[index].value === current),
      )
    })
  })

  return root
}

export function segmentRow<T extends string>(
  label: string,
  options: readonly Option<T>[],
  binding: Binding<T>,
): HTMLElement {
  const buttons = options.map((option) =>
    h('button', {
      text: option.label,
      attrs: { type: 'button', role: 'radio', 'data-value': option.value },
    }),
  )
  const group = h(
    'div',
    { class: 'segment', attrs: { role: 'radiogroup', 'aria-label': label } },
    ...buttons,
  )
  const root = h(
    'div',
    { class: 'row row-segment' },
    h('span', { class: 'row-label', text: label }),
    group,
  )

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => binding.write(options[index].value))
  })
  bindElement(binding, (current) => {
    buttons.forEach((button, index) => {
      const on = options[index].value === current
      button.dataset.on = on ? 'true' : 'false'
      button.setAttribute('aria-checked', String(on))
    })
  })

  return root
}

export function toggleRow(
  label: string,
  binding: Binding<boolean>,
): HTMLElement {
  return segmentRow(
    label,
    [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    {
      read: () => (binding.read() ? 'on' : 'off'),
      write: (value) => binding.write(value === 'on'),
      subscribe: binding.subscribe,
    },
  )
}

export function textRow(
  label: string,
  placeholder: string,
  binding: Binding<string>,
): { root: HTMLElement; input: HTMLTextAreaElement } {
  const input = h('textarea', {
    attrs: {
      rows: '1',
      spellcheck: 'false',
      autocomplete: 'off',
      placeholder,
      'aria-label': label,
    },
  })
  const root = h(
    'label',
    { class: 'row row-text' },
    h('span', { class: 'row-label', text: label }),
    input,
  )

  input.addEventListener('input', () => binding.write(input.value))
  bindElement(binding, (value) => {
    if (document.activeElement !== input && input.value !== value)
      input.value = value
  })

  return { root, input }
}

export type FileValue = { dataUrl: string | null; name: string | null }

export function fileRow(
  label: string,
  binding: Binding<FileValue>,
): HTMLElement {
  const input = h('input', {
    attrs: { type: 'file', accept: 'image/*', hidden: '' },
  })
  const thumb = h('img', { class: 'file-thumb', attrs: { alt: '' } })
  const name = h('span', { class: 'row-value file-name' })
  const remove = h(
    'button',
    {
      class: 'icon-btn',
      attrs: { type: 'button', 'aria-label': 'Remove image' },
    },
    svg(icons.close),
  )
  const filled = h('span', { class: 'file-filled' }, thumb, name, remove)
  const empty = h(
    'span',
    { class: 'file-empty' },
    h('span', { class: 'row-value', text: 'Upload' }),
    svg(icons.upload),
  )
  const root = h(
    'label',
    { class: 'row row-file' },
    input,
    h('span', { class: 'row-label', text: label }),
    empty,
    filled,
  )

  const read = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string')
        binding.write({ dataUrl: reader.result, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) read(file)
  })
  remove.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    input.value = ''
    binding.write({ dataUrl: null, name: null })
  })
  root.addEventListener('dragover', (event) => {
    event.preventDefault()
    root.dataset.drag = 'true'
  })
  root.addEventListener('dragleave', () => {
    root.dataset.drag = 'false'
  })
  root.addEventListener('drop', (event) => {
    event.preventDefault()
    root.dataset.drag = 'false'
    const file = event.dataTransfer?.files?.[0]
    if (file?.type.startsWith('image/')) read(file)
  })

  bindElement(binding, (value) => {
    const has = value.dataUrl !== null
    empty.hidden = has
    filled.hidden = !has
    if (value.dataUrl && thumb.getAttribute('src') !== value.dataUrl)
      thumb.src = value.dataUrl
    name.textContent = value.name ?? ''
  })

  return root
}

export function noteRow(text: string): HTMLElement {
  return h('p', { class: 'note', text })
}

export function button(
  label: string,
  onClick: (button: HTMLButtonElement) => void,
  variant: 'default' | 'primary' = 'default',
): HTMLButtonElement {
  const element = h('button', {
    class: `btn btn-${variant}`,
    text: label,
    attrs: { type: 'button' },
  })
  element.addEventListener('click', () => onClick(element))
  return element
}

export function iconButton(
  icon: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const element = h(
    'button',
    {
      class: 'icon-btn',
      attrs: { type: 'button', 'aria-label': label, title: label },
    },
    svg(icon),
  )
  element.addEventListener('click', onClick)
  return element
}

export function buttonRow(...buttons: HTMLElement[]): HTMLElement {
  return h('div', { class: 'btn-row' }, ...buttons)
}
