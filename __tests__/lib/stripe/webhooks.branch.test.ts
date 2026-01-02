/**
 * Stripe Webhooks Branch Coverage Tests
 *
 * Tests for processWebhookEvent, handleTrialWillEnd, and edge cases.
 */

import Stripe from 'stripe';

function makeSupabaseStub() {
  const updates: any[] = [];
  const state: any = {
    businesses: new Map<string, any>(),
  };
  const api = {
    state,
    updates,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {}, _sel: null };
      const chain = {
        select(sel?: string) {
          ctx._sel = sel;
          return chain;
        },
        eq(col: string, val: any) {
          ctx._eq[col] = val;
          return chain;
        },
        single: async () => {
          if (table === 'businesses') {
            if (ctx._eq['id']) {
              return { data: state.businesses.get(ctx._eq['id']) || null };
            }
            if (ctx._eq['stripe_customer_id']) {
              const found = [...state.businesses.values()].find(
                (b) => b.stripe_customer_id === ctx._eq['stripe_customer_id']
              );
              return { data: found || null };
            }
          }
          return { data: null };
        },
        update: (data: any) => {
          updates.push({ table, data, where: ctx._eq });
          return {
            eq: async (col?: string, val?: any) => {
              if (table === 'businesses') {
                const id = col === 'id' ? val : ctx._eq['id'];
                const cur = state.businesses.get(id) || {};
                state.businesses.set(id, { ...cur, ...data });
              }
              return { data: null };
            },
          };
        },
      };
      return chain as any;
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => {
  const shared = (globalThis as any).__sharedWebhookBranchSupabase || makeSupabaseStub();
  (globalThis as any).__sharedWebhookBranchSupabase = shared;
  return {
    createClient: jest.fn(async () => shared),
  };
});

jest.mock('@/lib/logger', () => ({
  syncLogger: {
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/stripe/client', () => {
  if (!(globalThis as any).__stripeWebhookMock) {
    (globalThis as any).__stripeWebhookMock = {
      webhooks: {
        constructEvent: jest.fn((payload: string, signature: string, secret: string) => ({
          id: 'evt_test',
          type: 'test.event',
          data: { object: { payload, signature, secret } },
        })),
      },
    };
  }
  return { stripe: (globalThis as any).__stripeWebhookMock };
});

import {
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleCheckoutCompleted,
  handleTrialWillEnd,
  processWebhookEvent,
  constructWebhookEvent,
} from '@/lib/stripe/webhooks';

describe('lib/stripe/webhooks branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_PRICE_GROWTH_MONTHLY = 'price_growth';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro';
    process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON = 'price_multi';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  describe('handleSubscriptionUpdated', () => {
    it('sets pro plan tier when price is not growth', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_pro', { id: 'biz_pro' });

      const sub = {
        id: 'sub_pro',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        billing_cycle_anchor: Math.floor(Date.now() / 1000),
        items: { data: [{ price: { id: 'price_pro' } }] },
        metadata: { business_id: 'biz_pro' },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdated(sub);

      const updated = supabase.state.businesses.get('biz_pro');
      expect(updated.plan_tier).toBe('pro');
      expect(updated.leads_limit).toBe(300);
    });

    it('detects multi-location addon in subscription items', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_multi', { id: 'biz_multi' });

      const sub = {
        id: 'sub_multi',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        billing_cycle_anchor: Math.floor(Date.now() / 1000),
        items: {
          data: [
            { price: { id: 'price_pro' } },
            { price: { id: 'price_multi' } },
          ],
        },
        metadata: { business_id: 'biz_multi' },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdated(sub);

      const updated = supabase.state.businesses.get('biz_multi');
      expect(updated.has_multi_location_addon).toBe(true);
    });

    it('sets has_multi_location_addon to false when addon not present', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_multi', { id: 'biz_no_multi' });

      const sub = {
        id: 'sub_no_multi',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        billing_cycle_anchor: Math.floor(Date.now() / 1000),
        items: { data: [{ price: { id: 'price_pro' } }] },
        metadata: { business_id: 'biz_no_multi' },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdated(sub);

      const updated = supabase.state.businesses.get('biz_no_multi');
      expect(updated.has_multi_location_addon).toBe(false);
    });
  });

  describe('handleTrialWillEnd', () => {
    it('returns early when business_id is missing', async () => {
      const sub = {
        id: 'sub_trial',
        metadata: {},
      } as unknown as Stripe.Subscription;

      // Should not throw
      await handleTrialWillEnd(sub);
    });

    it('handles valid business_id (TODO handler)', async () => {
      const sub = {
        id: 'sub_trial_valid',
        metadata: { business_id: 'biz_trial' },
      } as unknown as Stripe.Subscription;

      // Currently a TODO - should not throw
      await handleTrialWillEnd(sub);
    });
  });

  describe('handleCheckoutCompleted', () => {
    it('returns early when business_id is missing', async () => {
      const session = {
        customer: 'cus_x',
        metadata: {},
        mode: 'subscription',
      } as unknown as Stripe.Checkout.Session;

      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      const beforeUpdates = supabase.updates.length;

      await handleCheckoutCompleted(session);

      expect(supabase.updates.length).toBe(beforeUpdates);
    });

    it('returns early when session customer is null', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_cus', { id: 'biz_no_cus' });

      const session = {
        customer: null,
        metadata: { business_id: 'biz_no_cus' },
        mode: 'subscription',
      } as unknown as Stripe.Checkout.Session;

      const beforeUpdates = supabase.updates.length;
      await handleCheckoutCompleted(session);

      // No update should happen when customer is null
      const updated = supabase.state.businesses.get('biz_no_cus');
      expect(updated.stripe_customer_id).toBeUndefined();
    });
  });

  describe('handleInvoicePaid', () => {
    it('does nothing when business not found for customer', async () => {
      const invoice = { customer: 'cus_unknown' } as unknown as Stripe.Invoice;

      // Should not throw
      await handleInvoicePaid(invoice);
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    it('does nothing when business not found for customer', async () => {
      const invoice = { customer: 'cus_unknown_fail' } as unknown as Stripe.Invoice;

      // Should not throw
      await handleInvoicePaymentFailed(invoice);
    });
  });

  describe('processWebhookEvent', () => {
    it('handles customer.subscription.created event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_created', { id: 'biz_created' });

      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_created',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false,
            billing_cycle_anchor: Math.floor(Date.now() / 1000),
            items: { data: [{ price: { id: 'price_growth' } }] },
            metadata: { business_id: 'biz_created' },
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_created');
      expect(updated.stripe_subscription_id).toBe('sub_created');
    });

    it('handles customer.subscription.updated event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_updated', { id: 'biz_updated' });

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_updated',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000),
            cancel_at_period_end: true,
            billing_cycle_anchor: Math.floor(Date.now() / 1000),
            items: { data: [{ price: { id: 'price_pro' } }] },
            metadata: { business_id: 'biz_updated' },
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_updated');
      expect(updated.cancel_at_period_end).toBe(true);
    });

    it('handles customer.subscription.deleted event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_deleted', { id: 'biz_deleted' });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_deleted',
            metadata: { business_id: 'biz_deleted' },
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_deleted');
      expect(updated.stripe_subscription_status).toBe('canceled');
    });

    it('handles invoice.paid event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_inv_paid', {
        id: 'biz_inv_paid',
        stripe_customer_id: 'cus_inv_paid',
        leads_this_month: 50,
      });

      const event = {
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_inv_paid',
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_inv_paid');
      expect(updated.leads_this_month).toBe(0);
    });

    it('handles invoice.payment_failed event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_inv_fail', {
        id: 'biz_inv_fail',
        stripe_customer_id: 'cus_inv_fail',
      });

      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_inv_fail',
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_inv_fail');
      expect(updated.stripe_subscription_status).toBe('past_due');
    });

    it('handles checkout.session.completed event', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_checkout', { id: 'biz_checkout' });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_checkout',
            metadata: { business_id: 'biz_checkout' },
            mode: 'subscription',
          },
        },
      } as unknown as Stripe.Event;

      await processWebhookEvent(event);

      const updated = supabase.state.businesses.get('biz_checkout');
      expect(updated.stripe_customer_id).toBe('cus_checkout');
    });

    it('handles customer.subscription.trial_will_end event', async () => {
      const event = {
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_trial_end',
            metadata: { business_id: 'biz_trial_end' },
          },
        },
      } as unknown as Stripe.Event;

      // Should not throw (TODO handler)
      await processWebhookEvent(event);
    });

    it('silently ignores unhandled event types', async () => {
      const event = {
        type: 'payment_intent.created',
        data: {
          object: {},
        },
      } as unknown as Stripe.Event;

      // Should not throw
      await processWebhookEvent(event);
    });
  });

  describe('constructWebhookEvent', () => {
    it('throws when webhook secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(constructWebhookEvent('payload', 'sig')).rejects.toThrow(
        'STRIPE_WEBHOOK_SECRET not configured'
      );

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    });

    it('constructs event when secret is configured', async () => {
      const event = await constructWebhookEvent('payload', 'sig');
      expect(event.type).toBe('test.event');
    });
  });
});
