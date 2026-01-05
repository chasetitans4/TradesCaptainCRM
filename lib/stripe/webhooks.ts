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

  // Determine plan tier from price (v5.9.2 - renamed growth→pro, pro→enterprise)
  const priceId = subscription.items.data[0]?.price.id;
  let planTier = 'enterprise';
  let leadsLimit = 300;

  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
    planTier = 'pro';
    leadsLimit = 300;
  } else if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) {
    planTier = 'starter';
    leadsLimit = 0;
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
 * Sends notification to business owner about upcoming trial end
 */
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const businessId = subscription.metadata.business_id;

  if (!businessId) {
    syncLogger.warn({
      msg: 'Missing business_id in subscription metadata for trial_will_end',
      subscriptionId: subscription.id,
    });
    return;
  }

  // Get business and owner info
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, owner_id')
    .eq('id', businessId)
    .single();

  if (!business) {
    return;
  }

  // Get owner's email
  const { data: owner } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', business.owner_id)
    .single();

  if (!owner?.email) {
    syncLogger.warn({
      msg: 'No owner email found for trial_will_end notification',
      businessId,
    });
    return;
  }

  // Calculate trial end date
  const trialEndDate = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'soon';

  // Send notification email
  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: owner.email,
      subject: `Your TradesCaptain trial ends ${trialEndDate}`,
      html: `
        <h2>Your trial is ending soon</h2>
        <p>Hi ${owner.name || 'there'},</p>
        <p>Your TradesCaptain trial for <strong>${business.name}</strong> will end on <strong>${trialEndDate}</strong>.</p>
        <p>To continue using all features without interruption, please add a payment method to your account.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Billing
          </a>
        </p>
        <p>If you have any questions, reply to this email and we'll be happy to help!</p>
        <p>Best,<br>The TradesCaptain Team</p>
      `,
    });

    syncLogger.info({
      msg: 'Trial ending notification sent',
      businessId,
      email: owner.email,
      trialEndDate,
    });
  } catch (emailError) {
    syncLogger.error({
      msg: 'Failed to send trial ending notification',
      businessId,
      error: emailError instanceof Error ? emailError.message : 'Unknown error',
    });
  }
}

/**
 * Handle invoice.upcoming - notify customer about upcoming charge
 */
export async function handleInvoiceUpcoming(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = await createClient();
  const customerId = invoice.customer as string;

  if (!customerId) return;

  // Find business by stripe customer ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, owner_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!business) return;

  // Get owner's email
  const { data: owner } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', business.owner_id)
    .single();

  if (!owner?.email) return;

  const amountDue = (invoice.amount_due || 0) / 100;
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date * 1000).toLocaleDateString()
    : 'soon';

  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: owner.email,
      subject: `Upcoming charge: $${amountDue.toFixed(2)} for TradesCaptain`,
      html: `
        <h2>Upcoming Subscription Charge</h2>
        <p>Hi ${owner.name || 'there'},</p>
        <p>Your TradesCaptain subscription for <strong>${business.name}</strong> will be charged <strong>$${amountDue.toFixed(2)}</strong> on <strong>${dueDate}</strong>.</p>
        <p>No action is needed - this is just a heads up about your upcoming payment.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing"
             style="color: #2563eb; text-decoration: underline;">
            View Billing Details
          </a>
        </p>
        <p>Best,<br>The TradesCaptain Team</p>
      `,
    });

    syncLogger.info({
      msg: 'Upcoming charge notification sent',
      businessId: business.id,
      amount: amountDue,
    });
  } catch (emailError) {
    syncLogger.error({
      msg: 'Failed to send upcoming charge notification',
      businessId: business.id,
      error: emailError instanceof Error ? emailError.message : 'Unknown error',
    });
  }
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

    case 'invoice.upcoming':
      await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
      break;

    default:
      // Unhandled event type - ignore silently
  }
}
