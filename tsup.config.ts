import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'lib',
  external: ['@inkdropapp/logger', 'axios', 'semver', 'tar'],
  target: 'es2023',
  minify: false,
  sourcemap: false
})

