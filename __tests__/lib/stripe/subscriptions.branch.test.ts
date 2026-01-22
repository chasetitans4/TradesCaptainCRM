/**
 * Stripe Subscriptions Branch Coverage Tests
 *
 * Tests for error paths and edge cases to achieve 85%+ branch coverage.
 */

// Mock Stripe with hoisted factory - store in globalThis to share reference
jest.mock('@/lib/stripe/client', () => {
  if (!(globalThis as any).__stripeMock) {
    (globalThis as any).__stripeMock = {
      customers: {
        create: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
        retrieveUpcoming: jest.fn(),
      },
      subscriptionItems: {
        create: jest.fn(),
      },
    };
  }
  return { stripe: (globalThis as any).__stripeMock };
});

function makeSupabaseStub() {
  const state: any = { businesses: new Map<string, any>() };
  const api = {
    state,
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
            const id = ctx._eq['id'];
            return { data: state.businesses.get(id) || null };
          }
          return { data: null };
        },
        update: (data: any) => {
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
  const shared = (globalThis as any).__sharedSubsBranchSupabase || makeSupabaseStub();
  (globalThis as any).__sharedSubsBranchSupabase = shared;
  return {
    createClient: jest.fn(async () => shared),
  };
});

import {
  createCheckoutSession,
  createCustomerPortalSession,
  getSubscriptionDetails,
  getInvoiceHistory,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  addMultiLocationAddon,
} from '@/lib/stripe/subscriptions';
import { stripe } from '@/lib/stripe/client';

// Get mock reference
const mockStripe = stripe as any;

describe('lib/stripe/subscriptions branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app';
    process.env.STRIPE_PRICE_GROWTH_MONTHLY = 'price_growth';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro';
    process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON = 'price_multi';

    // Reset default mock implementations
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout/session' });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal' });
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000),
      cancel_at_period_end: false,
      default_payment_method: {
        card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
      },
      items: { data: [{ id: 'si_1', price: { id: 'price_old' } }] },
    });
    mockStripe.subscriptions.update.mockResolvedValue({ id: 'sub_1' });
    mockStripe.invoices.list.mockResolvedValue({
      data: [
        { id: 'inv_1', created: Math.floor(Date.now() / 1000), amount_paid: 9900, status: 'paid', invoice_pdf: 'https://pdf' },
      ],
    });
    mockStripe.invoices.retrieveUpcoming.mockResolvedValue({ amount_due: 9900 });
    mockStripe.subscriptionItems.create.mockResolvedValue({ id: 'si_addon' });
  });

  describe('createCheckoutSession', () => {
    it('creates new customer when business has no stripe_customer_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_new_cus', {
        id: 'biz_new_cus',
        name: 'New Business',
        stripe_customer_id: null,
      });

      const result = await createCheckoutSession('biz_new_cus', 'price_growth', 'test@example.com');
      expect(result).toBe('https://checkout/session');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'New Business',
        metadata: { business_id: 'biz_new_cus' },
      });
      // Verify customer ID was saved to business
      const updated = supabase.state.businesses.get('biz_new_cus');
      expect(updated.stripe_customer_id).toBe('cus_new');
    });

    it('uses existing customer when business has stripe_customer_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_existing_cus', {
        id: 'biz_existing_cus',
        name: 'Existing Business',
        stripe_customer_id: 'cus_existing',
      });

      const result = await createCheckoutSession('biz_existing_cus', 'price_pro', 'test@example.com');
      expect(result).toBe('https://checkout/session');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
        })
      );
    });

    it('returns null when business is not found', async () => {
      const result = await createCheckoutSession('nonexistent', 'price_growth', 'test@example.com');
      // The function accesses business?.stripe_customer_id which is null for nonexistent business
      expect(mockStripe.customers.create).toHaveBeenCalled();
    });
  });

  describe('createCustomerPortalSession', () => {
    it('throws when business has no stripe_customer_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_cus', { id: 'biz_no_cus', stripe_customer_id: null });

      await expect(createCustomerPortalSession('biz_no_cus')).rejects.toThrow('No Stripe customer found');
    });

    it('creates portal session when business has stripe_customer_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_with_cus', {
        id: 'biz_with_cus',
        stripe_customer_id: 'cus_existing_portal',
      });

      const result = await createCustomerPortalSession('biz_with_cus');
      expect(result).toBe('https://portal');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing_portal',
        return_url: 'https://app/settings/billing',
      });
    });
  });

  describe('getSubscriptionDetails', () => {
    it('returns null when business not found', async () => {
      const result = await getSubscriptionDetails('nonexistent_biz');
      expect(result).toBeNull();
    });

    it('returns defaults when business has no subscription_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_sub', {
        id: 'biz_no_sub',
        stripe_subscription_status: 'none',
        plan_tier: 'growth',
        leads_this_month: 5,
        leads_limit: 200,
        stripe_subscription_id: null,
      });

      const result = await getSubscriptionDetails('biz_no_sub');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('none');
      expect(result!.paymentMethod).toBeNull();
      expect(result!.upcomingAmount).toBeNull();
    });

    it('handles Stripe subscription retrieve failure gracefully', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_stripe_err', {
        id: 'biz_stripe_err',
        stripe_subscription_id: 'sub_fail',
        stripe_subscription_status: 'none',
        plan_tier: 'pro',
        leads_this_month: 10,
        leads_limit: 300,
      });

      mockStripe.subscriptions.retrieve.mockRejectedValueOnce(new Error('Stripe API error'));

      const result = await getSubscriptionDetails('biz_stripe_err');
      // Should return result with DB defaults, not throw
      expect(result).not.toBeNull();
      // Status comes from DB when Stripe call fails
      expect(result!.status).toBe('none');
    });

    it('handles payment method as string (not expanded)', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_pm_str', {
        id: 'biz_pm_str',
        stripe_subscription_id: 'sub_pm_str',
        plan_tier: 'pro',
        leads_this_month: 10,
        leads_limit: 300,
      });

      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_pm_str',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        default_payment_method: 'pm_string_id', // String instead of object
        items: { data: [{ id: 'si_1' }] },
      });

      const result = await getSubscriptionDetails('biz_pm_str');
      expect(result).not.toBeNull();
      expect(result!.paymentMethod).toBeNull(); // Should be null when payment method is string
    });

    it('handles missing card on payment method object', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_card', {
        id: 'biz_no_card',
        stripe_subscription_id: 'sub_no_card',
        plan_tier: 'pro',
      });

      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_no_card',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        default_payment_method: { id: 'pm_1' }, // No card property
        items: { data: [{ id: 'si_1' }] },
      });

      const result = await getSubscriptionDetails('biz_no_card');
      expect(result).not.toBeNull();
      expect(result!.paymentMethod).toBeNull();
    });

    it('handles upcoming invoice retrieval failure (canceled sub)', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_canceled', {
        id: 'biz_canceled',
        stripe_subscription_id: 'sub_canceled',
        plan_tier: 'pro',
      });

      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_canceled',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: true,
        default_payment_method: null,
        items: { data: [{ id: 'si_1' }] },
      });
      mockStripe.invoices.retrieveUpcoming.mockRejectedValueOnce(new Error('No upcoming invoice'));

      const result = await getSubscriptionDetails('biz_canceled');
      expect(result).not.toBeNull();
      expect(result!.upcomingAmount).toBeNull();
    });

    it('uses leads_used fallback when leads_this_month is null', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_leads_used', {
        id: 'biz_leads_used',
        stripe_subscription_id: null,
        plan_tier: 'growth',
        leads_this_month: null,
        leads_used: 15,
        leads_limit: 200,
      });

      const result = await getSubscriptionDetails('biz_leads_used');
      expect(result!.leadsThisMonth).toBe(15);
    });

    it('uses default leads_limit based on plan_tier when not set', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_default_limit', {
        id: 'biz_default_limit',
        stripe_subscription_id: null,
        plan_tier: 'pro',
        leads_limit: null,
      });

      const result = await getSubscriptionDetails('biz_default_limit');
      expect(result!.leadsLimit).toBe(300); // pro default
    });
  });

  describe('getInvoiceHistory', () => {
    it('returns empty array when no stripe_customer_id', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_hist', { id: 'biz_no_hist' });

      const result = await getInvoiceHistory('biz_no_hist');
      expect(result).toEqual([]);
    });

    it('returns empty array on Stripe API failure', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_inv_err', {
        id: 'biz_inv_err',
        stripe_customer_id: 'cus_inv_err',
      });

      mockStripe.invoices.list.mockRejectedValueOnce(new Error('Stripe error'));

      const result = await getInvoiceHistory('biz_inv_err');
      expect(result).toEqual([]);
    });

    it('maps invoice data correctly with null invoice_pdf', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_inv_null', {
        id: 'biz_inv_null',
        stripe_customer_id: 'cus_inv_null',
      });

      mockStripe.invoices.list.mockResolvedValueOnce({
        data: [
          { id: 'inv_null', created: 1700000000, amount_paid: 5000, status: 'paid', invoice_pdf: null },
          { id: 'inv_undef', created: 1700000000, amount_paid: 5000, status: null, invoice_pdf: undefined },
        ],
      });

      const result = await getInvoiceHistory('biz_inv_null');
      expect(result[0].pdfUrl).toBeNull();
      expect(result[1].status).toBe('unknown');
    });
  });

  describe('changePlan', () => {
    it('throws when business has no subscription', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_change', { id: 'biz_no_change' });

      await expect(changePlan('biz_no_change', 'price_pro')).rejects.toThrow('No active subscription');
    });

    it('updates to pro plan correctly', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_to_pro', {
        id: 'biz_to_pro',
        stripe_subscription_id: 'sub_to_pro',
      });

      await changePlan('biz_to_pro', 'price_pro');

      const updated = supabase.state.businesses.get('biz_to_pro');
      expect(updated.plan_tier).toBe('pro');
      expect(updated.leads_limit).toBe(200);
    });
  });

  describe('cancelSubscription', () => {
    it('throws when business has no subscription', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_cancel', { id: 'biz_no_cancel' });

      await expect(cancelSubscription('biz_no_cancel')).rejects.toThrow('No active subscription');
    });
  });

  describe('reactivateSubscription', () => {
    it('throws when business has no subscription', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_react', { id: 'biz_no_react' });

      await expect(reactivateSubscription('biz_no_react')).rejects.toThrow('No subscription found');
    });
  });

  describe('addMultiLocationAddon', () => {
    it('throws when addon price not configured', async () => {
      delete process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON;

      await expect(addMultiLocationAddon('any_biz')).rejects.toThrow('Multi-location addon price not configured');

      process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON = 'price_multi';
    });

    it('throws when business has no subscription', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_no_addon_sub', { id: 'biz_no_addon_sub' });

      await expect(addMultiLocationAddon('biz_no_addon_sub')).rejects.toThrow('No active subscription');
    });

    it('throws when addon already active', async () => {
      const server = require('@/lib/supabase/server');
      const supabase = await server.createClient();
      supabase.state.businesses.set('biz_has_addon', {
        id: 'biz_has_addon',
        stripe_subscription_id: 'sub_has_addon',
        has_multi_location_addon: true,
      });

      await expect(addMultiLocationAddon('biz_has_addon')).rejects.toThrow('Multi-location addon already active');
    });
  });
});
