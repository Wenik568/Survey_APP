module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  // Запускати тести послідовно щоб уникнути конфліктів БД
  maxWorkers: 1,
};
