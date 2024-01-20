import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { QRCode } from '../src'

const test = new QRCode('https://github.com/monodyle/sqrc', {
  size: 512,
  quietZone: 10,
  logo: {
    url: 'https://avatars.githubusercontent.com/u/30283022',
    padding: 4,
    width: 118,
    style: 'circle',
    emptyBackground: true
  },
  foreground: {
    from: '#7b71ff',
    to: '#37356e',
    type: 'radial'
  },
  ecc: 'H',
  // moduleStyle: 'dots',
  eyes: {
    radius: [
      [48, 48, 8, 48],
      [48, 48, 48, 8],
      [48, 8, 48, 48]
    ],
    color: {
      inner: '#7b71ff',
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
  foreground: '#88ab8e',
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
      '#638889',
      {
        inner: '#756ab6',
        outer: '#dbcc95',
      },
    ]
  }
})
customEyes.render().then(buffer => {
  writeFileSync(path.join(__dirname, 'eyes.png'), buffer)
  console.debug('writed eyes.png')
})
