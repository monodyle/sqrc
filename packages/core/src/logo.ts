// Logo placement and knockout math. Pure geometry lives here (sync, tested
// without any image decoding); image decoding is pushed to the adapters so
// the browser SVG path pulls zero native deps and the node PNG path isolates
// @napi-rs/canvas.

export type LogoStyle = 'square' | 'circle'

export type LogoSource = string | Uint8Array | ArrayBuffer

export type LogoOptions = {
  // A data: URL, a raw image buffer, or an ArrayBuffer. Remote http(s) URLs
  // are not fetched here (keeps this network-free); fetch first and pass the
  // resulting bytes or data URL.
  url: LogoSource
  width?: number
  height?: number
  padding?: number
  opacity?: number
  style?: LogoStyle
  // Knock out the QR modules behind the padded logo area (drawn in the
  // background color) so the logo sits on a clean field.
  emptyBackground?: boolean
}

export type LogoMetrics = {
  x: number
  y: number
  width: number
  height: number
  padX: number
  padY: number
  padWidth: number
  padHeight: number
  padding: number
  opacity: number
  style: LogoStyle
  emptyBackground: boolean
}

export type ResolvedLogoSource = {
  dataUrl: string
  // Raw bytes for runtimes that decode via a native Image (the PNG path).
  bytes: Uint8Array
  contentType: string
  // Intrinsic dimensions when they can be sniffed (PNG/SVG). Rendering sizes
  // the logo from LogoMetrics, not these, so they stay optional for formats
  // whose headers we don't parse (JPEG/GIF/WebP).
  width?: number
  height?: number
}

// A logo larger than this fraction of the QR would remove more modules than
// even the highest error-correction level can recover, so reject it outright
// rather than emit a code that silently fails to scan.
const MAX_LOGO_FRACTION = 0.22

function sniffContentType(bytes: Uint8Array): string {
  const [a, b, c, d, e, f, g, h] = bytes
  if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return 'image/png'
  if (a === 0xff && b === 0xd8 && c === 0xff) return 'image/jpeg'
  if (a === 0x47 && b === 0x49 && c === 0x46) return 'image/gif'
  // RIFF....WEBP
  if (
    a === 0x52 &&
    b === 0x49 &&
    c === 0x46 &&
    d === 0x46 &&
    e === 0x57 &&
    f === 0x45 &&
    g === 0x42 &&
    h === 0x50
  )
    return 'image/webp'
  const head = String.fromCharCode(...bytes.slice(0, 64))
  if (head.includes('<svg') || head.includes('<?xml')) return 'image/svg+xml'
  return 'application/octet-stream'
}

function readPngDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  // PNG IHDR sits at a fixed offset: bytes 16..23 hold width/height big-endian.
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  if (!isPng || bytes.length < 24) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function svgDimensions(text: string): { width: number; height: number } {
  const widthAttr = text.match(/<svg[^>]*\swidth=["'](\d+(?:\.\d+)?)/i)
  const heightAttr = text.match(/<svg[^>]*\sheight=["'](\d+(?:\.\d+)?)/i)
  if (widthAttr && heightAttr) {
    return {
      width: Number.parseFloat(widthAttr[1]),
      height: Number.parseFloat(heightAttr[1]),
    }
  }
  const viewBox = text.match(
    /<svg[^>]*\sviewBox=["'][\d.\s]+,?([\d.]+)[\s,]+([\d.]+)["']/i,
  )
  if (viewBox)
    return {
      width: Number.parseFloat(viewBox[1]),
      height: Number.parseFloat(viewBox[2]),
    }
  return { width: 100, height: 100 }
}

function toBytes(source: LogoSource): Uint8Array {
  if (source instanceof Uint8Array) return source
  if (source instanceof ArrayBuffer) return new Uint8Array(source)

  // A data URL: strip the header and decode the (possibly base64) payload.
  if (source.startsWith('data:')) {
    const comma = source.indexOf(',')
    const header = source.slice(0, comma)
    const payload = source.slice(comma + 1)
    const isBase64 = /;base64$/i.test(header)
    if (isBase64) {
      const binary = atob(payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    }
    return new TextEncoder().encode(decodeURIComponent(payload))
  }

  throw new Error(
    'Logo source must be a data: URL, a raw image buffer, or an ArrayBuffer. Fetch remote URLs first and pass the resulting bytes.',
  )
}

// Decode an inline logo (data URL or raw bytes) into the bytes + intrinsic
// dimensions the renderers need. Remote http(s) URLs are not fetched here so
// this stays free of any network dependency; callers that want remote logos
// fetch first and pass the resulting bytes/data URL.
export function resolveLogoSource(logo: LogoOptions): ResolvedLogoSource {
  const bytes = toBytes(logo.url)
  const contentType = sniffContentType(bytes)

  let width: number | undefined
  let height: number | undefined
  if (typeof logo.width === 'number' && typeof logo.height === 'number') {
    width = logo.width
    height = logo.height
  } else if (contentType === 'image/svg+xml') {
    const intrinsic = svgDimensions(new TextDecoder().decode(bytes))
    width = logo.width ?? intrinsic.width
    height = logo.height ?? intrinsic.height
  } else {
    // PNG headers carry their dimensions; other raster formats don't get
    // sniffed here because rendering sizes the logo from LogoMetrics anyway.
    const png = readPngDimensions(bytes)
    width = logo.width ?? png?.width
    height = logo.height ?? png?.height
  }

  const isBase64Source =
    typeof logo.url === 'string' &&
    /;base64,/.test(logo.url.slice(0, logo.url.indexOf(',') + 1))
  const dataUrl = isBase64Source
    ? (logo.url as string)
    : `data:${contentType};base64,${bytesToBase64(bytes)}`

  return { dataUrl, bytes, contentType, width, height }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Compute where the logo and its padding sit, in pixels, centered on the
// canvas. Dimensions default to 20% of the canvas (matching the prior
// behavior) and honor an explicit height independently of width.
export function computeLogoMetrics(
  logo: LogoOptions,
  size: number,
): LogoMetrics {
  const width = logo.width ?? size * 0.2
  const height = logo.height ?? width
  const padding = logo.padding ?? 0
  const style = logo.style ?? 'square'
  const opacity = logo.opacity ?? 1
  const emptyBackground = logo.emptyBackground ?? false

  if (width > size * MAX_LOGO_FRACTION || height > size * MAX_LOGO_FRACTION) {
    throw new Error(
      `Logo is too large to scan: ${Math.round(width)}x${Math.round(height)} exceeds ` +
        `${Math.round(MAX_LOGO_FRACTION * 100)}% of the ${size}px canvas. Reduce logo size or raise the error-correction level.`,
    )
  }

  const x = (size - width) / 2
  const y = (size - height) / 2

  return {
    x,
    y,
    width,
    height,
    padX: x - padding,
    padY: y - padding,
    padWidth: width + 2 * padding,
    padHeight: height + 2 * padding,
    padding,
    opacity,
    style,
    emptyBackground,
  }
}

// The range of QR matrix cells (row/column indices) hidden behind the logo
// plus a one-cell margin, so the logo never touches a live module. Callers
// skip these cells when emitting modules.
export function logoKnockoutRange(
  metrics: LogoMetrics,
  cellSize: number,
  quietZone: number,
  moduleCount: number,
): { rowStart: number; rowEnd: number; colStart: number; colEnd: number } {
  const margin = 1
  const usePad = metrics.emptyBackground && metrics.padding > 0
  const left = (usePad ? metrics.padX : metrics.x) / cellSize - quietZone
  const top = (usePad ? metrics.padY : metrics.y) / cellSize - quietZone
  const right =
    (usePad ? metrics.padX + metrics.padWidth : metrics.x + metrics.width) /
      cellSize -
    quietZone
  const bottom =
    (usePad ? metrics.padY + metrics.padHeight : metrics.y + metrics.height) /
      cellSize -
    quietZone

  const colStart = Math.max(0, Math.floor(left) - margin)
  const colEnd = Math.min(moduleCount - 1, Math.ceil(right) + margin)
  const rowStart = Math.max(0, Math.floor(top) - margin)
  const rowEnd = Math.min(moduleCount - 1, Math.ceil(bottom) + margin)

  return { rowStart, rowEnd, colStart, colEnd }
}
