import { describe, it, expect, jest } from '@jest/globals';

function mockSupabaseClient(biz: any) {
  return {
    from: (table: string) => {
  if (table === 'businesses') {
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: biz }),
        }),
      }),
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: {}, error: null })),
      })),
      delete: jest.fn(async () => ({ error: null })),
    };
  }
      if (table === 'sms_messages') {
        return {
          insert: jest.fn(async () => ({ data: {}, error: null })),
        };
      }
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
    },
  };
}

describe('lib/stripe/subscriptions', () => {
  it('creates checkout session creating customer when missing', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      process.env.NEXT_PUBLIC_APP_URL = 'https://app';
      const created = { id: 'cus_1' };
      const sessionsCreate = jest.fn(async () => ({ url: 'https://sess' }));
      jest.doMock('stripe', () => {
        return class StripeMock {
          customers = { create: jest.fn(async () => created) };
          checkout = { sessions: { create: sessionsCreate } };
        };
      });
      const sb = mockSupabaseClient({ stripe_customer_id: null, name: 'Biz' });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { createCheckoutSession } = require('@/lib/stripe/subscriptions');
      const url = await createCheckoutSession('b1', 'price_x', 'a@b.com');
      expect(url).toBe('https://sess');
      expect(sessionsCreate).toHaveBeenCalled();
    });
  });

  it('creates customer portal session when customer exists', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      process.env.NEXT_PUBLIC_APP_URL = 'https://app';
      jest.doMock('stripe', () => {
        return class StripeMock {
          billingPortal = { sessions: { create: jest.fn(async () => ({ url: 'https://portal' })) } };
        };
      });
      const sb = mockSupabaseClient({ stripe_customer_id: 'cus_x' });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { createCustomerPortalSession } = require('@/lib/stripe/subscriptions');
      const url = await createCustomerPortalSession('b1');
      expect(url).toBe('https://portal');
    });
  });

  it('getSubscriptionDetails returns default when no subscription', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      jest.doMock('stripe', () => {
        return class StripeMock {};
      });
      const sb = mockSupabaseClient({
        stripe_subscription_id: null,
        stripe_subscription_status: null,
        plan_tier: 'growth',
        current_period_end: null,
        cancel_at_period_end: false,
        has_multi_location_addon: false,
        leads_this_month: 0,
        leads_used: 0,
        leads_limit: 150,
      });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { getSubscriptionDetails } = require('@/lib/stripe/subscriptions');
      const details = await getSubscriptionDetails('b1');
      expect(details?.status).toBe('none');
      expect(details?.leadsLimit).toBe(150);
    });
  });

  it('getSubscriptionDetails pulls from Stripe and upcoming invoice', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      const retrieve = jest.fn(async () => ({
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        default_payment_method: { card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 } },
      }));
      const upcoming = jest.fn(async () => ({ amount_due: 9900 }));
      jest.doMock('stripe', () => {
        return class StripeMock {
          subscriptions = { retrieve };
          invoices = { retrieveUpcoming: upcoming };
        };
      });
      const sb = mockSupabaseClient({
        stripe_subscription_id: 'sub_1',
        stripe_subscription_status: 'trialing',
        plan_tier: 'pro',
        current_period_end: null,
        cancel_at_period_end: false,
        has_multi_location_addon: false,
        leads_this_month: 0,
        leads_used: 0,
        leads_limit: 300,
      });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { getSubscriptionDetails } = require('@/lib/stripe/subscriptions');
      const details = await getSubscriptionDetails('b1');
      expect(details?.status).toBe('active');
      expect(details?.paymentMethod?.brand).toBe('visa');
      expect(details?.upcomingAmount).toBe(99);
    });
  });

  it('changePlan updates subscription and database', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      process.env.STRIPE_PRICE_GROWTH_MONTHLY = 'price_growth';
      const retrieve = jest.fn(async () => ({ items: { data: [{ id: 'si_1', price: { id: 'price_old' } }] } }));
      const update = jest.fn(async () => ({}));
      jest.doMock('stripe', () => {
        return class StripeMock {
          subscriptions = { retrieve, update };
        };
      });
      const sb = mockSupabaseClient({ stripe_subscription_id: 'sub_x' });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { changePlan } = require('@/lib/stripe/subscriptions');
      await changePlan('b1', 'price_growth');
      expect(retrieve).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
    });
  });

  it('cancel and reactivate subscription update flags', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      const update = jest.fn(async () => ({}));
      jest.doMock('stripe', () => {
        return class StripeMock {
          subscriptions = { update };
        };
      });
      const sb = mockSupabaseClient({ stripe_subscription_id: 'sub_x' });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { cancelSubscription, reactivateSubscription } = require('@/lib/stripe/subscriptions');
      await cancelSubscription('b1');
      await reactivateSubscription('b1');
      expect(update).toHaveBeenCalledTimes(2);
    });
  });

  it('addMultiLocationAddon requires price and sets addon', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON = 'price_addon';
      const createItem = jest.fn(async () => ({}));
      jest.doMock('stripe', () => {
        return class StripeMock {
          subscriptionItems = { create: createItem };
        };
      });
      const sb = mockSupabaseClient({ stripe_subscription_id: 'sub_x', has_multi_location_addon: false });
      jest.doMock('@/lib/supabase/server', () => ({ createClient: async () => sb }));
      const { addMultiLocationAddon } = require('@/lib/stripe/subscriptions');
      await addMultiLocationAddon('b1');
      expect(createItem).toHaveBeenCalled();
    });
  });

  it('getPriceIds returns env values', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'pe';
      process.env.STRIPE_PRICE_PRO_MONTHLY = 'pp';
      process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON = 'pl';
      const { getPriceIds } = require('@/lib/stripe/subscriptions');
      const ids = getPriceIds();
      expect(ids.enterprise).toBe('pe');
      expect(ids.pro).toBe('pp');
      expect(ids.multiLocation).toBe('pl');
    });
  });
});
