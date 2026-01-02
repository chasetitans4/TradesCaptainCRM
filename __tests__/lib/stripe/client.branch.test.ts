/**
 * Stripe Client Branch Coverage Tests
 *
 * Tests for lazy initialization, proxy behavior, and isStripeConfigured.
 */

// Mock global fetch for Stripe SDK
const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);
(global as any).fetch = mockFetch;

describe('lib/stripe/client branch coverage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getStripe / stripe proxy', () => {
    it('throws error when STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => {
        const { stripe } = require('@/lib/stripe/client');
        // Access any property to trigger the proxy getter
        stripe.customers;
      }).toThrow('STRIPE_SECRET_KEY is not set');
    });

    it('returns Stripe instance when key is set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const { stripe } = require('@/lib/stripe/client');
      // Access a property - should not throw
      expect(stripe.customers).toBeDefined();
    });

    it('caches Stripe instance on subsequent accesses', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_cached';

      const { stripe } = require('@/lib/stripe/client');
      const customers1 = stripe.customers;
      const customers2 = stripe.customers;

      // Same reference indicates caching
      expect(customers1).toBe(customers2);
    });

    it('binds functions correctly through proxy', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_bind';

      const { stripe } = require('@/lib/stripe/client');
      // checkout.sessions.create is a function
      expect(typeof stripe.checkout.sessions.create).toBe('function');
    });

    it('returns non-function properties through proxy', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_prop';

      const { stripe } = require('@/lib/stripe/client');
      // Access the customers resource which is an object (not a function itself)
      // The proxy should return the resource object
      expect(stripe.customers).toBeDefined();
      expect(typeof stripe.customers).toBe('object');
    });
  });

  describe('isStripeConfigured', () => {
    it('returns true when STRIPE_SECRET_KEY is set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_configured';

      const { isStripeConfigured } = require('@/lib/stripe/client');
      expect(isStripeConfigured()).toBe(true);
    });

    it('returns false when STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;

      const { isStripeConfigured } = require('@/lib/stripe/client');
      expect(isStripeConfigured()).toBe(false);
    });

    it('returns false when STRIPE_SECRET_KEY is empty string', () => {
      process.env.STRIPE_SECRET_KEY = '';

      const { isStripeConfigured } = require('@/lib/stripe/client');
      expect(isStripeConfigured()).toBe(false);
    });
  });

  describe('STRIPE_PUBLISHABLE_KEY export', () => {
    it('exports STRIPE_PUBLISHABLE_KEY from environment', () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

      const { STRIPE_PUBLISHABLE_KEY } = require('@/lib/stripe/client');
      expect(STRIPE_PUBLISHABLE_KEY).toBe('pk_test_123');
    });

    it('is undefined when not set', () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      const { STRIPE_PUBLISHABLE_KEY } = require('@/lib/stripe/client');
      expect(STRIPE_PUBLISHABLE_KEY).toBeUndefined();
    });
  });

  describe('proxy edge cases', () => {
    it('handles accessing nested resource methods', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_nested';

      const { stripe } = require('@/lib/stripe/client');
      // checkout is a resource object, sessions is a nested resource
      expect(stripe.checkout).toBeDefined();
      expect(stripe.checkout.sessions).toBeDefined();
    });

    it('returns cached instance on repeated calls to getStripe', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_multi_access';

      const { stripe } = require('@/lib/stripe/client');
      // Multiple property accesses should use same instance
      const c1 = stripe.customers;
      const c2 = stripe.customers;
      const s1 = stripe.subscriptions;
      expect(c1).toBe(c2);
      expect(s1).toBeDefined();
    });

    it('correctly returns bound function when accessing method', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_bound_fn';

      const { stripe } = require('@/lib/stripe/client');
      // Access a method directly to test function binding branch
      const createFn = stripe.customers.create;
      expect(typeof createFn).toBe('function');
    });

    it('correctly returns non-function value when accessing simple property', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_non_fn';

      const { stripe } = require('@/lib/stripe/client');
      // Access the VERSION constant which should be a string, not a function
      // This tests the branch where typeof value !== 'function'
      const version = stripe.VERSION;
      expect(typeof version).not.toBe('function');
    });

    it('returns undefined for non-existent property', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_nonexist';

      const { stripe } = require('@/lib/stripe/client');
      // Access a property that doesn't exist - should return undefined (not a function)
      const nonexistent = stripe.nonExistentProperty;
      expect(nonexistent).toBeUndefined();
    });
  });

  describe('top-level function binding', () => {
    it('binds and calls top-level function via proxy', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_func';
        jest.doMock('stripe', () => ({
          __esModule: true,
          default: jest.fn().mockImplementation((_key: string, _opts: any) => {
            return {
              ping: function () {
                return 'pong';
              },
              VERSION: 'mock',
            };
          }),
        }));
        const { stripe } = require('@/lib/stripe/client');
        const result = (stripe as any).ping();
        expect(result).toBe('pong');
      });
    });
  });
});
