import { describe, it, expect, jest } from '@jest/globals';

describe('lib/stripe/webhooks', () => {
  it('constructs webhook event with secret', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      process.env.STRIPE_SECRET_KEY = 'sk';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
      const constructSpy = jest.fn((payload: any, sig: string, secret: string) => ({ id: 'evt', type: 'ping' }));
      jest.doMock('stripe', () => ({
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
          webhooks: { constructEvent: constructSpy },
        })),
      }));
      const { constructWebhookEvent } = require('@/lib/stripe/webhooks');
      expect(() => constructWebhookEvent('body', 'sig')).not.toThrow();
    });
  });

  it('constructWebhookEvent throws when secret missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      process.env.STRIPE_SECRET_KEY = 'sk';
      delete process.env.STRIPE_WEBHOOK_SECRET;
      jest.doMock('stripe', () => ({
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
          webhooks: { constructEvent: jest.fn() },
        })),
      }));
      const { constructWebhookEvent } = require('@/lib/stripe/webhooks');
      await expect(constructWebhookEvent('body', 'sig')).rejects.toThrow();
    });
  });

  it('routes processWebhookEvent to handlers', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.STRIPE_SECRET_KEY = 'sk';
      jest.doMock('@/lib/stripe/client', () => ({ stripe: {} }));
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { id: 'biz1' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => ({ data: {}, error: null }),
            }),
          }),
        }),
      }));
      const { processWebhookEvent } = require('@/lib/stripe/webhooks');
      const now = Math.floor(Date.now() / 1000);
      await processWebhookEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            items: { data: [{ price: { id: 'price_1' } }] },
            current_period_end: now,
            cancel_at_period_end: false,
            metadata: { business_id: 'biz1' },
            billing_cycle_anchor: now,
          },
        },
      } as any);
      await processWebhookEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_1',
            metadata: { business_id: 'biz1' },
          },
        },
      } as any);
      await processWebhookEvent({
        type: 'invoice.paid',
        data: { object: { customer: 'cus_1' } },
      } as any);
      await processWebhookEvent({
        type: 'invoice.payment_failed',
        data: { object: { customer: 'cus_1' } },
      } as any);
      await processWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: { mode: 'subscription', metadata: { business_id: 'biz1' }, customer: 'cus_1' },
        },
      } as any);
      await processWebhookEvent({ type: 'ping', data: { object: {} } } as any);
    });
  });
});
