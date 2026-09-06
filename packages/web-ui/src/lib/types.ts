import type { QRCodeErrorCorrectionLevelType } from 'sqrc'

export type Shape = 'square' | 'circle' | 'rounded' | 'diamond'
export type EyeShape = 'square' | 'rounded'
export type EyeColorMode = 'inherit' | 'single' | 'triple'
export type LogoStyle = 'square' | 'circle'

// The UI edits a gradient and a flat color as one control pair; `color` is
// the flat value used while `gradient` is off, `from`/`to` while it is on.
export type FillState = {
  gradient: boolean
  color: string
  from: string
  to: string
  rotation: number // degrees, converted to radians for the library
}

export type LogoState = {
  dataUrl: string | null
  name: string | null
  size: number // percentage of the output size
  padding: number
  opacity: number
  style: LogoStyle
  emptyBackground: boolean
}

export type StudioState = {
  value: string
  ecc: QRCodeErrorCorrectionLevelType
  shape: Shape
  eyePatternShape: EyeShape
  gap: number
  eyePatternGap: number
  foreground: FillState
  background: FillState
  eyeColorMode: EyeColorMode
  eyeColor: string
  eyeColors: [string, string, string]
  logo: LogoState
  exportSize: number
}
