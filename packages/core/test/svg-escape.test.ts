import { describe, expect, test } from 'vitest'
import { QRCode } from '../src'

// A data URL whose mediatype section carries a double quote. It still parses
// (the header ends with ;base64 and the payload is valid base64), so without
// attribute escaping the quote would break out of the <image href="...">
// attribute the moment the SVG string is inlined into a page.
const QUOTE_IN_HEADER = 'data:x";y;base64,AA=='

describe('SVG logo href escaping', () => {
  test('escapes a quote in the logo data URL so it cannot break the attribute', async () => {
    const svg = await new QRCode('sqrc xss', {
      errorCorrectionLevel: 'H',
    }).toSvg(256, {
      logo: { url: QUOTE_IN_HEADER, width: 40, height: 40 },
    })

    expect(svg).toContain('href="data:x&quot;')
    expect(svg).not.toContain('href="data:x"')
  })
})
