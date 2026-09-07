// Regenerates the README preview images from the built library so the docs
// always show what the current code actually renders. Run `pnpm build` first,
// then `pnpm examples`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { QRCode } from '../dist/index.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'examples')

const logo = (file, mime) =>
  `data:${mime};base64,${readFileSync(join(outDir, 'logos', file)).toString('base64')}`

const examples = [
  {
    file: 'output.png',
    value: 'https://github.com/monodyle/sqrc',
    ecc: 'H',
    size: 512,
    options: {
      shape: 'circle',
      gap: 2,
      eyePatternShape: 'rounded',
      foreground: { from: '#7b71ff', to: '#37356e', type: 'radial' },
      eyeColor: '#37356e',
      logo: {
        url: logo('avatar.png', 'image/png'),
        width: 110,
        padding: 4,
        style: 'circle',
        emptyBackground: true,
      },
    },
  },
  {
    file: 'eyes.png',
    value: 'https://github.com/monodyle/sqrc',
    ecc: 'H',
    size: 480,
    options: {
      shape: 'square',
      eyePatternShape: 'rounded',
      background: '#f2f1eb',
      foreground: '#3e3232',
      eyeColor: ['indigo', '#1a4d2e', '#0c134f'],
    },
  },
  {
    file: 'style-square.png',
    value: 'https://example.com/',
    ecc: 'M',
    size: 256,
    options: { shape: 'square', eyePatternShape: 'square' },
  },
  {
    file: 'style-circle.png',
    value: 'https://www.starbucks.com/',
    ecc: 'H',
    size: 256,
    options: {
      shape: 'circle',
      eyePatternShape: 'rounded',
      eyeColor: '#006341',
      logo: {
        url: logo('starbucks.png', 'image/png'),
        width: 48,
        style: 'circle',
        emptyBackground: true,
      },
    },
  },
  {
    file: 'style-rounded.png',
    value: '0xFFA49ed5fe4fc971bCf1422CDa1DcA6CF29B7557',
    ecc: 'H',
    size: 256,
    options: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      foreground: { from: '#c0662d', to: '#6e4020', rotation: Math.PI / 4 },
      logo: {
        url: logo('metamask.png', 'image/png'),
        width: 48,
        emptyBackground: true,
      },
    },
  },
  {
    file: 'style-diamond.png',
    value: 'https://github.com/monodyle',
    ecc: 'H',
    size: 256,
    options: {
      shape: 'diamond',
      eyePatternShape: 'rounded',
      foreground: { from: '#1f1a3d', to: '#0d1117', type: 'radial' },
      logo: {
        url: logo('github.png', 'image/png'),
        width: 56,
        padding: 4,
        style: 'circle',
        emptyBackground: true,
      },
    },
  },
]

mkdirSync(outDir, { recursive: true })

for (const { file, value, ecc, size, options } of examples) {
  const svg = await new QRCode(value, { errorCorrectionLevel: ecc }).toSvg(size, options)
  const png = new Resvg(svg, { background: '#ffffff' }).render().asPng()
  writeFileSync(join(outDir, file), png)
  console.log(`wrote examples/${file}`)
}
