import { defineConfig } from '@rslib/core'

export default defineConfig({
  source: {
    entry: { index: './src/index.ts' },
    tsconfigPath: './tsconfig.build.json',
  },
  lib: [
    { format: 'esm', dts: true },
    { format: 'cjs', dts: true },
    {
      // Self-contained browser bundle. The ESM/CJS builds above keep `qrcode`
      // external (the right call for bundler/Node consumers, who dedupe it),
      // but a bare `import "qrcode"` cannot resolve on a static server with no
      // bundler. This target inlines `qrcode` via its `browser` field so the
      // single file runs from a plain `<script type="module">`. `@napi-rs/canvas`
      // stays external so `toPng()` rejects cleanly in the browser instead of
      // dragging in a native module.
      format: 'esm',
      dts: false,
      autoExternal: false,
      output: {
        target: 'web',
        distPath: { root: 'dist/browser' },
        externals: [/^@napi-rs\/canvas$/],
      },
    },
  ],
  output: { cleanDistPath: true },
})
