# Webhook Testing Documentation

## Overview

This document describes the comprehensive webhook testing infrastructure for TradesCaptain CRM, with a focus on Stripe payment webhooks following PCI compliance and Stripe's best practices.

## Test Files

### Core Webhook Tests
- `__tests__/app/api/webhooks.stripe.route.test.ts` - Main Stripe webhook endpoint tests
- `__tests__/lib/stripe/webhooks.test.ts` - Stripe webhook handler unit tests
- `__tests__/lib/stripe/webhooks.branch.test.ts` - Branch coverage tests
- `__tests__/lib/admin/stripe-webhook.*.test.ts` - Admin commission/subscription tests

### Test Utilities
- `__tests__/lib/stripe/webhook-test-utils.ts` - Mock factories and test helpers

## Test Utilities

### Mock Event Factories

```typescript
import {
  createMockStripeEvent,
  createPaymentIntentSucceededEvent,
  createPaymentIntentFailedEvent,
  createChargeSucceededEvent,
  createChargeRefundedEvent,
  createChargeDisputeCreatedEvent,
  createCheckoutSessionCompletedEvent,
  createInvoicePaidEvent,
  createInvoicePaymentFailedEvent,
  createSubscriptionEvent,
  createSubscriptionDeletedEvent,
} from '@/__tests__/lib/stripe/webhook-test-utils';
```

### Example: Creating a Payment Intent Event

```typescript
const event = createPaymentIntentSucceededEvent(
  'pi_test123',      // paymentIntentId
  5000,              // amount in cents ($50.00)
  'inv_test456',     // invoiceId
  { custom: 'meta' } // additional metadata
);
```

### Example: Creating a Subscription Event

```typescript
const event = createSubscriptionEvent(
  'customer.subscription.updated',
  'sub_test123',
  'cus_test456',
  'active',
  'price_pro_monthly',
  { business_id: 'biz_123' }
);
```

## Test Patterns

### Idempotency Testing

All webhook handlers must be idempotent. Test this by:

1. Processing an event once
2. Processing the same event again
3. Verifying no duplicate side effects

```typescript
it('processes event idempotently', async () => {
  const event = createPaymentIntentSucceededEvent('pi_idem', 5000, 'inv_1');
  constructWebhookEvent.mockResolvedValue(event);

  const req = { text: async () => JSON.stringify(event), headers: { get: () => 'sig' } };

  // First call
  await POST(req);

  // Second call (retry)
  await POST(req);

  // Verify single payment recorded
  expect(supabase.state.tables.payments.length).toBe(1);
});
```

### Signature Verification Testing

```typescript
it('rejects missing signature', async () => {
  const req = { text: async () => '{}', headers: { get: () => null } };
  const res = await POST(req);
  expect(res.status).toBe(400);
});

it('rejects invalid signature', async () => {
  constructWebhookEvent.mockRejectedValueOnce(new Error('Invalid signature'));
  const req = { text: async () => '{}', headers: { get: () => 'invalid' } };
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

### Error Handling Testing

```typescript
it('returns 500 when handler throws', async () => {
  handlers.handleSubscriptionUpdated.mockRejectedValueOnce(new Error('fail'));

  const event = createSubscriptionEvent('customer.subscription.updated', ...);
  constructWebhookEvent.mockResolvedValueOnce(event);

  const res = await POST(req);
  expect(res.status).toBe(500);
});

it('returns 200 for unknown event types', async () => {
  const event = createMockStripeEvent('unknown.event' as any, {});
  constructWebhookEvent.mockResolvedValueOnce(event);

  const res = await POST(req);
  expect(res.status).toBe(200); // Don't retry unknown events
});
```

## Event Types Covered

### Payment Events
- `payment_intent.succeeded` - Successful payment
- `payment_intent.payment_failed` - Failed payment attempt
- `charge.succeeded` - Charge confirmation
- `charge.refunded` - Refund processing
- `charge.dispute.created` - Dispute opened

### Checkout Events
- `checkout.session.completed` - Checkout completed (payment or subscription)

### Invoice Events
- `invoice.paid` - Invoice payment successful
- `invoice.payment_failed` - Invoice payment failed
- `invoice.upcoming` - Upcoming invoice notification

### Subscription Events
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.trial_will_end` - Trial ending soon

## Response Code Guidelines

| Status | When to Return |
|--------|----------------|
| 200 | Successful processing OR already processed (idempotent) |
| 400 | Invalid signature or malformed payload |
| 500 | Processing error (Stripe will retry) |

**Important**: Always return 200 for already-processed events to prevent infinite retries.

## Running Tests

```bash
# Run all webhook tests
npm test -- --testPathPattern="webhook"

# Run specific test file
npm test -- __tests__/app/api/webhooks.stripe.route.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern="webhook"
```

## Security Checklist

- [ ] Signature verification using `STRIPE_WEBHOOK_SECRET`
- [ ] Idempotency keys stored in `processed_webhook_events` table
- [ ] Race condition prevention with atomic INSERT
- [ ] No sensitive data logged
- [ ] PCI-compliant error messages (no card details)
- [ ] Appropriate response codes for Stripe retry logic

## Performance Requirements

- Webhook handlers should respond in < 20 seconds (Stripe timeout)
- Target response time: < 5 seconds for normal operations
- Use background processing for long-running tasks

## Debugging Webhooks

### Check processed events
```sql
SELECT * FROM processed_webhook_events
WHERE stripe_event_id = 'evt_xxx'
ORDER BY processed_at DESC;
```

### Admin API for webhook monitoring
```
GET /api/admin/support/webhooks?action=events&organizationId=xxx
GET /api/admin/support/webhooks?action=orphaned
GET /api/admin/support/webhooks?action=duplicates&conversationId=xxx
```

## Common Issues

### 1. Duplicate Processing
**Cause**: Idempotency key not checked before processing
**Solution**: Always check `processed_webhook_events` table before processing

### 2. Signature Validation Failures
**Cause**: Wrong webhook secret or payload modification
**Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

### 3. Race Conditions
**Cause**: Multiple webhook deliveries processed simultaneously
**Solution**: Use atomic INSERT with unique constraint on event_id

### 4. Timeout Errors
**Cause**: Long-running operations in webhook handler
**Solution**: Use background jobs for non-critical processing
