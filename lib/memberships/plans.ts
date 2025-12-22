// =====================================================
// MEMBERSHIP PLANS MANAGEMENT
// Create, update, and manage membership plan definitions
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface MembershipPlan {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  benefits: string[];
  discountPercentage: number;
  priorityScheduling: boolean;
  freeInspections: number;
  freeEmergencyCalls: number;
  isActive: boolean;
  displayOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  price: number;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  benefits?: string[];
  discountPercentage?: number;
  priorityScheduling?: boolean;
  freeInspections?: number;
  freeEmergencyCalls?: number;
  displayOrder?: number;
}

// Create membership plan
export async function createMembershipPlan(
  businessId: string,
  data: CreatePlanInput
): Promise<{ success: boolean; plan?: MembershipPlan; error?: string }> {
  try {
    const supabase = await createClient();

    // Create Stripe product and price if Stripe is configured
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const product = await stripe.products.create({
          name: data.name,
          description: data.description || undefined,
          metadata: { businessId },
        });

        const intervalMap = {
          monthly: { interval: 'month' as const, interval_count: 1 },
          quarterly: { interval: 'month' as const, interval_count: 3 },
          annual: { interval: 'year' as const, interval_count: 1 },
        };

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(data.price * 100),
          currency: 'usd',
          recurring: intervalMap[data.billingInterval],
        });

        stripeProductId = product.id;
        stripePriceId = price.id;
      } catch (stripeError) {
        console.error('Stripe product creation failed:', stripeError);
        // Continue without Stripe integration
      }
    }

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .insert({
        business_id: businessId,
        name: data.name,
        description: data.description,
        price: data.price,
        billing_interval: data.billingInterval,
        benefits: data.benefits || [],
        discount_percentage: data.discountPercentage || 0,
        priority_scheduling: data.priorityScheduling || false,
        free_inspections: data.freeInspections || 0,
        free_emergency_calls: data.freeEmergencyCalls || 0,
        display_order: data.displayOrder || 0,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      plan: transformPlan(plan),
    };
  } catch (error: any) {
    console.error('Error creating membership plan:', error);
    return { success: false, error: error.message };
  }
}

// Get all plans for a business
export async function getMembershipPlans(
  businessId: string,
  includeInactive: boolean = false
): Promise<MembershipPlan[]> {
  const supabase = await createClient();

  let query = supabase
    .from('membership_plans')
    .select('*')
    .eq('business_id', businessId)
    .order('display_order');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data } = await query;

  return (data || []).map(transformPlan);
}

// Get single plan
export async function getMembershipPlan(planId: string): Promise<MembershipPlan | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', planId)
    .single();

  return data ? transformPlan(data) : null;
}

// Update membership plan
export async function updateMembershipPlan(
  planId: string,
  data: Partial<CreatePlanInput> & { isActive?: boolean }
): Promise<{ success: boolean; plan?: MembershipPlan; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.billingInterval !== undefined) updateData.billing_interval = data.billingInterval;
    if (data.benefits !== undefined) updateData.benefits = data.benefits;
    if (data.discountPercentage !== undefined)
      updateData.discount_percentage = data.discountPercentage;
    if (data.priorityScheduling !== undefined)
      updateData.priority_scheduling = data.priorityScheduling;
    if (data.freeInspections !== undefined) updateData.free_inspections = data.freeInspections;
    if (data.freeEmergencyCalls !== undefined)
      updateData.free_emergency_calls = data.freeEmergencyCalls;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    // Update Stripe price if price changed
    if (data.price !== undefined && plan.stripe_product_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const intervalMap = {
          monthly: { interval: 'month' as const, interval_count: 1 },
          quarterly: { interval: 'month' as const, interval_count: 3 },
          annual: { interval: 'year' as const, interval_count: 1 },
        };

        // Create new price (Stripe prices are immutable)
        const newPrice = await stripe.prices.create({
          product: plan.stripe_product_id,
          unit_amount: Math.round(data.price * 100),
          currency: 'usd',
          recurring: intervalMap[plan.billing_interval as keyof typeof intervalMap],
        });

        // Archive old price
        if (plan.stripe_price_id) {
          await stripe.prices.update(plan.stripe_price_id, { active: false });
        }

        // Update plan with new price ID
        await supabase
          .from('membership_plans')
          .update({ stripe_price_id: newPrice.id })
          .eq('id', planId);

        plan.stripe_price_id = newPrice.id;
      } catch (stripeError) {
        console.error('Stripe price update failed:', stripeError);
      }
    }

    return {
      success: true,
      plan: transformPlan(plan),
    };
  } catch (error: any) {
    console.error('Error updating membership plan:', error);
    return { success: false, error: error.message };
  }
}

// Delete membership plan (soft delete by deactivating)
export async function deleteMembershipPlan(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Check for active subscriptions
    const { count } = await supabase
      .from('customer_memberships')
      .select('id', { count: 'exact' })
      .eq('plan_id', planId)
      .eq('status', 'active');

    if ((count || 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete plan with active subscriptions',
      };
    }

    const { error } = await supabase
      .from('membership_plans')
      .update({ is_active: false })
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting membership plan:', error);
    return { success: false, error: error.message };
  }
}

// Get plan statistics
export async function getPlanStatistics(businessId: string) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from('customer_memberships')
    .select(
      `
      plan_id,
      status,
      plan:membership_plans(price, billing_interval)
    `
    )
    .eq('business_id', businessId);

  const stats = {
    totalActive: 0,
    totalRevenue: 0,
    byPlan: {} as Record<
      string,
      { active: number; cancelled: number; pastDue: number; mrr: number }
    >,
  };

  memberships?.forEach((m: any) => {
    if (!stats.byPlan[m.plan_id]) {
      stats.byPlan[m.plan_id] = { active: 0, cancelled: 0, pastDue: 0, mrr: 0 };
    }

    if (m.status === 'active') {
      stats.totalActive++;
      stats.byPlan[m.plan_id].active++;

      // Calculate MRR
      if (m.plan) {
        const monthlyPrice =
          m.plan.billing_interval === 'monthly'
            ? m.plan.price
            : m.plan.billing_interval === 'quarterly'
              ? m.plan.price / 3
              : m.plan.price / 12;
        stats.byPlan[m.plan_id].mrr += monthlyPrice;
        stats.totalRevenue += monthlyPrice;
      }
    } else if (m.status === 'cancelled') {
      stats.byPlan[m.plan_id].cancelled++;
    } else if (m.status === 'past_due') {
      stats.byPlan[m.plan_id].pastDue++;
    }
  });

  return stats;
}

// Helper to transform database row to typed object
function transformPlan(row: any): MembershipPlan {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    billingInterval: row.billing_interval,
    benefits: row.benefits || [],
    discountPercentage: parseFloat(row.discount_percentage || 0),
    priorityScheduling: row.priority_scheduling,
    freeInspections: row.free_inspections,
    freeEmergencyCalls: row.free_emergency_calls,
    isActive: row.is_active,
    displayOrder: row.display_order,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
