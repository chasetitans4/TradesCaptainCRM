// =====================================================
// PER-USER PRICING LIBRARY
// Track and bill based on active users
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { stripe, isStripeConfigured } from '@/lib/stripe/client';

export interface UserPricingInfo {
  businessId: string;
  billableUserCount: number;
  includedUsers: number;
  additionalUsers: number;
  perUserPrice: number;
  monthlyUserCharge: number;
}

// Pricing configuration
export const USER_PRICING = {
  // Number of users included in base subscription
  includedInBase: {
    starter: 1,
    growth: 3,
    pro: 5,
  },
  // Price per additional user per month
  perAdditionalUser: 10, // $10/user/month
};

/**
 * Count active (non-pending, non-deactivated) users for a business
 */
export async function countActiveUsers(businessId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (error) {
    console.error('Error counting active users:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get user pricing info for a business
 */
export async function getUserPricingInfo(businessId: string): Promise<UserPricingInfo | null> {
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from('businesses')
    .select('plan_tier, billable_user_count')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return null;
  }

  const planTier = (business.plan_tier || 'starter') as 'starter' | 'growth' | 'pro';
  const includedUsers = USER_PRICING.includedInBase[planTier];
  const activeUsers = await countActiveUsers(businessId);
  const additionalUsers = Math.max(0, activeUsers - includedUsers);

  return {
    businessId,
    billableUserCount: activeUsers,
    includedUsers,
    additionalUsers,
    perUserPrice: USER_PRICING.perAdditionalUser,
    monthlyUserCharge: additionalUsers * USER_PRICING.perAdditionalUser,
  };
}

/**
 * Update the billable user count in the database
 */
export async function updateBillableUserCount(businessId: string): Promise<number> {
  const supabase = await createClient();

  const count = await countActiveUsers(businessId);

  await supabase
    .from('businesses')
    .update({
      billable_user_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  return count;
}

/**
 * Report usage to Stripe for metered billing
 */
export async function reportUserUsageToStripe(businessId: string): Promise<boolean> {
  if (!isStripeConfigured()) {
    console.log('Stripe not configured, skipping usage report');
    return false;
  }

  const supabase = await createClient();

  // Get business with Stripe info
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id, plan_tier')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_subscription_id) {
    console.log('No Stripe subscription found');
    return false;
  }

  try {
    // Get the subscription to find the metered usage item
    const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);

    // Find the metered usage subscription item (per-user pricing)
    const meteredItem = subscription.items.data.find(
      (item) => item.price.recurring?.usage_type === 'metered'
    );

    if (!meteredItem) {
      console.log('No metered subscription item found');
      return false;
    }

    // Get pricing info
    const pricingInfo = await getUserPricingInfo(businessId);
    if (!pricingInfo) return false;

    // Only report if there are additional users beyond included
    if (pricingInfo.additionalUsers > 0) {
      // Report usage
      await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
        quantity: pricingInfo.additionalUsers,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'set', // Set the total quantity
      });

      console.log(
        `Reported ${pricingInfo.additionalUsers} additional users for business ${businessId}`
      );
    }

    return true;
  } catch (error) {
    console.error('Error reporting usage to Stripe:', error);
    return false;
  }
}

/**
 * Check if business can add more users
 */
export async function canAddUser(businessId: string): Promise<{
  canAdd: boolean;
  reason?: string;
  wouldIncurCharge: boolean;
}> {
  const pricingInfo = await getUserPricingInfo(businessId);

  if (!pricingInfo) {
    return {
      canAdd: false,
      reason: 'Unable to verify billing information',
      wouldIncurCharge: false,
    };
  }

  // Check if they're at their plan limit and would need to pay more
  const wouldIncurCharge = pricingInfo.billableUserCount >= pricingInfo.includedUsers;

  return {
    canAdd: true,
    wouldIncurCharge,
  };
}

/**
 * Get upcoming billing preview including per-user charges
 */
export async function getBillingPreview(businessId: string): Promise<{
  baseCharge: number;
  userCharge: number;
  totalCharge: number;
  userDetails: UserPricingInfo | null;
}> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_subscription_id, plan_tier')
    .eq('id', businessId)
    .single();

  const pricingInfo = await getUserPricingInfo(businessId);

  // Get base subscription cost from plan
  const basePrices: Record<string, number> = {
    starter: 0,
    growth: 49,
    pro: 99,
  };

  const baseCharge = basePrices[(business?.plan_tier || 'starter') as string] || 0;
  const userCharge = pricingInfo?.monthlyUserCharge || 0;

  return {
    baseCharge,
    userCharge,
    totalCharge: baseCharge + userCharge,
    userDetails: pricingInfo,
  };
}

/**
 * Handle user status changes to update billing
 */
export async function handleUserStatusChange(
  businessId: string,
  userId: string,
  newStatus: 'active' | 'pending' | 'deactivated'
): Promise<void> {
  // Update user count
  await updateBillableUserCount(businessId);

  // Report to Stripe if status changed to active or deactivated
  if (newStatus === 'active' || newStatus === 'deactivated') {
    await reportUserUsageToStripe(businessId);
  }
}
