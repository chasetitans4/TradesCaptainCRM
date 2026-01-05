// =====================================================
// STRIPE SUBSCRIPTIONS MANAGEMENT
// =====================================================

import { stripe } from './client';
import { createClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';

export interface SubscriptionDetails {
  status: string;
  planTier: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  hasMultiLocationAddon: boolean;
  leadsThisMonth: number;
  leadsLimit: number;
  upcomingAmount: number | null;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

/**
 * Create a Stripe Checkout session for new subscription
 */
export async function createCheckoutSession(
  businessId: string,
  priceId: string,
  customerEmail: string
): Promise<string | null> {
  const supabase = await createClient();

  // Get or create Stripe customer
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id, name')
    .eq('id', businessId)
    .single();

  let customerId = business?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: business?.name,
      metadata: { business_id: businessId },
    });
    customerId = customer.id;

    await supabase
      .from('businesses')
      .update({ stripe_customer_id: customerId })
      .eq('id', businessId);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    metadata: { business_id: businessId },
    subscription_data: {
      metadata: { business_id: businessId },
    },
  });

  return session.url;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createCustomerPortalSession(
  businessId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return session.url;
}

/**
 * Get subscription details for a business
 */
export async function getSubscriptionDetails(
  businessId: string
): Promise<SubscriptionDetails | null> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select(`
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      plan_tier,
      current_period_end,
      cancel_at_period_end,
      has_multi_location_addon,
      leads_this_month,
      leads_used,
      leads_limit
    `)
    .eq('id', businessId)
    .single();

  if (!business) {
    return null;
  }

  // Default result for businesses without subscription
  const result: SubscriptionDetails = {
    status: business.stripe_subscription_status || 'none',
    planTier: business.plan_tier,
    currentPeriodEnd: business.current_period_end ? new Date(business.current_period_end) : null,
    cancelAtPeriodEnd: business.cancel_at_period_end || false,
    hasMultiLocationAddon: business.has_multi_location_addon || false,
    leadsThisMonth: business.leads_this_month || business.leads_used || 0,
    leadsLimit:
      business.leads_limit ??
      (business.plan_tier === 'enterprise' ? 300 : business.plan_tier === 'pro' ? 300 : 0),
    upcomingAmount: null,
    paymentMethod: null,
  };

  // If no subscription, return early
  if (!business.stripe_subscription_id) {
    return result;
  }

  try {
    // Get subscription from Stripe for latest info
    const subscription = await stripe.subscriptions.retrieve(
      business.stripe_subscription_id,
      { expand: ['default_payment_method'] }
    );

    result.status = subscription.status;
    result.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    result.cancelAtPeriodEnd = subscription.cancel_at_period_end;

    // Get payment method details
    const paymentMethod = subscription.default_payment_method;
    if (paymentMethod && typeof paymentMethod !== 'string' && paymentMethod.card) {
      result.paymentMethod = {
        brand: paymentMethod.card.brand || 'card',
        last4: paymentMethod.card.last4 || '****',
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      };
    }

    // Get upcoming invoice
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: business.stripe_subscription_id,
      });
      result.upcomingAmount = upcomingInvoice.amount_due / 100;
    } catch {
      // No upcoming invoice (e.g., canceled)
    }
  } catch (error) {
    syncLogger.error({
      msg: 'Error fetching Stripe subscription',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      businessId,
      subscriptionId: business.stripe_subscription_id,
    });
  }

  return result;
}

/**
 * Get invoice history for a business
 */
export async function getInvoiceHistory(
  businessId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  date: Date;
  amount: number;
  status: string;
  pdfUrl: string | null;
}>> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_customer_id) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: business.stripe_customer_id,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      amount: invoice.amount_paid / 100,
      status: invoice.status || 'unknown',
      pdfUrl: invoice.invoice_pdf ?? null,
    }));
  } catch (error) {
    syncLogger.error({
      msg: 'Error fetching invoice history',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      businessId,
      limit,
    });
    return [];
  }
}

/**
 * Change subscription plan
 */
export async function changePlan(
  businessId: string,
  newPriceId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_subscription_id) {
    throw new Error('No active subscription');
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(
    business.stripe_subscription_id
  );

  // Update subscription with new price
  await stripe.subscriptions.update(business.stripe_subscription_id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });

  let planTier: 'starter' | 'pro' | 'enterprise' = 'enterprise';
  let leadsLimit = 300;
  if (newPriceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) {
    planTier = 'starter';
    leadsLimit = 0;
  } else if (newPriceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
    planTier = 'pro';
    leadsLimit = 300;
  }
  await supabase
    .from('businesses')
    .update({
      plan_tier: planTier,
      leads_limit: leadsLimit,
    })
    .eq('id', businessId);
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(businessId: string): Promise<void> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_subscription_id) {
    throw new Error('No active subscription');
  }

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(business.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await supabase
    .from('businesses')
    .update({ cancel_at_period_end: true })
    .eq('id', businessId);
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(businessId: string): Promise<void> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  // Remove cancellation
  await stripe.subscriptions.update(business.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await supabase
    .from('businesses')
    .update({ cancel_at_period_end: false })
    .eq('id', businessId);
}

/**
 * Add multi-location addon to subscription
 */
export async function addMultiLocationAddon(businessId: string): Promise<void> {
  if (!process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON) {
    throw new Error('Multi-location addon price not configured');
  }

  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id, has_multi_location_addon')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_subscription_id) {
    throw new Error('No active subscription');
  }

  if (business.has_multi_location_addon) {
    throw new Error('Multi-location addon already active');
  }

  // Add addon to subscription
  await stripe.subscriptionItems.create({
    subscription: business.stripe_subscription_id,
    price: process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON,
    quantity: 1,
  });

  await supabase
    .from('businesses')
    .update({
      has_multi_location_addon: true,
      additional_locations_count: 1,
    })
    .eq('id', businessId);
}

/**
 * Get price IDs for plans
 */
export function getPriceIds() {
  return {
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
    multiLocation: process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON,
  };
}

export function getPriceCatalog() {
  return {
    crm: {
      starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      multiLocation: process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON,
    },
    blue: {
      starter: process.env.STRIPE_PRICE_BLUE_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_BLUE_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_BLUE_ENTERPRISE_MONTHLY,
      multiLocation: process.env.STRIPE_PRICE_MULTI_LOCATION_ADDON,
    },
    web: {
      starter: process.env.STRIPE_PRICE_WEB_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_WEB_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_WEB_ENTERPRISE_MONTHLY,
    },
    silver: {
      starter: process.env.STRIPE_PRICE_SILVER_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_SILVER_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_SILVER_ENTERPRISE_MONTHLY,
    },
    gold: {
      starter: process.env.STRIPE_PRICE_GOLD_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_GOLD_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_GOLD_ENTERPRISE_MONTHLY,
    },
    seoaeo: {
      starter: process.env.STRIPE_PRICE_SEOAEO_STARTER_MONTHLY,
      pro: process.env.STRIPE_PRICE_SEOAEO_PRO_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_SEOAEO_ENTERPRISE_MONTHLY,
    },
  };
}
