import { describe, it, expect, jest } from '@jest/globals';

describe('lib/stripe/client', () => {
  it('throws when secret key is missing', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.STRIPE_SECRET_KEY;
      jest.doMock('stripe', () => {
        return class StripeMock {};
      });
      const { stripe, isStripeConfigured } = require('@/lib/stripe/client');
      expect(isStripeConfigured()).toBe(false);
      expect(() => (stripe as any).prices).toThrow();
    });
  });

  it('initializes stripe when secret key is set', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      let constructed = false;
      jest.doMock('stripe', () => {
        return class StripeMock {
          constructor() {
            constructed = true;
          }
          prices = { create: jest.fn(async () => ({ id: 'price_1' })) };
        };
      });
      const { stripe, isStripeConfigured } = require('@/lib/stripe/client');
      expect(isStripeConfigured()).toBe(true);
      const p = await (stripe as any).prices.create({ unit_amount: 100, currency: 'usd' });
      expect(p.id).toBe('price_1');
      expect(constructed).toBe(true);
    });
  });
});
