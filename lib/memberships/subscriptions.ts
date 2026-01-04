// =====================================================
// MEMBERSHIP SUBSCRIPTIONS
// Subscribe customers to plans, manage billing, handle benefits
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const subsLogger = logger.child({ context: 'memberships.subscriptions' });

export interface CustomerMembership {
  id: string;
  customerId: string;
  planId: string;
  businessId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  startedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  inspectionsUsed: number;
  emergencyCallsUsed: number;
  stripeSubscriptionId: string | null;
  notes: string | null;
  plan?: {
    id: string;
    name: string;
    price: number;
    billingInterval: string;
    discountPercentage: number;
    freeInspections: number;
    freeEmergencyCalls: number;
    priorityScheduling: boolean;
    benefits: string[];
  };
}

// Subscribe customer to plan
export async function subscribeToPlan(
  customerId: string,
  planId: string,
  paymentMethodId?: string
): Promise<{ success: boolean; membership?: CustomerMembership; error?: string }> {
  try {
    const supabase = await createClient();

    // Get customer and plan
    const [{ data: customer }, { data: plan }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('membership_plans').select('*').eq('id', planId).single(),
    ]);

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Check for existing active membership
    const { data: existingMembership } = await supabase
      .from('customer_memberships')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (existingMembership) {
      return { success: false, error: 'Customer already has an active membership' };
    }

    let stripeSubscriptionId: string | null = null;
    let currentPeriodStart: string | null = null;
    let currentPeriodEnd: string | null = null;

    // Create Stripe subscription if configured
    if (process.env.STRIPE_SECRET_KEY && plan.stripe_price_id) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Get or create Stripe customer
        let stripeCustomerId = customer.stripe_customer_id;

        if (!stripeCustomerId) {
          const stripeCustomer = await stripe.customers.create({
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            metadata: { customerId: customer.id },
          });
          stripeCustomerId = stripeCustomer.id;

          await supabase
            .from('customers')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', customerId);
        }

        // Attach payment method if provided
        if (paymentMethodId) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
          });
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
          });
        }

        // Create Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: plan.stripe_price_id }],
          metadata: { customerId, planId },
        });

        stripeSubscriptionId = subscription.id;
        currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      } catch (stripeError: any) {
        subsLogger.error({
          msg: 'Stripe subscription creation failed',
          customerId,
          planId,
          error: stripeError instanceof Error ? { name: stripeError.name, message: stripeError.message, stack: stripeError.stack } : { message: String(stripeError) },
        });
        return { success: false, error: stripeError.message };
      }
    } else {
      // Manual subscription without Stripe
      const now = new Date();
      currentPeriodStart = now.toISOString();

      // Calculate period end based on billing interval
      const endDate = new Date(now);
      switch (plan.billing_interval) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annual':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      currentPeriodEnd = endDate.toISOString();
    }

    // Create membership record
    const { data: membership, error } = await supabase
      .from('customer_memberships')
      .insert({
        customer_id: customerId,
        plan_id: planId,
        business_id: plan.business_id,
        status: 'active',
        started_at: new Date().toISOString(),
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .select(
        `
        *,
        plan:membership_plans(*)
      `
      )
      .single();

    if (error) throw error;

    return {
      success: true,
      membership: transformMembership(membership),
    };
  } catch (error: any) {
    subsLogger.error({
      msg: 'Error subscribing to plan',
      customerId,
      planId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Cancel membership
export async function cancelMembership(
  membershipId: string,
  cancelImmediately: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: membership } = await supabase
      .from('customer_memberships')
      .select('stripe_subscription_id')
      .eq('id', membershipId)
      .single();

    if (!membership) {
      return { success: false, error: 'Membership not found' };
    }

    // Cancel Stripe subscription if exists
    if (membership.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        if (cancelImmediately) {
          await stripe.subscriptions.cancel(membership.stripe_subscription_id);
        } else {
          await stripe.subscriptions.update(membership.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        }
      } catch (stripeError) {
        subsLogger.error({
          msg: 'Stripe cancellation failed',
          membershipId,
          cancelImmediately,
          error: stripeError instanceof Error ? { name: stripeError.name, message: stripeError.message, stack: (stripeError as any).stack } : { message: String(stripeError) },
        });
      }
    }

    // Update membership record
    if (cancelImmediately) {
      await supabase
        .from('customer_memberships')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', membershipId);
    } else {
      await supabase
        .from('customer_memberships')
        .update({ cancel_at_period_end: true })
        .eq('id', membershipId);
    }

    return { success: true };
  } catch (error: any) {
    subsLogger.error({
      msg: 'Error cancelling membership',
      membershipId,
      cancelImmediately,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Reactivate membership (if cancelled at period end)
export async function reactivateMembership(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: membership } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('id', membershipId)
      .single();

    if (!membership) {
      return { success: false, error: 'Membership not found' };
    }

    if (membership.status !== 'active' || !membership.cancel_at_period_end) {
      return { success: false, error: 'Membership cannot be reactivated' };
    }

    // Reactivate Stripe subscription if exists
    if (membership.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(membership.stripe_subscription_id, {
          cancel_at_period_end: false,
        });
      } catch (stripeError) {
        subsLogger.error({
          msg: 'Stripe reactivation failed',
          membershipId,
          error: stripeError instanceof Error ? { name: stripeError.name, message: stripeError.message, stack: (stripeError as any).stack } : { message: String(stripeError) },
        });
      }
    }

    await supabase
      .from('customer_memberships')
      .update({ cancel_at_period_end: false })
      .eq('id', membershipId);

    return { success: true };
  } catch (error: any) {
    subsLogger.error({
      msg: 'Error reactivating membership',
      membershipId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Get customer's active membership
export async function getCustomerMembership(
  customerId: string
): Promise<CustomerMembership | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customer_memberships')
    .select(
      `
      *,
      plan:membership_plans(*)
    `
    )
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single();

  return data ? transformMembership(data) : null;
}

// Get all memberships for a business
export async function getBusinessMemberships(
  businessId: string,
  status?: string
): Promise<CustomerMembership[]> {
  const supabase = await createClient();

  let query = supabase
    .from('customer_memberships')
    .select(
      `
      *,
      plan:membership_plans(*),
      customer:customers(id, name, email, phone)
    `
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;

  return (data || []).map(transformMembership);
}

// Apply membership discount to invoice
export async function applyMembershipDiscount(
  customerId: string,
  invoiceTotal: number
): Promise<{ discount: number; discountPercentage: number } | null> {
  const membership = await getCustomerMembership(customerId);

  if (!membership || !membership.plan?.discountPercentage) {
    return null;
  }

  const discount = invoiceTotal * (membership.plan.discountPercentage / 100);

  return {
    discount,
    discountPercentage: membership.plan.discountPercentage,
  };
}

// Check and use free benefit
export async function consumeFreeBenefit(
  customerId: string,
  benefitType: 'inspection' | 'emergency'
): Promise<{ canUse: boolean; remaining: number }> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('customer_memberships')
    .select(
      `
      id,
      inspections_used,
      emergency_calls_used,
      plan:membership_plans(free_inspections, free_emergency_calls)
    `
    )
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return { canUse: false, remaining: 0 };
  }

  const plan = membership.plan as any;

  if (benefitType === 'inspection') {
    const remaining = (plan?.free_inspections || 0) - membership.inspections_used;
    if (remaining <= 0) {
      return { canUse: false, remaining: 0 };
    }

    await supabase
      .from('customer_memberships')
      .update({ inspections_used: membership.inspections_used + 1 })
      .eq('id', membership.id);

    return { canUse: true, remaining: remaining - 1 };
  } else {
    const remaining = (plan?.free_emergency_calls || 0) - membership.emergency_calls_used;
    if (remaining <= 0) {
      return { canUse: false, remaining: 0 };
    }

    await supabase
      .from('customer_memberships')
      .update({ emergency_calls_used: membership.emergency_calls_used + 1 })
      .eq('id', membership.id);

    return { canUse: true, remaining: remaining - 1 };
  }
}

// Get memberships expiring soon
export async function getExpiringMemberships(
  businessId: string,
  daysAhead: number = 30
): Promise<CustomerMembership[]> {
  const supabase = await createClient();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data } = await supabase
    .from('customer_memberships')
    .select(
      `
      *,
      plan:membership_plans(*),
      customer:customers(id, name, email, phone)
    `
    )
    .eq('business_id', businessId)
    .eq('status', 'active')
    .eq('cancel_at_period_end', true)
    .lte('current_period_end', futureDate.toISOString())
    .order('current_period_end');

  return (data || []).map(transformMembership);
}

// Reset usage counters (called on period renewal)
export async function resetMembershipUsage(membershipId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('customer_memberships')
    .update({
      inspections_used: 0,
      emergency_calls_used: 0,
    })
    .eq('id', membershipId);
}

// Helper to transform database row to typed object
function transformMembership(row: any): CustomerMembership {
  return {
    id: row.id,
    customerId: row.customer_id,
    planId: row.plan_id,
    businessId: row.business_id,
    status: row.status,
    startedAt: row.started_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    inspectionsUsed: row.inspections_used,
    emergencyCallsUsed: row.emergency_calls_used,
    stripeSubscriptionId: row.stripe_subscription_id,
    notes: row.notes,
    plan: row.plan
      ? {
          id: row.plan.id,
          name: row.plan.name,
          price: parseFloat(row.plan.price),
          billingInterval: row.plan.billing_interval,
          discountPercentage: parseFloat(row.plan.discount_percentage || 0),
          freeInspections: row.plan.free_inspections,
          freeEmergencyCalls: row.plan.free_emergency_calls,
          priorityScheduling: row.plan.priority_scheduling,
          benefits: row.plan.benefits || [],
        }
      : undefined,
  };
}
