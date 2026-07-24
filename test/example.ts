import { writeFileSync } from 'node:fs'
import { QRCode } from '../src'

const size = 128
const svg = await new QRCode('Hello!!').toSvg(size)
writeFileSync('hello.svg', svg)
