import { describe, it, expect, jest } from '@jest/globals';

describe('lib/stripe/payment-links', () => {
  it('creates payment link with price and returns url', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example';
      jest.doMock('stripe', () => {
        return class StripeMock {
          prices = { create: jest.fn(async () => ({ id: 'price_abc' })) };
          paymentLinks = { create: jest.fn(async () => ({ url: 'https://pay.link/x' })) };
          checkout = { sessions: { create: jest.fn(async () => ({ url: 'https://checkout/x' })) } };
          webhooks = { constructEvent: jest.fn() };
        };
      });
      const { createPaymentLink, createCheckoutSession } = require('@/lib/stripe/payment-links');
      const url = await createPaymentLink({
        invoiceId: 'inv1',
        businessId: 'biz1',
        amount: 12345,
        customerName: 'John',
        description: 'Invoice inv1',
        currency: 'USD',
      });
      expect(url).toBe('https://pay.link/x');
      const sessionUrl = await createCheckoutSession({
        invoiceId: 'inv2',
        businessId: 'biz2',
        amount: 5000,
        customerEmail: 'a@b.com',
        customerName: 'Jane',
        description: 'Invoice inv2',
        currency: 'usd',
      });
      expect(sessionUrl).toBe('https://checkout/x');
    });
  });
});
