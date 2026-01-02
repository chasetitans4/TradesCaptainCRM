describe('lib/stripe/client security', () => {
  const ORIGINAL = process.env.STRIPE_SECRET_KEY;
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    jest.resetModules();
  });
  afterAll(() => {
    process.env.STRIPE_SECRET_KEY = ORIGINAL;
  });

  it('isStripeConfigured false when key missing and methods throw', async () => {
    const client = require('@/lib/stripe/client');
    expect(client.isStripeConfigured()).toBe(false);
    expect(() => client.stripe.customers.list()).toThrow();
  });

  it('isStripeConfigured true when key present', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const client = require('@/lib/stripe/client');
    expect(client.isStripeConfigured()).toBe(true);
  });
});
