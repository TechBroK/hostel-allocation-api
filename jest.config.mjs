export default {
  testEnvironment: 'node',
  transform: {}, // ESM/no Babel
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js','!src/**/swagger*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text','lcov','json-summary'],
};
