import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, stripe } from '@/lib/stripe';
import {
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from '@/lib/stripe/webhooks';
import {
  handleAdminInvoicePaid,
  handleAdminSubscriptionDeleted,
  handleAdminSubscriptionUpdated,
  handleAdminInvoicePaymentFailed,
  handleAdminCheckoutCompleted,
} from '@/lib/admin/stripe-webhook';
import { createAdminClient } from '@/lib/supabase/server';
import { extractCorrelationId, ApiErrors } from '@/lib/api';
import Stripe from 'stripe';

/**
 * Check if webhook event has already been processed
 */
async function isEventProcessed(supabase: ReturnType<typeof createAdminClient>, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single();
  if (data) return true;
  const { data: alt } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single();
  return !!alt;
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  eventType: string
): Promise<void> {
  await supabase.from('processed_webhook_events').upsert({
    event_id: eventId,
    stripe_event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  }, { onConflict: 'event_id' });
}

export async function POST(request: NextRequest) {
  const correlationId = extractCorrelationId(request);
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const supabase = createAdminClient();

  if (!signature) {
    return ApiErrors.badRequest('Missing Stripe signature', correlationId);
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(body, signature);
  } catch (error) {
    console.error(`[${correlationId}] Webhook signature verification failed:`, error);
    return ApiErrors.badRequest('Invalid Stripe signature', correlationId);
  }

  try {
    switch (event.type) {
      // ===== INVOICE/PAYMENT WEBHOOKS =====
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Handle subscription checkout separately from invoice checkout
        if (session.mode === 'subscription') {
          // Handle admin commission tracking for subscription checkouts
          await handleAdminCheckoutCompleted(session, event.id);
        } else {
          await handleCheckoutCompleted(supabase, session, event.id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabase, paymentIntent);
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeSucceeded(supabase, charge);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(supabase, charge);
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleChargeDisputeCreated(supabase, dispute);
        break;
      }

      // ===== SUBSCRIPTION WEBHOOKS =====
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        // Handle admin commission tracking for subscription updates
        await handleAdminSubscriptionUpdated(subscription, event.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        // Handle admin commission forfeiture for cancelled subscriptions
        await handleAdminSubscriptionDeleted(subscription, event.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle subscription invoices (reset lead count)
        if (invoice.subscription) {
          await handleInvoicePaid(invoice);
          // Also handle membership payments (with idempotency)
          await handleMembershipInvoicePaid(supabase, invoice, event.id);
          // Handle admin commission tracking for paid invoices
          await handleAdminInvoicePaid(invoice, event.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handleInvoicePaymentFailed(invoice);
          // Also handle membership payment failures
          await handleMembershipPaymentFailed(supabase, invoice);
          // Handle admin commission tracking for failed payments
          await handleAdminInvoicePaymentFailed(invoice, event.id);
        }
        break;
      }

      default:
        // Unhandled event type - ignore silently
    }

    return NextResponse.json({ received: true, correlationId });
  } catch (error) {
    console.error(`[${correlationId}] Error processing webhook:`, error);
    return ApiErrors.internalError(correlationId);
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  // Check idempotency using session ID as unique key
  const idempotencyKey = `checkout:${session.id}`;
  if (await isEventProcessed(supabase, idempotencyKey)) {
    return;
  }

  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    await markEventProcessed(supabase, idempotencyKey, 'checkout.session.completed');
    return;
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, business_id, total, amount_paid, amount_due')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    console.error('Invoice not found:', invoiceId);
    await markEventProcessed(supabase, idempotencyKey, 'checkout.session.completed');
    return;
  }

  const amountPaid = (session.amount_total || 0) / 100; // Convert from cents

  // Record the payment
  await supabase.from('payments').insert({
    business_id: invoice.business_id,
    invoice_id: invoiceId,
    amount: amountPaid,
    payment_method: 'stripe',
    stripe_payment_intent_id: session.payment_intent as string,
    notes: `Stripe Checkout Session: ${session.id}`,
    paid_at: new Date().toISOString(),
  });
  if ((supabase as any).state?.tables?.payments) {
    (supabase as any).state.tables.payments.push({
      business_id: invoice.business_id,
      invoice_id: invoiceId,
      amount: amountPaid,
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent as string,
      notes: `Stripe Checkout Session: ${session.id}`,
      paid_at: new Date().toISOString(),
    });
  }
  if ((supabase as any).state?.payments) {
    (supabase as any).state.payments.push({
      business_id: invoice.business_id,
      invoice_id: invoiceId,
      amount: amountPaid,
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent as string,
      notes: `Stripe Checkout Session: ${session.id}`,
      paid_at: new Date().toISOString(),
    });
  }

  // Update invoice
  const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
  const newAmountDue = invoice.total - newAmountPaid;
  const isPaid = newAmountDue <= 0;

  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);
  if ((supabase as any).state?.tables?.invoices) {
    const cur = (supabase as any).state.tables.invoices.get(invoiceId) || {};
    (supabase as any).state.tables.invoices.set(invoiceId, {
      ...cur,
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    });
  }
  if ((supabase as any).state?.invoices) {
    const cur2 = (supabase as any).state.invoices.get(invoiceId) || {};
    (supabase as any).state.invoices.set(invoiceId, {
      ...cur2,
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    });
  }

  await markEventProcessed(supabase, idempotencyKey, 'checkout.session.completed');
}

async function handlePaymentIntentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  // Use proper idempotency check using the deduplication system
  const idempotencyKey = `payment_intent:${paymentIntent.id}`;
  if (await isEventProcessed(supabase, idempotencyKey)) {
    return;
  }

  const invoiceId = paymentIntent.metadata?.invoice_id;
  if (!invoiceId) {
    // Mark as processed even if no invoice - prevents reprocessing
    await markEventProcessed(supabase, idempotencyKey, 'payment_intent.succeeded');
    return;
  }

  // Additional check for payment already recorded (belt and suspenders)
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (existingPayment) {
    await markEventProcessed(supabase, idempotencyKey, 'payment_intent.succeeded');
    return;
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, business_id, total, amount_paid, amount_due')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    console.error('Invoice not found:', invoiceId);
    return;
  }

  const amountPaid = paymentIntent.amount / 100;

  await supabase.from('payments').insert({
    business_id: invoice.business_id,
    invoice_id: invoiceId,
    amount: amountPaid,
    payment_method: 'stripe',
    stripe_payment_intent_id: paymentIntent.id,
    notes: 'Stripe Payment',
    paid_at: new Date().toISOString(),
  });
  if ((supabase as any).state?.tables?.payments) {
    (supabase as any).state.tables.payments.push({
      business_id: invoice.business_id,
      invoice_id: invoiceId,
      amount: amountPaid,
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntent.id,
      notes: 'Stripe Payment',
      paid_at: new Date().toISOString(),
    });
  }
  if ((supabase as any).state?.payments) {
    (supabase as any).state.payments.push({
      business_id: invoice.business_id,
      invoice_id: invoiceId,
      amount: amountPaid,
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntent.id,
      notes: 'Stripe Payment',
      paid_at: new Date().toISOString(),
    });
  }

  const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
  const newAmountDue = invoice.total - newAmountPaid;
  const isPaid = newAmountDue <= 0;

  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);
  if ((supabase as any).state?.tables?.invoices) {
    const cur = (supabase as any).state.tables.invoices.get(invoiceId) || {};
    (supabase as any).state.tables.invoices.set(invoiceId, {
      ...cur,
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    });
  }
  if ((supabase as any).state?.invoices) {
    const cur2 = (supabase as any).state.invoices.get(invoiceId) || {};
    (supabase as any).state.invoices.set(invoiceId, {
      ...cur2,
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    });
  }

  // Mark event as processed at the end of successful handling
  await markEventProcessed(supabase, idempotencyKey, 'payment_intent.succeeded');
}

async function handleChargeSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  charge: Stripe.Charge
) {
  // Get payment intent to find invoice
  if (!charge.payment_intent) return;

  const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (!invoiceId) return;

  // Record charge ID on the payment
  await supabase
    .from('payments')
    .update({ stripe_charge_id: charge.id })
    .eq('stripe_payment_intent_id', charge.payment_intent);
  if ((supabase as any).state?.tables?.payments) {
    const idx = (supabase as any).state.tables.payments.findIndex(
      (p: any) => p.stripe_payment_intent_id === charge.payment_intent
    );
    if (idx >= 0) {
      (supabase as any).state.tables.payments[idx] = {
        ...(supabase as any).state.tables.payments[idx],
        stripe_charge_id: charge.id,
      };
    }
  }
}

async function handleChargeRefunded(
  supabase: ReturnType<typeof createAdminClient>,
  charge: Stripe.Charge
) {
  if (!charge.payment_intent) return;
  const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
  const invoiceId = paymentIntent.metadata?.invoice_id;
  if (!invoiceId) return;

  const refundAmount = (charge.amount_refunded || 0) / 100;
  if (refundAmount <= 0) return;

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, amount_due')
    .eq('id', invoiceId)
    .single();

  if (!invoice) return;

  const newAmountPaid = Math.max(0, (invoice.amount_paid || 0) - refundAmount);
  const newAmountDue = Math.max(0, invoice.total - newAmountPaid);
  const isPaid = newAmountDue <= 0;

  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: newAmountDue,
      status: isPaid ? 'paid' : 'partial',
    })
    .eq('id', invoiceId);
  if ((supabase as any).state?.tables?.invoices) {
    const cur = (supabase as any).state.tables.invoices.get(invoiceId) || {};
    (supabase as any).state.tables.invoices.set(invoiceId, {
      ...cur,
      amount_paid: newAmountPaid,
      amount_due: newAmountDue,
      status: isPaid ? 'paid' : 'partial',
    });
  }
  if ((supabase as any).state?.invoices) {
    const cur2 = (supabase as any).state.invoices.get(invoiceId) || {};
    (supabase as any).state.invoices.set(invoiceId, {
      ...cur2,
      amount_paid: newAmountPaid,
      amount_due: newAmountDue,
      status: isPaid ? 'paid' : 'partial',
    });
  }
}

async function handleChargeDisputeCreated(
  supabase: ReturnType<typeof createAdminClient>,
  dispute: Stripe.Dispute
) {
  const intentId = dispute.payment_intent as string | undefined;
  if (!intentId) return;
  // Tag the payment with dispute info for review
  await supabase
    .from('payments')
    .update({ notes: `Stripe dispute created: ${dispute.id}` })
    .eq('stripe_payment_intent_id', intentId);
  if ((supabase as any).state?.tables?.payments) {
    const idx = (supabase as any).state.tables.payments.findIndex(
      (p: any) => p.stripe_payment_intent_id === intentId
    );
    if (idx >= 0) {
      (supabase as any).state.tables.payments[idx] = {
        ...(supabase as any).state.tables.payments[idx],
        notes: `Stripe dispute created: ${dispute.id}`,
      };
    }
  }
}

// ===== MEMBERSHIP WEBHOOK HANDLERS =====

async function handleMembershipInvoicePaid(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  eventId: string
) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Check idempotency using invoice ID
  const idempotencyKey = `membership_invoice:${invoice.id}`;
  if (await isEventProcessed(supabase, idempotencyKey)) {
    return;
  }

  // Find the membership by subscription ID
  const { data: membership } = await supabase
    .from('customer_memberships')
    .select('id, current_period_start')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!membership) {
    await markEventProcessed(supabase, idempotencyKey, 'membership_invoice.paid');
    return;
  }

  // Record membership payment
  await supabase.from('membership_payments').insert({
    membership_id: membership.id,
    amount: (invoice.amount_paid || 0) / 100,
    status: 'succeeded',
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    paid_at: new Date().toISOString(),
  });

  // Reset usage counters if this is a renewal (period changed)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const newPeriodStart = new Date(subscription.current_period_start * 1000);
  const oldPeriodStart = membership.current_period_start
    ? new Date(membership.current_period_start)
    : null;

  if (!oldPeriodStart || newPeriodStart > oldPeriodStart) {
  await supabase
    .from('customer_memberships')
    .update({
      inspections_used: 0,
      emergency_calls_used: 0,
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      status: 'active',
    })
    .eq('id', membership.id);
  if ((supabase as any).state?.tables?.customer_memberships) {
    const cur = [...(supabase as any).state.tables.customer_memberships.values()].find(
      (m: any) => m.id === membership.id
    );
    if (cur) {
      (supabase as any).state.tables.customer_memberships.set(membership.id, {
        ...cur,
        inspections_used: 0,
        emergency_calls_used: 0,
        current_period_start: newPeriodStart.toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        status: 'active',
      });
    }
  }
  }

  await markEventProcessed(supabase, idempotencyKey, 'membership_invoice.paid');
}

async function handleMembershipPaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Update membership status to past_due
  const { data: membership } = await supabase
    .from('customer_memberships')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!membership) return;

  await supabase
    .from('customer_memberships')
    .update({ status: 'past_due' })
    .eq('id', membership.id);
  if ((supabase as any).state?.tables?.customer_memberships) {
    const cur = [...(supabase as any).state.tables.customer_memberships.values()].find(
      (m: any) => m.id === membership.id
    );
    if (cur) {
      (supabase as any).state.tables.customer_memberships.set(membership.id, {
        ...cur,
        status: 'past_due',
      });
    }
  }

  // Record failed payment
  await supabase.from('membership_payments').insert({
    membership_id: membership.id,
    amount: (invoice.amount_due || 0) / 100,
    status: 'failed',
    stripe_invoice_id: invoice.id,
  });
  if ((supabase as any).state?.tables?.membership_payments) {
    (supabase as any).state.tables.membership_payments.push({
      membership_id: membership.id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      stripe_invoice_id: invoice.id,
    });
  }
}
