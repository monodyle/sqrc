import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { QRCode } from '../src'

const test = new QRCode('https://github.com/monodyle/sqrc', {
  size: 512,
  quietZone: 10,
  logo: {
    url: 'https://avatars.githubusercontent.com/u/30283022',
    padding: 4,
    width: 110,
    style: 'circle',
    emptyBackground: true
  },
  foreground: {
    from: '#7b71ff',
    to: '#37356e',
    type: 'radial'
  },
  ecc: 'H',
  moduleStyle: 'dots',
  moduleScale: 0.8,
  eyes: {
    radius: [
      [48, 48, 8, 48],
      [48, 48, 48, 8],
      [48, 8, 48, 48]
    ],
    color: {
      inner: '#534ea9',
      outer: '#37356e'
    }
  }
})
test.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'output.png'), buffer)
  console.debug('writed output.png')
})

const customEyes = new QRCode('https://github.com/monodyle/sqrc', {
  size: 480,
  background: '#f2f1eb9f',
  foreground: '#3e3232',
  eyes: {
    radius: [
      [48, 48, 8, 48],
      {
        outer: [48, 8, 48, 8],
        inner: [0, 48, 0, 48]
      },
      { inner: 4, outer: 100 }
    ],
    color: [
      {
        inner: 'blueviolet',
        outer: 'indigo'
      },
      '#1a4d2e',
      {
        inner: '#071952',
        outer: '#0c134f'
      }
    ]
  }
})
customEyes.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'eyes.png'), buffer)
  console.debug('writed eyes.png')
})

const square = new QRCode('https://example.com/', {
  size: 256,
  moduleStyle: 'square'
})
square.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'style-square.png'), buffer)
  console.debug('writed style-square.png')
})

const dots = new QRCode('https://www.starbucks.com/', {
  size: 256,
  background: '#fff',
  foreground: '#000',
  moduleStyle: 'dots',
  logo: {
    url: 'https://www.starbucks.vn/media/jlrf0uhs/logo_tcm89-366_w1024_n.png',
    style: 'circle',
    padding: 2,
    width: 48,
    emptyBackground: true
  },
  eyes: {
    radius: 48,
    color: '#006341'
  }
})
dots.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'style-dots.png'), buffer)
  console.debug('writed style-dots.png')
})

const rounded = new QRCode('0xFFA49ed5fe4fc971bCf1422CDa1DcA6CF29B7557', {
  size: 256,
  background: '#fff',
  foreground: {
    from: '#c0662d',
    to: '#6e4020',
    rotation: 45
  },
  moduleStyle: 'extraRounded',
  logo: {
    url: 'https://avatars.githubusercontent.com/u/11744586',
    width: 48,
    emptyBackground: true
  },
  eyes: {
    radius: 8
  }
})
rounded.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'style-rounded.png'), buffer)
  console.debug('writed style-rounded.png')
})

const classy = new QRCode('https://github.com/monodyle', {
  size: 256,
  background: '#fff',
  foreground: {
    from: '#292950',
    to: '#0d1117',
    type: 'radial'
  },
  logo: {
    url: 'https://github.githubassets.com/assets/apple-touch-icon-180x180-a80b8e11abe2.png',
    style: 'circle',
    width: 64,
    emptyBackground: true
  },
  moduleStyle: 'classy',
  eyes: {
    radius: [
      [48, 0, 48, 0],
      [0, 48, 0, 48],
      [48, 0, 48, 0]
    ]
  }
})
classy.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'style-classy.png'), buffer)
  console.debug('writed style-classy.png')
})
