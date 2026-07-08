import { defineConfig } from 'vitest/config'

const onDemandRealTests = ['tests/real-install.test.ts', 'tests/real-get-outdated.test.ts']

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...(process.env.RUN_REAL_TESTS ? [] : onDemandRealTests)],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts']
    }
  }
})
