/**
 * Stripe Payment Links Branch Coverage Tests
 *
 * Tests for edge cases to achieve 85%+ branch coverage.
 */

describe('lib/stripe/payment-links branch coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app';
  });

  describe('createCheckoutSession', () => {
    it('returns empty string when session.url is null', async () => {
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          checkout: {
            sessions: {
              create: jest.fn(async () => ({
                url: null, // Session created but no URL
              })),
            },
          },
        },
      }));
      const { createCheckoutSession } = require('@/lib/stripe/payment-links');
      const url = await createCheckoutSession({
        invoiceId: 'inv_null',
        businessId: 'biz_null',
        amount: 1000,
        customerName: 'Test',
        description: 'Test invoice',
      });
      expect(url).toBe('');
    });

    it('returns empty string when session.url is undefined', async () => {
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          checkout: {
            sessions: {
              create: jest.fn(async () => ({
                // url is undefined
              })),
            },
          },
        },
      }));
      const { createCheckoutSession } = require('@/lib/stripe/payment-links');
      const url = await createCheckoutSession({
        invoiceId: 'inv_undef',
        businessId: 'biz_undef',
        amount: 1000,
        customerName: 'Test',
        description: 'Test invoice',
      });
      expect(url).toBe('');
    });

    it('uses default currency when not provided', async () => {
      const sessionMock = jest.fn(async () => ({ url: 'https://checkout' }));
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          checkout: {
            sessions: {
              create: sessionMock,
            },
          },
        },
      }));
      const { createCheckoutSession } = require('@/lib/stripe/payment-links');
      await createCheckoutSession({
        invoiceId: 'inv_default',
        businessId: 'biz_default',
        amount: 2000,
        customerName: 'Default',
        description: 'Default currency test',
        // No currency specified
      });
      expect(sessionMock).toHaveBeenCalled();
      const args = sessionMock.mock.calls[0][0];
      expect(args.line_items[0].price_data.currency).toBe('usd');
    });
  });

  describe('createPaymentLink', () => {
    it('uses default currency when not provided', async () => {
      const pricesMock = jest.fn(async () => ({ id: 'price_test' }));
      const paymentLinksMock = jest.fn(async () => ({ url: 'https://link' }));
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          prices: { create: pricesMock },
          paymentLinks: { create: paymentLinksMock },
        },
      }));
      const { createPaymentLink } = require('@/lib/stripe/payment-links');
      await createPaymentLink({
        invoiceId: 'inv_pl',
        businessId: 'biz_pl',
        amount: 3000,
        customerName: 'PaymentLink',
        description: 'Payment link test',
        // No currency specified
      });
      expect(pricesMock).toHaveBeenCalled();
      const args = pricesMock.mock.calls[0][0];
      expect(args.currency).toBe('usd');
    });
  });

  describe('constructWebhookEvent', () => {
    it('passes through to stripe.webhooks.constructEvent', () => {
      const constructMock = jest.fn().mockReturnValue({ id: 'evt_test', type: 'test.event' });
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          webhooks: {
            constructEvent: constructMock,
          },
        },
      }));
      const { constructWebhookEvent } = require('@/lib/stripe/payment-links');
      const result = constructWebhookEvent('payload', 'sig', 'secret');
      expect(constructMock).toHaveBeenCalledWith('payload', 'sig', 'secret');
      expect(result.type).toBe('test.event');
    });

    it('handles Buffer payload', () => {
      const constructMock = jest.fn().mockReturnValue({ id: 'evt_buf', type: 'buffer.event' });
      jest.doMock('@/lib/stripe/client', () => ({
        stripe: {
          webhooks: {
            constructEvent: constructMock,
          },
        },
      }));
      const { constructWebhookEvent } = require('@/lib/stripe/payment-links');
      const bufPayload = Buffer.from('test payload');
      const result = constructWebhookEvent(bufPayload, 'sig', 'secret');
      expect(constructMock).toHaveBeenCalledWith(bufPayload, 'sig', 'secret');
      expect(result.type).toBe('buffer.event');
    });
  });
});
