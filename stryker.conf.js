/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.js',
  },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  coverageAnalysis: 'perTest',
  // Target critical modules only - auth, billing, permissions, webhooks
  mutate: [
    'lib/admin/stripe-webhook.ts',
    'lib/admin/plans.ts',
    'lib/permissions/**/*.ts',
    'lib/auth/**/*.ts',
    'lib/billing/**/*.ts',
  ],
  timeoutMS: 60000,
  concurrency: 4,
  // Output mutation reports to reports directory
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
};
