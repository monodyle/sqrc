import { defineConfig } from '@rslib/core'

export default defineConfig({
  source: {
    entry: { index: './src/index.ts' },
    tsconfigPath: './tsconfig.build.json',
  },
  lib: [
    { format: 'esm', dts: true },
    { format: 'cjs', dts: true },
  ],
  output: { cleanDistPath: true },
})
