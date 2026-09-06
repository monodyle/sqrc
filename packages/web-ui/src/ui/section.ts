import { h, svg } from './el'
import { icons } from './icons'

export function section(title: string, ...rows: HTMLElement[]): HTMLElement {
  const body = h('div', { class: 'section-body' }, ...rows)
  const toggle = h(
    'button',
    {
      class: 'section-head',
      attrs: { type: 'button', 'aria-expanded': 'true' },
    },
    h('span', { text: title }),
    svg(icons.chevron),
  )
  const root = h('section', { class: 'section' }, toggle, body)

  toggle.addEventListener('click', () => {
    const open = root.dataset.collapsed === 'true'
    root.dataset.collapsed = open ? 'false' : 'true'
    toggle.setAttribute('aria-expanded', String(open))
  })

  return root
}

export function group(...rows: HTMLElement[]): HTMLElement {
  return h('div', { class: 'section-body' }, ...rows)
}
