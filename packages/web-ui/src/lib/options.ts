import type {
  FillSpec,
  GradientSpec,
  LogoOptions,
  TransformOptions,
} from 'sqrc'
import type { FillState, StudioState } from './types'

export function toFill(fill: FillState): FillSpec {
  if (!fill.gradient) return fill.color
  const spec: GradientSpec = { from: fill.from, to: fill.to }
  if (fill.rotation !== 0) spec.rotation = (fill.rotation * Math.PI) / 180
  return spec
}

// Builds the library options object for a given output size. Logo dimensions
// are relative (a percentage of the size) in the UI, so they resolve here
// against the size actually being rendered.
export function buildOptions(
  state: StudioState,
  size: number,
): TransformOptions {
  const options: TransformOptions = {
    shape: state.shape,
    eyePatternShape: state.eyePatternShape,
    gap: state.gap,
    eyePatternGap: state.eyePatternGap,
    foreground: toFill(state.foreground),
    background: toFill(state.background),
  }

  if (state.eyeColorMode === 'single') options.eyeColor = state.eyeColor
  if (state.eyeColorMode === 'triple') options.eyeColor = [...state.eyeColors]

  if (state.logo.dataUrl) {
    const width = Math.round((size * state.logo.size) / 100)
    const logo: LogoOptions = {
      url: state.logo.dataUrl,
      width,
      height: width,
      padding: state.logo.padding,
      opacity: state.logo.opacity,
      style: state.logo.style,
      emptyBackground: state.logo.emptyBackground,
    }
    options.logo = logo
  }

  return options
}
