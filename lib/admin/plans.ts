// =====================================================
// PLAN FEATURES & PRICING LIBRARY
// Version: 5.8.1 - Plan Details Panel for Sales Agents
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

// =====================================================
// TYPES
// =====================================================

export interface PlanFeature {
  id: string;
  plan_type: string;
  feature_name: string;
  feature_description: string | null;
  feature_category: string;
  is_included: boolean;
  display_value: string | null;
  display_order: number;
}

export interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  track: string;
  tier: string;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  best_for: string | null;
  is_active: boolean;
  display_order: number;
}

export interface PlanUpgradePath {
  id: string;
  from_plan_type: string;
  to_plan_type: string;
  price_difference_cents: number;
  is_recommended: boolean;
  benefits_summary: string | null;
  talking_point: string | null;
  display_order: number;
}

export interface PlanDetails {
  plan: PlanPricing;
  features: {
    included: PlanFeature[];
    not_included: PlanFeature[];
  };
  sms: {
    included: number;
    has_nevermiss: boolean;
    has_calendar_booking: boolean;
  };
  upgradePaths: PlanUpgradePath[];
}

export interface PlanComparison {
  plans: PlanPricing[];
  features: Array<{
    name: string;
    description: string | null;
    category: string;
    values: Record<string, string>;
  }>;
  price_difference: number;
  talking_point: string | null;
}

export interface ClientUpgradeOptions {
  current_plan: PlanPricing;
  current_usage?: {
    sms_used: number;
    sms_limit: number;
    percentage: number;
  };
  upgrade_options: Array<{
    plan: PlanPricing;
    path: PlanUpgradePath;
    commission_upfront: number;
    commission_recurring: number;
  }>;
  suggested_upgrade?: string;
  suggestion_reason?: string;
}

// =====================================================
// PLAN PRICING FUNCTIONS
// =====================================================

/**
 * Get all active plan pricing
 */
export async function getAllPlanPricing(): Promise<PlanPricing[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('plan_pricing')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw new Error(`Failed to get plan pricing: ${error.message}`);
  return data || [];
}

/**
 * Get plan pricing by type
 */
export async function getPlanPricing(planType: string): Promise<PlanPricing | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('plan_pricing')
    .select('*')
    .eq('plan_type', planType)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get plan pricing: ${error.message}`);
  }
  return data;
}

/**
 * Get plans by track (blue, web, seo_aeo)
 * v6.0 - Discontinued tracks: leads_captain (now a feature), silver, gold, local_seo
 */
export async function getPlansByTrack(track: string): Promise<PlanPricing[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('plan_pricing')
    .select('*')
    .eq('track', track)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw new Error(`Failed to get plans by track: ${error.message}`);
  return data || [];
}

// =====================================================
// PLAN FEATURES FUNCTIONS
// =====================================================

/**
 * Get all features for a plan
 */
export async function getPlanFeatures(planType: string): Promise<PlanFeature[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('plan_features')
    .select('*')
    .eq('plan_type', planType)
    .order('display_order', { ascending: true });

  if (error) throw new Error(`Failed to get plan features: ${error.message}`);
  return data || [];
}

/**
 * Get complete plan details including features and upgrade paths
 */
export async function getPlanDetails(planType: string): Promise<PlanDetails | null> {
  const supabase = createAdminClient();

  // Get plan pricing
  const plan = await getPlanPricing(planType);
  if (!plan) return null;

  // Get features
  const features = await getPlanFeatures(planType);
  const included = features.filter(f => f.is_included);
  const notIncluded = features.filter(f => !f.is_included);

  // Get upgrade paths
  const { data: upgradePaths } = await supabase
    .from('plan_upgrade_paths')
    .select('*')
    .eq('from_plan_type', planType)
    .order('display_order', { ascending: true });

  // Calculate SMS details
  const smsFeature = features.find(f => f.feature_name.includes('Leads Captain AI SMS'));
  const calendarBookingFeature = features.find(f => f.feature_name.includes('Calendar Booking via SMS'));

  let smsIncluded = 0;
  if (smsFeature?.is_included && smsFeature.display_value) {
    const match = smsFeature.display_value.match(/(\d+(?:,\d+)?)/);
    if (match) {
      smsIncluded = parseInt(match[1].replace(',', ''));
    }
  }

  return {
    plan,
    features: {
      included,
      not_included: notIncluded,
    },
    sms: {
      included: smsIncluded,
      has_nevermiss: smsFeature?.is_included ?? false,
      has_calendar_booking: calendarBookingFeature?.is_included ?? false,
    },
    upgradePaths: upgradePaths || [],
  };
}

// =====================================================
// PLAN COMPARISON FUNCTIONS
// =====================================================

/**
 * Compare two or more plans side by side
 */
export async function comparePlans(planTypes: string[]): Promise<PlanComparison> {
  const supabase = createAdminClient();

  // Get all plans
  const plans: PlanPricing[] = [];
  for (const planType of planTypes) {
    const plan = await getPlanPricing(planType);
    if (plan) plans.push(plan);
  }

  if (plans.length < 2) {
    throw new Error('Need at least 2 valid plans to compare');
  }

  // Get all features for all plans
  const allFeatures: Map<string, {
    name: string;
    description: string | null;
    category: string;
    values: Record<string, string>;
  }> = new Map();

  for (const planType of planTypes) {
    const features = await getPlanFeatures(planType);
    for (const feature of features) {
      if (!allFeatures.has(feature.feature_name)) {
        allFeatures.set(feature.feature_name, {
          name: feature.feature_name,
          description: feature.feature_description,
          category: feature.feature_category,
          values: {},
        });
      }
      const f = allFeatures.get(feature.feature_name)!;
      f.values[planType] = feature.is_included
        ? (feature.display_value || '✓')
        : '✗';
    }
  }

  // Calculate price difference (between first and last plan)
  const priceDiff = plans[plans.length - 1].monthly_price_cents - plans[0].monthly_price_cents;

  // Get talking point from upgrade path if exists
  const { data: upgradePath } = await supabase
    .from('plan_upgrade_paths')
    .select('talking_point')
    .eq('from_plan_type', planTypes[0])
    .eq('to_plan_type', planTypes[planTypes.length - 1])
    .single();

  return {
    plans,
    features: Array.from(allFeatures.values()),
    price_difference: priceDiff,
    talking_point: upgradePath?.talking_point || null,
  };
}

// =====================================================
// CLIENT UPGRADE FUNCTIONS
// =====================================================

/**
 * Get upgrade options for a client based on their current plan
 */
export async function getClientUpgradeOptions(
  clientId: string,
  currentPlanType: string
): Promise<ClientUpgradeOptions | null> {
  const supabase = createAdminClient();

  // Get current plan
  const currentPlan = await getPlanPricing(currentPlanType);
  if (!currentPlan) return null;

  // Get upgrade paths
  const { data: paths } = await supabase
    .from('plan_upgrade_paths')
    .select('*')
    .eq('from_plan_type', currentPlanType)
    .order('display_order', { ascending: true });

  if (!paths || paths.length === 0) {
    return {
      current_plan: currentPlan,
      upgrade_options: [],
    };
  }

  // Get plan details for each upgrade option
  const upgradeOptions = [];
  for (const path of paths) {
    const plan = await getPlanPricing(path.to_plan_type);
    if (plan) {
      // Calculate commission (simplified - 50% upfront, 10% recurring)
      const priceDiff = path.price_difference_cents / 100;
      upgradeOptions.push({
        plan,
        path,
        commission_upfront: priceDiff * 0.5,
        commission_recurring: priceDiff * 0.1,
      });
    }
  }

  // Get SMS usage if applicable
  let currentUsage: ClientUpgradeOptions['current_usage'];
  const supabaseForAccounts = createAdminClient();
  const { data: business } = await supabaseForAccounts
    .from('crm_accounts')
    .select('business_id')
    .eq('id', clientId)
    .single();

  if (business?.business_id) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const supabaseForUsage = createAdminClient();
    const { data: usage } = await supabaseForUsage
      .from('sms_usage')
      .select('sms_sent, sms_received, sms_limit')
      .eq('business_id', business.business_id)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    if (usage) {
      const totalUsed = (usage.sms_sent || 0) + (usage.sms_received || 0);
      currentUsage = {
        sms_used: totalUsed,
        sms_limit: usage.sms_limit,
        percentage: Math.round((totalUsed / usage.sms_limit) * 100),
      };
    }
  }

  // Find suggested upgrade
  let suggestedUpgrade: string | undefined;
  let suggestionReason: string | undefined;

  const recommendedPath = paths.find(p => p.is_recommended);
  if (recommendedPath) {
    suggestedUpgrade = recommendedPath.to_plan_type;
    suggestionReason = recommendedPath.benefits_summary || 'Recommended upgrade for your business';
  }

  return {
    current_plan: currentPlan,
    current_usage: currentUsage,
    upgrade_options: upgradeOptions,
    suggested_upgrade: suggestedUpgrade,
    suggestion_reason: suggestionReason,
  };
}

// =====================================================
// TRACK SUMMARY FUNCTIONS
// =====================================================

/**
 * Get summary of all plan tracks for plan selection UI
 * v6.0 - Only active tracks (Leads Captain is now a feature within Blue Pro/Enterprise, not a standalone plan)
 */
export async function getPlanTracksSummary(): Promise<Array<{
  track: string;
  name: string;
  price_range: string;
  description: string;
  plans: PlanPricing[];
}>> {
  const tracks = [
    { track: 'blue', name: 'Blue (CRM)', description: 'Full CRM & Calendar with Leads Captain AI' },
    { track: 'web', name: 'Web', description: 'Professional website' },
    { track: 'seo_aeo', name: 'SEO/AEO', description: 'Search & AI engine optimization' },
  ];

  const result = [];
  for (const t of tracks) {
    const plans = await getPlansByTrack(t.track);
    if (plans.length > 0) {
      const minPrice = Math.min(...plans.map(p => p.monthly_price_cents));
      const maxPrice = Math.max(...plans.map(p => p.monthly_price_cents));
      const priceRange = minPrice === maxPrice
        ? `$${minPrice / 100}/mo`
        : `$${minPrice / 100}-$${maxPrice / 100}`;

      result.push({
        track: t.track,
        name: t.name,
        price_range: priceRange,
        description: t.description,
        plans,
      });
    }
  }

  return result;
}
