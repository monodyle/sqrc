import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true
  },
  hooks: {
    'rollup:options': (_, options) => {
      options.plugins ||= []
      ;(options.plugins as any).push({
        name: 'remove-assert',
        transform (code: string) {
          return code.replace(/(\s\s)assert\(/g, '$1false && assert(')
        }
      })
    }
  }
})
