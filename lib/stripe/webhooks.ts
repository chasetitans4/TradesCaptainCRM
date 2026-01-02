// =====================================================
// STRIPE WEBHOOK HANDLERS
// =====================================================

import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { syncLogger } from '@/lib/logger';

/**
 * Handle subscription created/updated
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const businessId = subscription.metadata.business_id;

  if (!businessId) {
    syncLogger.warn({
      msg: 'Missing business_id in subscription metadata',
      subscriptionId: subscription.id,
    });
    return;
  }

  // Determine plan tier from price
  const priceId = subscription.items.data[0]?.price.id;
  let planTier = 'pro';
  let leadsLimit = 300;

  if (priceId === process.env.STRIPE_PRICE_GROWTH_MONTHLY) {
    planTier = 'growth';
    leadsLimit = 200;
  }

  // Check for multi-location addon
  const hasMultiLocation = subscription.items.data.some(
    (item) => item.price.id === process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON
  );

  await supabase
    .from('businesses')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      plan_tier: planTier,
      leads_limit: leadsLimit,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      has_multi_location_addon: hasMultiLocation,
      billing_cycle_anchor: new Date(subscription.billing_cycle_anchor * 1000).toISOString(),
    })
    .eq('id', businessId);
}

/**
 * Handle subscription deleted (canceled)
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const businessId = subscription.metadata.business_id;

  if (!businessId) {
    syncLogger.warn({
      msg: 'Missing business_id in subscription metadata',
      subscriptionId: subscription.id,
    });
    return;
  }

  await supabase
    .from('businesses')
    .update({
      stripe_subscription_status: 'canceled',
      cancel_at_period_end: false,
    })
    .eq('id', businessId);
}

/**
 * Handle invoice paid - reset monthly lead count
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient();
  const customerId = invoice.customer as string;

  // Find business by stripe customer ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (business) {
    // Reset monthly lead count on successful payment
    await supabase
      .from('businesses')
      .update({
        leads_this_month: 0,
        leads_used: 0,
        leads_month_reset_at: new Date().toISOString(),
      })
      .eq('id', business.id);
  }
}

/**
 * Handle invoice payment failed
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = await createClient();
  const customerId = invoice.customer as string;

  // Find business by stripe customer ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (business) {
    // Update subscription status
    await supabase
      .from('businesses')
      .update({
        stripe_subscription_status: 'past_due',
      })
      .eq('id', business.id);

    // TODO: Send notification email about failed payment
  }
}

/**
 * Handle checkout session completed - link subscription to business
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = await createClient();
  const businessId = session.metadata?.business_id;

  if (!businessId || session.mode !== 'subscription') {
    return;
  }

  // Update business with customer ID if not already set
  if (session.customer) {
    await supabase
      .from('businesses')
      .update({
        stripe_customer_id: session.customer as string,
      })
      .eq('id', businessId);
  }

  // The subscription.created webhook will handle the rest
}

/**
 * Handle customer.subscription.trial_will_end
 */
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription
): Promise<void> {
  const businessId = subscription.metadata.business_id;

  if (!businessId) {
    return;
  }

  // TODO: Send trial ending notification email
}

/**
 * Construct and verify webhook event
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Process a webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    default:
      // Unhandled event type - ignore silently
  }
}
