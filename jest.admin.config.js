const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
  },
  testMatch: [
    '<rootDir>/__tests__/lib/admin/**/*.test.ts',
    '<rootDir>/__tests__/lib/admin/**/*.test.tsx',
    '<rootDir>/__tests__/lib/monitoring/**/*.test.ts',
    '<rootDir>/__tests__/api/health.test.ts',
  ],
  collectCoverageFrom: [
    'lib/admin/**/*.{ts,tsx}',
    'lib/monitoring/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 74,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  verbose: true,
  testTimeout: 10000,
};

module.exports = createJestConfig(customConfig);
