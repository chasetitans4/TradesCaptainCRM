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
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // ===== INVOICE/PAYMENT WEBHOOKS =====
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Handle subscription checkout separately from invoice checkout
        if (session.mode === 'subscription') {
          // Handle admin commission tracking for subscription checkouts
          await handleAdminCheckoutCompleted(session, event.id);
          console.log('Subscription checkout completed');
        } else {
          await handleCheckoutCompleted(supabase, session);
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
          // Also handle membership payments
          await handleMembershipInvoicePaid(supabase, invoice);
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    console.log('No invoice_id in session metadata');
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

  console.log(`Payment recorded for invoice ${invoiceId}: $${amountPaid}`);
}

async function handlePaymentIntentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const invoiceId = paymentIntent.metadata?.invoice_id;
  if (!invoiceId) {
    // Payment might be from payment link, try to find by other means
    console.log('No invoice_id in payment intent metadata');
    return;
  }

  // Check if payment already recorded
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (existingPayment) {
    console.log('Payment already recorded:', paymentIntent.id);
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
}

// ===== MEMBERSHIP WEBHOOK HANDLERS =====

async function handleMembershipInvoicePaid(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Find the membership by subscription ID
  const { data: membership } = await supabase
    .from('customer_memberships')
    .select('id, current_period_start')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!membership) return;

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
  }

  console.log(`Membership payment recorded for subscription ${subscriptionId}`);
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

  // Record failed payment
  await supabase.from('membership_payments').insert({
    membership_id: membership.id,
    amount: (invoice.amount_due || 0) / 100,
    status: 'failed',
    stripe_invoice_id: invoice.id,
  });

  console.log(`Membership payment failed for subscription ${subscriptionId}`);
}
