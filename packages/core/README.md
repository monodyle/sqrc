# Styled QRCode

<img src="examples/output.png" height="192" align="right" />

A customizable, styled QR code generator for Node and the browser, written in TypeScript.
The SVG and canvas outputs pull in zero native dependencies, so they work anywhere a string or a 2D context does.

## Installation

```bash
npm install sqrc
```

## Usage

```ts
import { QRCode } from 'sqrc'

const qr = new QRCode('https://github.com/monodyle/sqrc')

const svg = await qr.toSvg(300)
await qr.toCanvas(ctx, 300)
const png = await qr.toPng(300) // Node only, requires @napi-rs/canvas
```

See the [full documentation](https://github.com/monodyle/sqrc#readme) for render methods, every option, gradients, eyes, and migration notes from 0.x.

## Credits

- Inspired by and based on the ideas of [gcoro/react-qrcode-logo](https://github.com/gcoro/react-qrcode-logo), which targets React.
