import type { FillState, StudioState } from './types'

// Clean radian literals for the angles the rotation slider snaps to; any
// other angle falls back to a rounded decimal.
const ROTATION_LITERALS: Record<number, string> = {
  45: 'Math.PI / 4',
  90: 'Math.PI / 2',
  135: '(3 * Math.PI) / 4',
  180: 'Math.PI',
}

function quote(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')}'`
}

// Expands shorthand so `#fff` and `#ffffff` compare equal when deciding
// whether a fill differs from the library default.
function canonicalHex(color: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return color.toLowerCase()
  const digits = match[1].toLowerCase()
  if (digits.length === 3) {
    const [r, g, b] = digits
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return `#${digits}`
}

function isDefaultFill(fill: FillState, canonicalDefault: string): boolean {
  return !fill.gradient && canonicalHex(fill.color) === canonicalDefault
}

function fillLiteral(fill: FillState): string {
  if (!fill.gradient) return quote(fill.color)
  const rotation =
    fill.rotation === 0
      ? ''
      : `, rotation: ${ROTATION_LITERALS[fill.rotation] ?? ((fill.rotation * Math.PI) / 180).toFixed(2)}`
  return `{ from: ${quote(fill.from)}, to: ${quote(fill.to)}${rotation} }`
}

// Emits only the options that differ from the library defaults, so the
// snippet reads like something a person would actually write.
export function buildSnippet(state: StudioState): string {
  const lines: string[] = [`import { QRCode } from 'sqrc'`, '']

  if (state.logo.dataUrl) {
    lines.push(
      '// Pass the logo as raw image bytes or a data: URL (remote URLs are not fetched)',
      'const logoUrl: Uint8Array = await fetch(logoHref).then((res) => new Uint8Array(await res.arrayBuffer()))',
      '',
    )
  }

  const constructorOptions: string[] = []
  if (state.ecc !== 'M')
    constructorOptions.push(`  errorCorrectionLevel: '${state.ecc}',`)

  lines.push(
    constructorOptions.length > 0
      ? `const qr = new QRCode(${quote(state.value)}, {`
      : `const qr = new QRCode(${quote(state.value)})`,
  )
  lines.push(...constructorOptions)
  if (constructorOptions.length > 0) lines.push('})')
  lines.push('')

  const renderOptions: string[] = []
  if (state.shape !== 'rounded')
    renderOptions.push(`  shape: '${state.shape}',`)
  if (state.eyePatternShape !== 'rounded')
    renderOptions.push(`  eyePatternShape: '${state.eyePatternShape}',`)
  if (state.gap !== 0) renderOptions.push(`  gap: ${state.gap},`)
  if (state.eyePatternGap !== 0)
    renderOptions.push(`  eyePatternGap: ${state.eyePatternGap},`)
  if (!isDefaultFill(state.foreground, '#000000'))
    renderOptions.push(`  foreground: ${fillLiteral(state.foreground)},`)
  if (!isDefaultFill(state.background, '#ffffff'))
    renderOptions.push(`  background: ${fillLiteral(state.background)},`)
  if (state.eyeColorMode === 'single')
    renderOptions.push(`  eyeColor: ${quote(state.eyeColor)},`)
  if (state.eyeColorMode === 'triple')
    renderOptions.push(
      `  eyeColor: [${state.eyeColors.map((color) => quote(color)).join(', ')}],`,
    )

  if (state.logo.dataUrl) {
    const width = Math.round((state.exportSize * state.logo.size) / 100)
    const logoLines = ['  logo: {', '    url: logoUrl,', `    width: ${width},`]
    if (state.logo.padding !== 0)
      logoLines.push(`    padding: ${state.logo.padding},`)
    if (state.logo.opacity !== 1)
      logoLines.push(`    opacity: ${state.logo.opacity},`)
    if (state.logo.style !== 'square')
      logoLines.push(`    style: '${state.logo.style}',`)
    if (state.logo.emptyBackground) logoLines.push('    emptyBackground: true,')
    logoLines.push('  },')
    renderOptions.push(...logoLines)
  }

  lines.push(
    renderOptions.length > 0
      ? `const svg = await qr.toSvg(${state.exportSize}, {`
      : `const svg = await qr.toSvg(${state.exportSize})`,
  )
  lines.push(...renderOptions)
  if (renderOptions.length > 0) lines.push('})')

  return `${lines.join('\n')}\n`
}

// Minimal token highlighter. The source is HTML-escaped first, so user
// input in the encoded value can never inject markup.
const TOKEN =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|\b(import|from|const|new|await)\b|\b(\d+(?:\.\d+)?)\b/g

export function highlight(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      TOKEN,
      (match, comment?: string, str?: string, keyword?: string) => {
        if (comment) return `<span class="tok-comment">${match}</span>`
        if (str) return `<span class="tok-string">${match}</span>`
        if (keyword) return `<span class="tok-keyword">${match}</span>`
        return `<span class="tok-number">${match}</span>`
      },
    )
}
