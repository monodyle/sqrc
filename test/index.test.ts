import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { QRCode } from '../src'

const test = new QRCode('https://github.com/monodyle/sqrc', {
  size: 512,
  quietZone: 10,
  logo: {
    url: 'https://github.com/monodyle/monodyle/raw/master/assets/me.png',
    padding: 4,
    width: 118,
    style: 'square',
    emptyBackground: true
  },
  ecLevel: 'H',
  moduleStyle: 'dots',
  eyes: {
    radius: [
      [48, 48, 8, 48],
      [48, 48, 48, 8],
      [48, 8, 48, 48]
    ]
  }
})
test
  .render()
  .then(buffer => writeFileSync(path.join(__dirname, 'output.png'), buffer))

const customEyes = new QRCode('https://github.com/monodyle/sqrc', {
  size: 480,
  background: '#F2F1EB',
  foreground: '#88AB8E',
  eyes: {
    radius: [
      [48, 48, 8, 48],
      {
        outer: [48, 8, 48, 8],
        inner: [0, 48, 0, 48]
      },
      { inner: 0, outer: 100 }
    ],
    color: [
      '#638889',
      '#638889',
      {
        inner: '#756AB6',
        outer: '#DBCC95',
      },
    ]
  }
})
customEyes
  .render()
  .then(buffer => writeFileSync(path.join(__dirname, 'eyes.png'), buffer))
