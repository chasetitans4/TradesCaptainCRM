# Testing Standards and Coverage Strategy

## Overview

This project uses a **risk-based tiered coverage strategy** that prioritizes branch coverage on critical paths while maintaining practical thresholds for less critical code.

## Coverage Tiers

| Tier | Modules | Branch Threshold | Other Thresholds |
|------|---------|------------------|------------------|
| **Critical** | auth, stripe-webhook, permissions, billing | 95% | 95% |
| **Core Business** | admin, booking, plans | 85% | 85% |
| **Utilities** | utils, components | 70-75% | 75-80% |

### Critical Modules (95%+)
- `lib/auth/**/*.ts` - Authentication, 2FA, sessions
- `lib/admin/stripe-webhook.ts` - Payment webhook handling
- `lib/permissions/**/*.ts` - Authorization checks
- `lib/billing/**/*.ts` - Billing and subscription logic

### Core Business Logic (85%+)
- `lib/admin/**/*.ts` - Admin panel operations
- `lib/booking/**/*.ts` - Booking system
- `lib/admin/plans.ts` - Subscription plans

### Utilities (70-80%)
- `lib/utils/**/*.ts` - Helper functions
- `components/**/*.tsx` - UI components

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run coverage gate (enforces thresholds)
npm run test:coverage:gate

# Run admin-specific coverage
npm run test:coverage:admin

# Watch mode for development
npm run test:watch
```

## Mutation Testing

Mutation testing validates test quality by making small changes to code and verifying tests catch them.

```bash
# Run mutation testing on critical modules
npm run test:mutate

# Run mutation testing on specific critical files
npm run test:mutate:critical
```

Mutation testing runs **nightly in CI** to avoid slowing down PR pipelines.

### Interpreting Mutation Results

- **Killed mutants**: Tests caught the mutation (good)
- **Survived mutants**: Tests missed the mutation (needs investigation)
- **Timeout**: Mutant caused infinite loop (usually killed)
- **No coverage**: Code path not tested

Target: >80% mutation score on critical modules.

## Coverage Ratchet

Coverage thresholds only increase over time using the ratchet mechanism:

```bash
# After improving coverage, update the baseline
npm run test:coverage
npm run coverage:ratchet
```

The baseline is stored in `.coverage-baseline.json`.

## CI/CD Integration

### Pull Request Checks
1. `npm run lint` - ESLint
2. `npm run type-check` - TypeScript
3. `npm run test:ci` - Tests with coverage
4. `npm run test:coverage:gate` - Threshold enforcement

### Nightly Jobs
- Mutation testing runs at 3 AM UTC
- Results uploaded as artifacts (30-day retention)

### Coverage Artifacts
Coverage HTML reports are uploaded on each CI run with 14-day retention.

## Writing Tests

### Test Location
Tests are located in `__tests__/` mirroring the source structure:
- `lib/auth/totp.ts` → `__tests__/lib/auth/totp.test.ts`
- `lib/admin/plans.ts` → `__tests__/lib/admin/plans.test.ts`

### Naming Conventions
- Unit tests: `*.test.ts`
- Branch coverage tests: `*.branch.test.ts`
- Integration tests: `*.integration.test.ts`

### Test Patterns

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('ModuleName', () => {
  beforeEach(() => {
    jest.resetModules();
    // Reset mocks
  });

  describe('functionName', () => {
    it('handles normal case', () => {
      // Test happy path
    });

    it('handles error case', () => {
      // Test error paths for branch coverage
    });

    it('handles edge case', () => {
      // Test boundary conditions
    });
  });
});
```

### Mocking

Global mocks are configured in `jest.setup.js`:
- Supabase client
- Next.js navigation
- Browser APIs (ResizeObserver, IntersectionObserver, matchMedia)
- Redis/ioredis

For test-specific mocks, use `jest.mock()` or the stateful mock pattern:

```typescript
jest.mock('@/lib/supabase/server', () => {
  const mockData: any = { current: null };
  return {
    createClient: jest.fn(async () => ({
      from: () => ({ /* chain methods */ }),
    })),
    __setMockData: (data: any) => { mockData.current = data; },
    __reset: () => { mockData.current = null; },
  };
});
```

## Monthly Coverage Audit

1. Run full coverage report: `npm run test:coverage`
2. Review uncovered critical paths
3. Prioritize tests for survived mutations
4. Update ratchet baseline: `npm run coverage:ratchet`
5. Document any exclusions with rationale

## Excluded from Coverage

The following are excluded from coverage metrics:
- `node_modules/`
- `.next/` build output
- `*.d.ts` type declarations
- `lib/supabase/database.types.ts` (generated)
- `types/` directory

## Troubleshooting

### Tests Timing Out
Increase timeout in specific tests:
```typescript
it('slow operation', async () => { /* ... */ }, 30000);
```

### Flaky Time-Dependent Tests
Use Jest fake timers:
```typescript
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
```

### Module Resolution Issues
Check `jest.config.js` moduleNameMapper matches `tsconfig.json` paths.
