import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Run against the workspace source, not the built dist, so the studio always
// exercises live core code and HMR picks up library changes instantly.
const coreEntry = fileURLToPath(
  new URL('../core/src/index.ts', import.meta.url),
)
const canvasStub = fileURLToPath(
  new URL('./src/lib/native-canvas-stub.ts', import.meta.url),
)

export default defineConfig({
  resolve: {
    alias: [
      { find: /^sqrc$/, replacement: coreEntry },
      { find: /^@napi-rs\/canvas$/, replacement: canvasStub },
    ],
  },
  // Keep the native module out of Vite's dep optimizer; the alias above
  // handles the actual resolution in both dev and build.
  optimizeDeps: { exclude: ['@napi-rs/canvas'] },
  server: {
    port: 5173,
  },
})
