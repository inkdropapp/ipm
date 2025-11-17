import { defineConfig } from 'tsup'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'lib',
  external: Object.keys(pkg.dependencies || {}),
  target: 'esnext',
  minify: false,
  sourcemap: false,
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`
  }
})
