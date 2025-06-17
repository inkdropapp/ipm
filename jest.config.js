export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true
      }
    ],
    '^.+\\.js$': [
      'ts-jest',
      {
        useESM: true
      }
    ]
  },
  transformIgnorePatterns: [
    'node_modules/(?!@inkdropapp/logger)'
  ],
  testMatch: [
    '**/tests/**/*.test.ts',
    // Exclude real installation test from normal runs
    '!**/tests/real-install.test.ts',
    '!**/tests/real-get-outdated.test.ts'
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']
}

