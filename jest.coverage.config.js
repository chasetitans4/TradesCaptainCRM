module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/lib/twilio/**/*.ts',
    '<rootDir>/app/api/webhooks/twilio/**/*.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '\\.d\\.ts$',
    'lib/supabase/database\\.types\\.ts',
    'types/',
    '/lib/nevermiss/',
    '/lib/email/',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testEnvironment: 'jsdom',
};
