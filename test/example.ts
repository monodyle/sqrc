import { writeFileSync } from 'node:fs'
import { Matrix } from '../src/matrix'

const size = 128
const { path } = new Matrix('Hello World!', 'M').toPath(size, {
  eyePatternShape: 'square',
  shape: 'square',
})
writeFileSync(
  'hello.svg',
  `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`,
)
