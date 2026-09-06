import { $, flashButton } from './lib/dom'
import { buildSnippet, highlight } from './lib/snippet'
import { store } from './state'

export function initCode(): void {
  const output = $<HTMLElement>('#code-out')
  const copy = $<HTMLButtonElement>('#btn-copy-code')

  const sync = () => {
    output.innerHTML = highlight(buildSnippet(store.get()))
  }
  store.subscribe(sync)
  sync()

  copy.addEventListener('click', (event) => {
    // The button sits inside <summary>; a plain click would also toggle it.
    event.preventDefault()
    event.stopPropagation()
    flashButton(
      copy,
      () => navigator.clipboard.writeText(buildSnippet(store.get())),
      'Copied',
    )
  })
}
