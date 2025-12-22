// =====================================================
// STRIPE CLIENT
// =====================================================

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set. Stripe features are disabled.');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
  }
  return _stripe;
}

// Export a proxy that lazily initializes Stripe
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const stripeInstance = getStripe();
    const value = (stripeInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(stripeInstance);
    }
    return value;
  },
});

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
