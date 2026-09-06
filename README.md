# sqrc

A pnpm monorepo for **sqrc**, a customizable, styled QR code generator for Node and the browser, written in TypeScript.

## Packages

| Package                             | Path              | Description                                                             |
| ----------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| [`sqrc`](./packages/core)           | `packages/core`   | The library itself: one geometry core with SVG, canvas and PNG outputs. |
| [`@sqrc/web-ui`](./packages/web-ui) | `packages/web-ui` | A live studio to design, preview and export styled QR codes.            |

## Getting started

```bash
pnpm install

# Run the studio at http://localhost:5173
pnpm dev

# Build every package
pnpm build
```

The studio runs against the core source directly, so library changes hot-reload instantly without a rebuild step.

## Scripts

Run from the repository root:

| Script                                  | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                              | Start the web studio (Vite dev server).                          |
| `pnpm build`                            | Build all packages (`rslib` for core, `vite` for the studio).    |
| `pnpm test`                             | Run the core unit tests (vitest + ZXing decode verification).     |
| `pnpm test:browser`                     | End-to-end browser test with Playwright + Vite.                  |
| `pnpm test:browser:static`              | Prove the built browser bundle works from a plain static server. |
| `pnpm --filter @sqrc/web-ui test:smoke` | Boot the studio headlessly and verify it renders and decodes.    |
| `pnpm typecheck`                        | Typecheck every package.                                         |
| `pnpm lint` / `pnpm format`             | Lint and format the whole repo (oxlint + oxfmt).                 |

## Library

See [`packages/core/README.md`](./packages/core/README.md) for the full API, options and examples.

```bash
pnpm add sqrc
```
