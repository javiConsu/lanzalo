module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/test/integration.test.js'],
  collectCoverageFrom: [
    'agents/**/*.js',
    'backend/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
