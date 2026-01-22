/**
 * Stripe Webhook Test Utilities
 *
 * Provides mock factories, test helpers, and utilities for comprehensive
 * webhook testing following Stripe's best practices.
 */

import Stripe from 'stripe';

// =====================================================
// MOCK EVENT FACTORIES
// =====================================================

/**
 * Creates a mock Stripe event with the given type and data
 */
export function createMockStripeEvent<T extends Stripe.Event.Type>(
  type: T,
  object: Partial<Stripe.Event.Data.Object>,
  overrides?: Partial<Stripe.Event>
): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: `req_test_${Date.now()}`, idempotency_key: null },
    type,
    data: { object, previous_attributes: {} },
    ...overrides,
  } as Stripe.Event;
}

/**
 * Creates a mock PaymentIntent.succeeded event
 */
export function createPaymentIntentSucceededEvent(
  paymentIntentId: string,
  amount: number,
  invoiceId?: string,
  metadata?: Record<string, string>
): Stripe.Event {
  return createMockStripeEvent('payment_intent.succeeded', {
    id: paymentIntentId,
    object: 'payment_intent',
    amount,
    amount_received: amount,
    currency: 'usd',
    status: 'succeeded',
    metadata: {
      invoice_id: invoiceId,
      ...metadata,
    },
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.PaymentIntent>);
}

/**
 * Creates a mock PaymentIntent.failed event
 */
export function createPaymentIntentFailedEvent(
  paymentIntentId: string,
  amount: number,
  errorCode?: string,
  errorMessage?: string
): Stripe.Event {
  return createMockStripeEvent('payment_intent.payment_failed', {
    id: paymentIntentId,
    object: 'payment_intent',
    amount,
    currency: 'usd',
    status: 'requires_payment_method',
    last_payment_error: errorCode
      ? {
          code: errorCode,
          message: errorMessage || 'Payment failed',
          type: 'card_error',
        }
      : null,
    created: Math.floor(Date.now() / 1000),
  } as unknown as Partial<Stripe.PaymentIntent>);
}

/**
 * Creates a mock Charge.succeeded event
 */
export function createChargeSucceededEvent(
  chargeId: string,
  paymentIntentId: string,
  amount: number
): Stripe.Event {
  return createMockStripeEvent('charge.succeeded', {
    id: chargeId,
    object: 'charge',
    amount,
    amount_captured: amount,
    currency: 'usd',
    payment_intent: paymentIntentId,
    status: 'succeeded',
    paid: true,
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Charge>);
}

/**
 * Creates a mock Charge.refunded event
 */
export function createChargeRefundedEvent(
  chargeId: string,
  paymentIntentId: string,
  originalAmount: number,
  refundedAmount: number
): Stripe.Event {
  return createMockStripeEvent('charge.refunded', {
    id: chargeId,
    object: 'charge',
    amount: originalAmount,
    amount_refunded: refundedAmount,
    currency: 'usd',
    payment_intent: paymentIntentId,
    refunded: refundedAmount >= originalAmount,
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Charge>);
}

/**
 * Creates a mock Charge.dispute.created event
 */
export function createChargeDisputeCreatedEvent(
  disputeId: string,
  paymentIntentId: string,
  amount: number,
  reason?: Stripe.Dispute.Reason
): Stripe.Event {
  return createMockStripeEvent('charge.dispute.created', {
    id: disputeId,
    object: 'dispute',
    amount,
    currency: 'usd',
    payment_intent: paymentIntentId,
    reason: reason || 'fraudulent',
    status: 'needs_response',
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Dispute>);
}

/**
 * Creates a mock Checkout.session.completed event
 */
export function createCheckoutSessionCompletedEvent(
  sessionId: string,
  mode: 'payment' | 'subscription' | 'setup',
  amountTotal: number,
  metadata?: Record<string, string>
): Stripe.Event {
  return createMockStripeEvent('checkout.session.completed', {
    id: sessionId,
    object: 'checkout.session',
    mode,
    amount_total: amountTotal,
    currency: 'usd',
    payment_intent: `pi_${sessionId}`,
    payment_status: 'paid',
    status: 'complete',
    metadata: metadata || {},
    customer: `cus_${sessionId}`,
    subscription: mode === 'subscription' ? `sub_${sessionId}` : null,
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Checkout.Session>);
}

/**
 * Creates a mock Invoice.paid event
 */
export function createInvoicePaidEvent(
  invoiceId: string,
  subscriptionId: string,
  amountPaid: number,
  customerId: string
): Stripe.Event {
  return createMockStripeEvent('invoice.paid', {
    id: invoiceId,
    object: 'invoice',
    amount_paid: amountPaid,
    amount_due: 0,
    currency: 'usd',
    customer: customerId,
    subscription: subscriptionId,
    payment_intent: `pi_${invoiceId}`,
    status: 'paid',
    paid: true,
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Invoice>);
}

/**
 * Creates a mock Invoice.payment_failed event
 */
export function createInvoicePaymentFailedEvent(
  invoiceId: string,
  subscriptionId: string,
  amountDue: number,
  customerId: string
): Stripe.Event {
  return createMockStripeEvent('invoice.payment_failed', {
    id: invoiceId,
    object: 'invoice',
    amount_due: amountDue,
    amount_paid: 0,
    currency: 'usd',
    customer: customerId,
    subscription: subscriptionId,
    status: 'open',
    paid: false,
    created: Math.floor(Date.now() / 1000),
  } as Partial<Stripe.Invoice>);
}

/**
 * Creates a mock Customer.subscription.created/updated event
 */
export function createSubscriptionEvent(
  type: 'customer.subscription.created' | 'customer.subscription.updated',
  subscriptionId: string,
  customerId: string,
  status: Stripe.Subscription.Status,
  priceId: string,
  metadata?: Record<string, string>
): Stripe.Event {
  const periodStart = Math.floor(Date.now() / 1000);
  const periodEnd = periodStart + 30 * 24 * 60 * 60; // 30 days

  return createMockStripeEvent(type, {
    id: subscriptionId,
    object: 'subscription',
    customer: customerId,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    metadata: metadata || {},
    items: {
      object: 'list',
      data: [
        {
          id: `si_${subscriptionId}`,
          price: {
            id: priceId,
            object: 'price',
            currency: 'usd',
            unit_amount: 4900,
          },
        },
      ],
    },
    created: periodStart,
  } as unknown as Partial<Stripe.Subscription>);
}

/**
 * Creates a mock Customer.subscription.deleted event
 */
export function createSubscriptionDeletedEvent(
  subscriptionId: string,
  customerId: string,
  metadata?: Record<string, string>
): Stripe.Event {
  return createMockStripeEvent('customer.subscription.deleted', {
    id: subscriptionId,
    object: 'subscription',
    customer: customerId,
    status: 'canceled',
    canceled_at: Math.floor(Date.now() / 1000),
    metadata: metadata || {},
    created: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
  } as Partial<Stripe.Subscription>);
}

// =====================================================
// MOCK SUPABASE STATE FACTORY
// =====================================================

export interface MockSupabaseState {
  processedEvents: Set<string>;
  processedEventsByStripeId: Set<string>;
  invoices: Map<string, any>;
  payments: any[];
  tables: {
    invoices: Map<string, any>;
    payments: any[];
    customer_memberships: Map<string, any>;
    membership_payments: any[];
    businesses: Map<string, any>;
    commissions: any[];
    payment_tracking: any[];
  };
}

/**
 * Creates a fresh mock Supabase state for testing
 */
export function createMockSupabaseState(): MockSupabaseState {
  return {
    processedEvents: new Set<string>(),
    processedEventsByStripeId: new Set<string>(),
    invoices: new Map<string, any>(),
    payments: [],
    tables: {
      invoices: new Map<string, any>(),
      payments: [],
      customer_memberships: new Map<string, any>(),
      membership_payments: [],
      businesses: new Map<string, any>(),
      commissions: [],
      payment_tracking: [],
    },
  };
}

/**
 * Creates a mock invoice for testing
 */
export function createMockInvoice(
  id: string,
  businessId: string,
  total: number,
  amountPaid = 0
): any {
  return {
    id,
    business_id: businessId,
    total,
    amount_paid: amountPaid,
    amount_due: total - amountPaid,
    status: amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
    created_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock customer membership for testing
 */
export function createMockMembership(
  id: string,
  stripeSubscriptionId: string,
  customerId: string,
  options?: {
    status?: string;
    currentPeriodStart?: Date;
    inspectionsUsed?: number;
    emergencyCallsUsed?: number;
  }
): any {
  return {
    id,
    stripe_subscription_id: stripeSubscriptionId,
    customer_id: customerId,
    status: options?.status || 'active',
    current_period_start: (options?.currentPeriodStart || new Date()).toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    inspections_used: options?.inspectionsUsed || 0,
    emergency_calls_used: options?.emergencyCallsUsed || 0,
    created_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock business for testing
 */
export function createMockBusiness(
  id: string,
  stripeCustomerId: string,
  options?: {
    planTier?: string;
    leadsLimit?: number;
    leadsThisMonth?: number;
  }
): any {
  return {
    id,
    stripe_customer_id: stripeCustomerId,
    plan_tier: options?.planTier || 'starter',
    leads_limit: options?.leadsLimit || 100,
    leads_this_month: options?.leadsThisMonth || 0,
    leads_used: 0,
    created_at: new Date().toISOString(),
  };
}

// =====================================================
// WEBHOOK SIGNATURE UTILITIES
// =====================================================

/**
 * Creates a mock webhook signature header for testing
 * Note: This is for test purposes only - actual signature verification uses Stripe SDK
 */
export function createMockSignature(payload: string, secret = 'whsec_test'): string {
  const timestamp = Math.floor(Date.now() / 1000);
  // In tests, the actual signature doesn't matter as we mock the verification
  return `t=${timestamp},v1=mock_signature_${timestamp}`;
}

// =====================================================
// REQUEST FACTORY
// =====================================================

/**
 * Creates a mock NextRequest for webhook testing
 */
export function createMockWebhookRequest(
  event: Stripe.Event,
  signature?: string
): { text: () => Promise<string>; headers: { get: (name: string) => string | null } } {
  const payload = JSON.stringify(event);
  return {
    text: async () => payload,
    headers: {
      get: (name: string) => {
        if (name === 'stripe-signature') {
          return signature || createMockSignature(payload);
        }
        if (name === 'x-correlation-id') {
          return `corr_${Date.now()}`;
        }
        return null;
      },
    },
  };
}

// =====================================================
// ASSERTION HELPERS
// =====================================================

/**
 * Asserts that an invoice was updated correctly after a payment
 */
export function assertInvoicePaymentApplied(
  state: MockSupabaseState,
  invoiceId: string,
  expectedAmountPaid: number,
  expectedStatus: 'paid' | 'partial' | 'pending'
): void {
  const invoice = state.tables.invoices.get(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found in state`);
  }
  if (invoice.amount_paid !== expectedAmountPaid) {
    throw new Error(
      `Expected amount_paid to be ${expectedAmountPaid}, got ${invoice.amount_paid}`
    );
  }
  if (invoice.status !== expectedStatus) {
    throw new Error(`Expected status to be ${expectedStatus}, got ${invoice.status}`);
  }
}

/**
 * Asserts that a payment was recorded
 */
export function assertPaymentRecorded(
  state: MockSupabaseState,
  paymentIntentId: string,
  expectedAmount: number
): void {
  const payment = state.tables.payments.find(
    (p: any) => p.stripe_payment_intent_id === paymentIntentId
  );
  if (!payment) {
    throw new Error(`Payment with intent ${paymentIntentId} not found`);
  }
  if (payment.amount !== expectedAmount) {
    throw new Error(`Expected payment amount to be ${expectedAmount}, got ${payment.amount}`);
  }
}

/**
 * Asserts that an event was marked as processed (idempotency)
 */
export function assertEventProcessed(state: MockSupabaseState, eventId: string): void {
  if (!state.processedEvents.has(eventId) && !state.processedEventsByStripeId.has(eventId)) {
    throw new Error(`Event ${eventId} was not marked as processed`);
  }
}

/**
 * Asserts that membership counters were reset
 */
export function assertMembershipReset(
  state: MockSupabaseState,
  membershipId: string
): void {
  const membership = state.tables.customer_memberships.get(membershipId);
  if (!membership) {
    throw new Error(`Membership ${membershipId} not found`);
  }
  if (membership.inspections_used !== 0 || membership.emergency_calls_used !== 0) {
    throw new Error(
      `Expected membership counters to be reset, got inspections=${membership.inspections_used}, emergency=${membership.emergency_calls_used}`
    );
  }
}

// =====================================================
// ERROR SCENARIO GENERATORS
// =====================================================

/**
 * Creates error scenarios for testing webhook resilience
 */
export const errorScenarios = {
  missingSignature: () => ({
    text: async () => '{}',
    headers: { get: () => null },
  }),

  invalidSignature: () => ({
    text: async () => '{}',
    headers: { get: () => 'invalid_signature' },
  }),

  malformedPayload: () => ({
    text: async () => 'not-valid-json{',
    headers: { get: () => 'sig' },
  }),

  emptyPayload: () => ({
    text: async () => '',
    headers: { get: () => 'sig' },
  }),

  missingEventType: () =>
    createMockWebhookRequest({
      id: 'evt_test',
      object: 'event',
      data: { object: {} },
    } as unknown as Stripe.Event),

  missingEventData: () =>
    createMockWebhookRequest({
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      object: 'event',
    } as unknown as Stripe.Event),
};

// =====================================================
// RETRY SIMULATION HELPERS
// =====================================================

/**
 * Simulates Stripe retry behavior by sending the same event multiple times
 */
export async function simulateRetries<T>(
  handler: (req: any) => Promise<T>,
  event: Stripe.Event,
  retryCount: number
): Promise<T[]> {
  const results: T[] = [];
  const request = createMockWebhookRequest(event);

  for (let i = 0; i < retryCount; i++) {
    results.push(await handler(request));
  }

  return results;
}

/**
 * Simulates concurrent webhook delivery (race condition testing)
 */
export async function simulateConcurrentDelivery<T>(
  handler: (req: any) => Promise<T>,
  event: Stripe.Event,
  concurrentCount: number
): Promise<T[]> {
  const request = createMockWebhookRequest(event);
  const promises = Array(concurrentCount)
    .fill(null)
    .map(() => handler(request));

  return Promise.all(promises);
}

// =====================================================
// TIMING UTILITIES
// =====================================================

/**
 * Waits for a specified duration (useful for testing timeouts)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measures execution time of an async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - start,
  };
}
