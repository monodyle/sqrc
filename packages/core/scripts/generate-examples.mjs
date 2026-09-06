// Regenerates the README preview images from the built library so the docs
// always show what the current code actually renders. Run `pnpm build` first,
// then `pnpm examples`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { QRCode } from '../dist/index.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 512

const logoBytes = readFileSync(join(root, 'test/fixtures/logo.png'))
const logoUrl = `data:image/png;base64,${logoBytes.toString('base64')}`

const examples = [
  {
    file: 'output.png',
    value: 'https://github.com/monodyle/sqrc',
    ecc: 'H',
    options: {
      shape: 'rounded',
      foreground: { from: '#1a1a2e', to: '#0d0d17', rotation: Math.PI / 4 },
      logo: {
        url: logoUrl,
        width: 96,
        height: 96,
        padding: 8,
        emptyBackground: true,
      },
    },
  },
  {
    file: 'style-square.png',
    value: 'sqrc',
    ecc: 'M',
    options: { shape: 'square' },
  },
  {
    file: 'style-circle.png',
    value: 'sqrc',
    ecc: 'M',
    options: { shape: 'circle' },
  },
  {
    file: 'style-rounded.png',
    value: 'sqrc',
    ecc: 'M',
    options: { shape: 'rounded' },
  },
  {
    file: 'style-diamond.png',
    value: 'sqrc',
    ecc: 'M',
    options: { shape: 'diamond' },
  },
  {
    file: 'eyes.png',
    value: 'https://github.com/monodyle/sqrc',
    ecc: 'H',
    options: {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      eyeColor: ['#7f0000', '#004d00', '#00004d'],
    },
  },
]

const outDir = join(root, 'examples')
mkdirSync(outDir, { recursive: true })

for (const { file, value, ecc, options } of examples) {
  const svg = await new QRCode(value, { errorCorrectionLevel: ecc }).toSvg(
    SIZE,
    options,
  )
  const png = new Resvg(svg, { background: '#ffffff' }).render().asPng()
  writeFileSync(join(outDir, file), png)
  console.log(`wrote examples/${file}`)
}
