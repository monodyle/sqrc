import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { QRCode } from '../src'

const png = new QRCode({
  value: 'https://github.com/monodyle/sqrc',
  logoImage: 'https://github.com/monodyle/monodyle/raw/master/assets/me.png',
  removeQrCodeBehindLogo: true,
  size: 512,
  logoWidth: 128,
  quietZone: 10,
  logoPadding: 4,
  logoPaddingStyle: 'circle',
  ecLevel: 'M',
  qrStyle: 'dots',
  fgColor: '#1C1F25',
  bgColor: '#FFF',
  eyeRadius: [
    [48, 48, 8, 48],
    [48, 48, 48, 8],
    [48, 8, 48, 48]
  ]
})

png
  .render()
  .then(buffer => writeFileSync(path.join(__dirname, 'output.png'), buffer))
