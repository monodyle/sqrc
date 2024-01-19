# Styled QRCode

<img src="test/output.png" height="192" align="right" />

Generate a customizable styled QRCode in NodeJS with TypeScript supported.

## Installation

```bash
# Using npm
npm install sqrc

# Using yarn
yarn add sqrc

# Using pnpm
pnpm add sqrc
```

## Usage

```ts
const qr = new QRCode({
  value: 'https://github.com/monodyle/sqrc'
})

qr.render() // image buffer
```

## Options

- `value` (`string`): value encoded in the qr
- `ecLevel` (`L` | `M` | `Q` | `H`): error correction level
- `size` (`number`): dimension size
- `bgColor` (`string`): css color value for the background
- `fgColor` (`string`): css color value for the background
- `logoImage` (`string`): logo url
- `logoWidth` (`number`): logo width
- `logoHeight` (`number`): logo height
- `logoPadding` (`number`): border around logo
- `logoPaddingStyle` (`square` | `circle`): shape of the padding area around the logo
- `qrStyle` (`squares` | `dots`): style of the qr modules
- `eyeRadius` (`CornerRadii` | `CornerRadii[]`): the corner radius for the qr eyes
- `eyeColor` (`EyeColor` | `EyeColor[]`): the color for the qr eyes

# Credits

The idea is fork the original repo [gcoro/react-qrcode-logo](https://github.com/gcoro/react-qrcode-logo) which support React, then convert it into NodeJS, then customized it depend on my use cases.
