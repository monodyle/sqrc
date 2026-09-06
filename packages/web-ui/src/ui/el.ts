export type Child = Node | string | null | false | undefined

export type ElementProps = {
  class?: string
  text?: string
  attrs?: Record<string, string>
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (props.class) element.className = props.class
  if (props.text !== undefined) element.textContent = props.text
  if (props.attrs) {
    for (const [name, value] of Object.entries(props.attrs))
      element.setAttribute(name, value)
  }
  for (const child of children) if (child) element.append(child)
  return element
}

export function svg(markup: string): SVGSVGElement {
  const template = document.createElement('template')
  template.innerHTML = markup.trim()
  const node = template.content.firstElementChild
  if (!(node instanceof SVGSVGElement)) throw new Error('svg() needs <svg>')
  node.setAttribute('aria-hidden', 'true')
  return node
}

export type Binding<T> = {
  read(): T
  write(value: T): void
  subscribe(listener: () => void): () => void
}

export function bindElement<T>(
  binding: Binding<T>,
  apply: (value: T) => void,
): void {
  const sync = () => apply(binding.read())
  binding.subscribe(sync)
  sync()
}
