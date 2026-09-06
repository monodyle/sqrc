import QRCode from 'qrcode'
import { type LogoMetrics, logoKnockoutRange } from './logo'
import { generatePath, type QRCodeMatrix, type TransformOptions } from './paths'

export type QRCodeErrorCorrectionLevelType = 'L' | 'H' | 'Q' | 'M'
export type { PathCommand, PathGroup, TransformOptions } from './paths'
export type {
  LogoMetrics,
  LogoOptions,
  LogoSource,
  LogoStyle,
  ResolvedLogoSource,
} from './logo'
export type { FillSpec, GradientSpec } from './color'

const QUIET_ZONE = 4

// Error-correction only recovers errors within each EC block, not across the
// whole symbol. A center logo concentrates its damage where block boundaries
// converge, so on low versions (few, large blocks) it can wipe out more of a
// block than that block can recover even though the global percentage looks
// safe. Bumping the version splits the data into more blocks, spreading the
// same logo damage thinly enough to stay correctable.
const MAX_LOGO_DARK_FRACTION = 0.12

function createMatrix(
  value: string,
  ecc: QRCodeErrorCorrectionLevelType,
  version?: number,
): { matrix: QRCodeMatrix; version: number } {
  const created = QRCode.create(value, { errorCorrectionLevel: ecc, version })
  const flat = Array.from(created.modules.data) as Array<0 | 1>
  const size = Math.sqrt(flat.length)

  const matrix = flat.reduce((rows, key, index) => {
    if (index % size === 0) rows.push([key])
    else rows[rows.length - 1].push(key)

    return rows
  }, [] as QRCodeMatrix)

  return { matrix, version: created.version }
}

export class Matrix {
  protected value: QRCodeMatrix
  private version: number
  private readonly input: string
  private readonly ecc: QRCodeErrorCorrectionLevelType

  constructor(
    value: string,
    ecc: QRCodeErrorCorrectionLevelType,
    version?: number,
  ) {
    const { matrix, version: resolvedVersion } = createMatrix(value, ecc, version)

    this.input = value
    this.ecc = ecc
    this.version = resolvedVersion
    this.value = matrix
  }

  getValue() {
    return this.value
  }

  toPath(size: number, options?: TransformOptions) {
    const logo = options?.logo
    if (!logo) {
      return generatePath(this.value, QUIET_ZONE, size, options, this.version)
    }

    // With a logo, retry at increasing versions until the modules it knocks
    // out are a small enough share of the dark modules to stay correctable.
    for (let version = this.version; version <= 40; version++) {
      const { matrix } = createMatrix(this.input, this.ecc, version)
      const result = generatePath(matrix, QUIET_ZONE, size, options, version)
      if (this.logoDamageIsRecoverable(matrix, result.logoMetrics, size)) {
        this.value = matrix
        this.version = version
        return result
      }
    }

    throw new Error(
      'Logo is too large to scan at any QR version. Reduce the logo size or raise the error-correction level.',
    )
  }

  private logoDamageIsRecoverable(
    matrix: QRCodeMatrix,
    logoMetrics: LogoMetrics | undefined,
    size: number,
  ): boolean {
    if (!logoMetrics) return true

    const cellSize = size / (matrix.length + QUIET_ZONE * 2)
    const range = logoKnockoutRange(
      logoMetrics,
      cellSize,
      QUIET_ZONE,
      matrix.length,
    )

    let darkKnocked = 0
    let darkTotal = 0
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        if (matrix[i][j] !== 1) continue
        darkTotal++
        if (
          i >= range.rowStart &&
          i <= range.rowEnd &&
          j >= range.colStart &&
          j <= range.colEnd
        )
          darkKnocked++
      }
    }

    return darkTotal > 0 && darkKnocked / darkTotal <= MAX_LOGO_DARK_FRACTION
  }
}
