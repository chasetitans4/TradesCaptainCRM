// =====================================================
// ADMIN STRIPE WEBHOOK HANDLERS
// Commission tracking for CRM and Web plan subscriptions
// v5.9: Added payout scheduling with 1st/15th rule
// =====================================================

import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { logApiError } from '@/lib/logger';
import { PaymentTracking } from './types';
import {
  createUpfrontCommission,
  createRecurringCommission,
  createAnnualCommission,
  markCommissionEligible,
  forfeitSubscriptionCommissions,
  getCommissionRules,
  upsertRetentionTracking,
} from './commissions';
import { getNextPayoutDate } from './payout-scheduler';

/**
 * Check if webhook event has already been processed
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single();
  if (data) return true;
  const { data: alt } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single();
  return !!alt;
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('processed_webhook_events').insert({
    stripe_event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Get payment tracking for a subscription
 */
async function getPaymentTracking(subscriptionId: string): Promise<PaymentTracking | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('payment_tracking')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  return (data as PaymentTracking) || null;
}

/**
 * Create or update payment tracking
 */
async function upsertPaymentTracking(data: {
  stripe_subscription_id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  agent_id?: string;
  plan_type?: string;
}): Promise<PaymentTracking> {
  const existing = await getPaymentTracking(data.stripe_subscription_id);

  if (existing) {
    return existing;
  }

  const supabase = createAdminClient();
  const { data: tracking, error } = await supabase
    .from('payment_tracking')
    .insert({
      ...data,
      successful_payments: 0,
      upfront_eligible: false,
      upfront_paid: false,
      recurring_eligible: false,
    })
    .select()
    .single();

  if (error) throw error;
  return tracking as PaymentTracking;
}

/**
 * Handle successful subscription payment (invoice.paid)
 */
export async function handleAdminInvoicePaid(
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return;
  }

  const supabase = createAdminClient();
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Find account by subscription ID
  const { data: crmAccount } = await supabase
    .from('crm_accounts')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const account = crmAccount || webCustomer;
  const accountType = crmAccount ? 'crm' : 'web';

  if (!account) {
    return;
  }

  if (!account.agent_id) {
    await markEventProcessed(eventId, 'invoice.paid');
    return;
  }

  // Get or create payment tracking
  let tracking: PaymentTracking = await upsertPaymentTracking({
    stripe_subscription_id: subscriptionId,
    crm_account_id: crmAccount?.id,
    web_customer_id: webCustomer?.id,
    agent_id: account.agent_id,
    plan_type: account.plan_type,
  });

  // Increment payment count
  const paymentNumber = tracking.successful_payments + 1;
  const now = new Date().toISOString();

  // Update tracking record
  const updateData: Partial<PaymentTracking> & Record<string, any> = {
    successful_payments: paymentNumber,
    updated_at: now,
  };

  if (paymentNumber === 1) updateData.first_payment_at = now;
  if (paymentNumber === 2) updateData.second_payment_at = now;
  if (paymentNumber === 3) updateData.third_payment_at = now;

  // Get commission rules
  const rules = await getCommissionRules(
    account.plan_type,
    account.billing_interval || 'month',
    account.plan_tier || undefined
  );

  if (!rules) {
    await supabase
      .from('payment_tracking')
      .update(updateData)
      .eq('id', tracking.id);
    await markEventProcessed(eventId, 'invoice.paid');
    return;
  }

  const saleAmount = (invoice.amount_paid || 0) / 100;
  const accountId = crmAccount?.id || webCustomer?.id;

  // v5.9: Calculate payout date using 1st/15th schedule
  const paymentDate = new Date(now);
  const scheduledPayoutDate = getNextPayoutDate(paymentDate);

  if (rules.upfront_amount && rules.upfront_amount > 0 && account.billing_interval !== 'year') {
    if (paymentNumber === 1) {
      try {
        await createUpfrontCommission(
          account.agent_id,
          accountId as string,
          accountType,
          subscriptionId,
          rules,
          saleAmount,
          new Date(now),
          paymentDate,
          scheduledPayoutDate
        );
      } catch (error) {
        logApiError('POST', '/api/webhooks/stripe', error as Error);
        throw error;
      }
    }
    if (paymentNumber === rules.upfront_delay_payments) {
      updateData.upfront_eligible = true;
      try {
        const { data: pending } = await supabase
          .from('commissions')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId)
          .eq('commission_type', 'upfront')
          .eq('status', 'pending')
          .limit(1);
        const commissionId = pending?.[0]?.id;
        if (commissionId) {
          await markCommissionEligible(commissionId);
        }
      } catch (error) {
        logApiError('POST', '/api/webhooks/stripe', error as Error);
        throw error;
      }
    }
  }

  // === RECURRING COMMISSION ===
  // Paid for payments 3-14 (or as configured)
  if (paymentNumber >= rules.recurring_start_payment &&
      paymentNumber <= rules.recurring_end_payment &&
      rules.recurring_rate > 0) {

    if (paymentNumber === rules.recurring_start_payment) {
      updateData.recurring_eligible = true;
      updateData.recurring_end_payment = rules.recurring_end_payment;
    }

    try {
      await createRecurringCommission(
        account.agent_id,
        accountId as string,
        accountType,
        subscriptionId,
        rules,
        saleAmount,
        paymentNumber,
        tracking.first_payment_at ? new Date(tracking.first_payment_at) : new Date(now),
        paymentDate,
        scheduledPayoutDate
      );
    } catch (error) {
      logApiError('POST', '/api/webhooks/stripe', error as Error);
      throw error;
    }
  }

  // === ANNUAL ONE-TIME COMMISSION ===
  // For annual billing, 35% of first year after 2nd payment (paid annually)
  if (account.billing_interval === 'year' &&
      paymentNumber === rules.upfront_delay_payments &&
      rules.annual_rate > 0) {

    try {
      await createAnnualCommission(
        account.agent_id,
        accountId as string,
        accountType,
        subscriptionId,
        rules,
        saleAmount,
        new Date(now),
        paymentDate,
        scheduledPayoutDate
      );
    } catch (error) {
      logApiError('POST', '/api/webhooks/stripe', error as Error);
      throw error;
    }
  }

  // === RETENTION TRACKING ===
  // Create retention tracking after first payment
  if (paymentNumber === 1 && rules.retention_enabled) {
    if (crmAccount?.id) {
      await upsertRetentionTracking(crmAccount.id, 'crm', account.agent_id, {});
    } else if (webCustomer?.id) {
      await upsertRetentionTracking(webCustomer.id, 'web', account.agent_id, {});
    }
  }

  // Update tracking
  await supabase
    .from('payment_tracking')
    .update(updateData)
    .eq('id', tracking.id);

  await markEventProcessed(eventId, 'invoice.paid');
}

/**
 * Handle subscription cancellation
 */
export async function handleAdminSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return;
  }

  const supabase = createAdminClient();
  const subscriptionId = subscription.id;

  // Find account
  const { data: crmAccount } = await supabase
    .from('crm_accounts')
    .select('id, agent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('id, agent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const account = crmAccount || webCustomer;

  if (account) {
    // Update account status
    if (crmAccount) {
      await supabase
        .from('crm_accounts')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', crmAccount.id);
    } else if (webCustomer) {
      await supabase
        .from('web_customers')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', webCustomer.id);
    }

    // Forfeit any pending commissions
    await forfeitSubscriptionCommissions(subscriptionId, 'customer_cancelled');
  }

  await markEventProcessed(eventId, 'customer.subscription.deleted');
}

/**
 * Handle subscription update (status changes)
 */
export async function handleAdminSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return;
  }

  const supabase = createAdminClient();
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Find account
  const { data: crmAccount } = await supabase
    .from('crm_accounts')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'trial',
    incomplete_expired: 'cancelled',
    trialing: 'trial',
    paused: 'suspended',
  };

  const newStatus = statusMap[status] || 'active';

  if (crmAccount) {
    await supabase
      .from('crm_accounts')
      .update({
        status: newStatus,
        ...(status === 'canceled' ? { cancelled_at: new Date().toISOString() } : {}),
      })
      .eq('id', crmAccount.id);
  } else if (webCustomer) {
    await supabase
      .from('web_customers')
      .update({
        status: newStatus,
        ...(status === 'canceled' ? { cancelled_at: new Date().toISOString() } : {}),
      })
      .eq('id', webCustomer.id);
  }

  // If subscription becomes past_due or canceled, forfeit pending commissions
  if (['past_due', 'canceled', 'unpaid'].includes(status)) {
    const reason = status === 'canceled' ? 'customer_cancelled' : 'clawback';
    await forfeitSubscriptionCommissions(subscriptionId, reason);
  }

  await markEventProcessed(eventId, 'customer.subscription.updated');
}

/**
 * Handle invoice payment failure
 */
export async function handleAdminInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return;
  }

  const supabase = createAdminClient();
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Update account status
  const { data: crmAccount } = await supabase
    .from('crm_accounts')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (crmAccount) {
    await supabase
      .from('crm_accounts')
      .update({ status: 'past_due' })
      .eq('id', crmAccount.id);
  } else if (webCustomer) {
    await supabase
      .from('web_customers')
      .update({ status: 'past_due' })
      .eq('id', webCustomer.id);
  }

  await markEventProcessed(eventId, 'invoice.payment_failed');
}

/**
 * Handle checkout session completed (new subscription)
 */
export async function handleAdminCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return;
  }

  const supabase = createAdminClient();

  // This is mainly for linking new subscriptions to accounts
  // The actual commission handling happens in invoice.paid

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  const metadata = session.metadata || {};

  if (!subscriptionId) {
    await markEventProcessed(eventId, 'checkout.session.completed');
    return;
  }

  // If metadata contains account info, link the subscription
  if (metadata.crm_account_id) {
    await supabase
      .from('crm_accounts')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active',
        is_trial: false,
      })
      .eq('id', metadata.crm_account_id);
  }

  if (metadata.web_customer_id) {
    await supabase
      .from('web_customers')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active',
      })
      .eq('id', metadata.web_customer_id);
  }

  await markEventProcessed(eventId, 'checkout.session.completed');
}
