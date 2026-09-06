export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`missing element: ${selector}`)
  return element
}

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to decode image'))
    image.src = source
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  // Give the click a frame to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normalizeHex(raw: string): string | null {
  const value = raw.trim()
  if (!HEX_PATTERN.test(value)) return null
  if (value.length === 4) {
    const [r, g, b] = value.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return value.toLowerCase()
}

// Flashes a button's label to confirm a one-shot action, then restores it.
// Text swaps are instant by design; only color transitions, so the feedback
// never feels slow on repeated use.
export function flashButton(
  button: HTMLButtonElement,
  run: () => Promise<void> | void,
  okLabel = 'Done',
): void {
  const label = button.textContent ?? ''
  button.disabled = true
  Promise.resolve(run())
    .then(() => {
      button.textContent = okLabel
      button.dataset.state = 'ok'
    })
    .catch(() => {
      button.textContent = 'Failed'
      button.dataset.state = 'fail'
    })
    .finally(() => {
      setTimeout(() => {
        button.textContent = label
        delete button.dataset.state
        button.disabled = false
      }, 1300)
    })
}
