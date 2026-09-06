// `@napi-rs/canvas` is a native Node module that `toPng()` imports lazily.
// Aliasing the core source into a browser bundle would otherwise drag the
// native binary into the build. Swapping in this stub makes that dynamic
// import reject at runtime instead - the same clean failure the core's own
// rslib browser build gets from marking the module external.
export {}

throw new Error(
  'sqrc: toPng() needs the optional "@napi-rs/canvas" peer dependency, ' +
    'which only runs in Node.js. Use toSvg() or toCanvas() in the browser.',
)
