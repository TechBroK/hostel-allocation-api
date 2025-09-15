export default {
  testEnvironment: 'node',
  transform: {}, // ESM/no Babel
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js','!src/**/swagger*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text','lcov','json-summary'],
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 12,
  functions: 25,
      lines: 25,
    }
  }
};
