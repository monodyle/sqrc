export type QREyeColor = string | QRInnerOuterEyeColor
export type QRInnerOuterEyeColor = {
  inner: string
  outer: string
}

export type QREyeCornerRadius =
  | number
  | [number, number, number, number]
  | QREyesInnerOuterRadius
export type QREyesInnerOuterRadius = {
  inner: number | [number, number, number, number]
  outer: number | [number, number, number, number]
}

export type QRLogoOptions = {
  url: string
  width?: number
  height?: number
  padding?: number
  opacity?: number
  emptyBackground?: boolean
  style?: 'square' | 'circle'
}

export type QREyesOptions = {
  radius?:
    | QREyeCornerRadius
    | [QREyeCornerRadius, QREyeCornerRadius, QREyeCornerRadius]
  color?: QREyeColor | [QREyeColor, QREyeColor, QREyeColor]
}

export type QRColorGradientType = 'radial' | 'linear'
export type QRColorGradient = {
  from: string
  to: string
  type?: QRColorGradientType
  rotation?: number
}
export type QRColorType = string | QRColorGradient

export type QROptionsWithDefaultValue = {
  ecc: ErrorCorrectionLevel
  version: TypeNumber
  size: number
  quietZone: number
  foreground: QRColorType
  background: string
  moduleStyle: 'square' | 'dots' | 'rounded' | 'extraRounded' | 'classy'
}
export type QROptions = QROptionsWithDefaultValue & {
  logo?: QRLogoOptions
  eyes?: QREyesOptions
  moduleScale?: number
}

export type QRCoordinates = {
  row: number
  col: number
}

export type DrawModuleOptions = QRCoordinates & {
  size: number
  rotation?: number
}

export type RotateModuleOptions = DrawModuleOptions & {
  draw: () => void
}
