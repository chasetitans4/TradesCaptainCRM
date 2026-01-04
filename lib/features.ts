// =====================================================
// FEATURE GATING & PLAN TIERS
// =====================================================

import type { PlanTier } from '@/types';

// Features available at each tier (v5.9.2 - renamed growth→pro, pro→enterprise)
export const TIER_FEATURES = {
  starter: [
    'website',
    'gbp',
    'call_tracking',
    'basic_chat'
  ],
  pro: [
    'lead_forms',
    'ai_sms',
    'lead_notifications',
    'scheduling',
    'smart_chat'
  ],
  enterprise: [
    'crm',
    'jobs',
    'quotes',
    'invoices',
    'calendar',
    'customers',
    'automations',
    'pipeline',
    'photos',
    'reports',
    'team',
    'email_notifications',
    'knowledge_base',
    'priority_support'
  ]
} as const;

// Plan configuration (v5.9.2 - renamed growth→pro, pro→enterprise)
export const PLAN_CONFIG = {
  starter: {
    name: 'Starter',
    price: 49,
    leadsLimit: null,
    usersIncluded: 1,
    description: 'Perfect for getting started'
  },
  pro: {
    name: 'Pro',
    price: 99,
    leadsLimit: 200,
    usersIncluded: 3,
    description: 'AI-powered lead response'
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    leadsLimit: 300,
    usersIncluded: 10,
    description: 'Complete business management'
  }
} as const;

// Multi-location add-on
export const MULTI_LOCATION_CONFIG = {
  price: 249,
  additionalLeads: 200,
  availableTiers: ['pro', 'enterprise'] as PlanTier[]
};

// Lead usage thresholds
export const LEAD_USAGE = {
  warningThreshold: 0.9, // 90%
  alertThreshold: 1.0    // 100%
};

/**
 * Check if a user's tier has access to a specific feature
 * Features accumulate - Enterprise gets everything Pro has, etc.
 */
export function hasFeature(userTier: PlanTier, feature: string): boolean {
  const tierHierarchy: PlanTier[] = ['starter', 'pro', 'enterprise'];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  
  for (let i = 0; i <= userTierIndex; i++) {
    const tier = tierHierarchy[i];
    if ((TIER_FEATURES[tier] as readonly string[]).includes(feature)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user can access the CRM (Enterprise tier only)
 */
export function canAccessCRM(userTier: PlanTier): boolean {
  return userTier === 'enterprise';
}

/**
 * Check if user can access AI SMS (Pro+ tiers)
 */
export function canAccessAISMS(userTier: PlanTier): boolean {
  return userTier === 'pro' || userTier === 'enterprise';
}

/**
 * Check if user can add team members (Enterprise tier only)
 */
export function canAddTeamMembers(userTier: PlanTier): boolean {
  return userTier === 'enterprise';
}

/**
 * Check if user can add multiple locations
 */
export function canAddLocations(userTier: PlanTier): boolean {
  return MULTI_LOCATION_CONFIG.availableTiers.includes(userTier);
}

/**
 * Get the leads limit for a tier
 */
export function getLeadsLimit(tier: PlanTier): number | null {
  return PLAN_CONFIG[tier].leadsLimit;
}

/**
 * Calculate lead usage percentage
 */
export function calculateLeadUsage(used: number, limit: number | null): number {
  if (!limit) return 0;
  return Math.min((used / limit) * 100, 100);
}

/**
 * Check if approaching lead limit (90%)
 */
export function isApproachingLeadLimit(used: number, limit: number | null): boolean {
  if (!limit) return false;
  return used >= limit * LEAD_USAGE.warningThreshold;
}

/**
 * Check if at lead limit
 */
export function isAtLeadLimit(used: number, limit: number | null): boolean {
  if (!limit) return false;
  return used >= limit;
}

/**
 * Get all features available to a tier (accumulated)
 */
export function getAllFeatures(userTier: PlanTier): string[] {
  const tierHierarchy: PlanTier[] = ['starter', 'pro', 'enterprise'];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  
  const features: string[] = [];
  for (let i = 0; i <= userTierIndex; i++) {
    features.push(...TIER_FEATURES[tierHierarchy[i]]);
  }
  return features;
}

/**
 * Get upgrade path message
 */
export function getUpgradeMessage(currentTier: PlanTier, requiredFeature: string): string {
  if (currentTier === 'enterprise') {
    return 'You have access to all features.';
  }

  // Find which tier has this feature
  const tierHierarchy: PlanTier[] = ['starter', 'pro', 'enterprise'];
  for (const tier of tierHierarchy) {
    if ((TIER_FEATURES[tier] as readonly string[]).includes(requiredFeature)) {
      const tierConfig = PLAN_CONFIG[tier];
      return `Upgrade to ${tierConfig.name} ($${tierConfig.price}/mo) to access this feature.`;
    }
  }

  return 'Upgrade your plan to access this feature.';
}

// =====================================================
// BUSINESS FEATURE SETTINGS
// Per-business feature toggles stored in database
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface FeatureSettings {
  timesheets_enabled: boolean;
  expense_tracking_enabled: boolean;
  reviews_enabled: boolean;
  auto_review_requests: boolean;
  routes_enabled: boolean;
  route_optimization_enabled: boolean;
  memberships_enabled: boolean;
  receipts_enabled: boolean;
  costing_enabled: boolean;
}

const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  timesheets_enabled: true,
  expense_tracking_enabled: true,
  reviews_enabled: true,
  auto_review_requests: true,
  routes_enabled: true,
  route_optimization_enabled: true,
  memberships_enabled: true,
  receipts_enabled: true,
  costing_enabled: true,
};

/**
 * Check if a specific feature is enabled for a business
 */
export async function isFeatureEnabled(businessId: string, feature: keyof FeatureSettings): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('businesses')
      .select('feature_settings')
      .eq('id', businessId)
      .single();

    if (!data?.feature_settings) {
      return DEFAULT_FEATURE_SETTINGS[feature];
    }

    const settings = data.feature_settings as FeatureSettings;
    return settings[feature] ?? DEFAULT_FEATURE_SETTINGS[feature];
  } catch (error) {
    const { logger } = await import('@/lib/logger');
    const featureLogger = logger.child({ context: 'features' });
    featureLogger.error({
      msg: 'Error checking feature enabled',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return DEFAULT_FEATURE_SETTINGS[feature];
  }
}

/**
 * Get all feature settings for a business
 */
export async function getFeatureSettings(businessId: string): Promise<FeatureSettings> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('businesses')
      .select('feature_settings')
      .eq('id', businessId)
      .single();

    if (!data?.feature_settings) {
      return DEFAULT_FEATURE_SETTINGS;
    }

    return {
      ...DEFAULT_FEATURE_SETTINGS,
      ...(data.feature_settings as Partial<FeatureSettings>),
    };
  } catch (error) {
    const { logger } = await import('@/lib/logger');
    const featureLogger = logger.child({ context: 'features' });
    featureLogger.error({
      msg: 'Error getting feature settings',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return DEFAULT_FEATURE_SETTINGS;
  }
}

/**
 * Update feature settings for a business
 */
export async function updateFeatureSettings(
  businessId: string,
  settings: Partial<FeatureSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current settings
    const { data: current } = await supabase
      .from('businesses')
      .select('feature_settings')
      .eq('id', businessId)
      .single();

    const currentSettings = (current?.feature_settings as FeatureSettings) || DEFAULT_FEATURE_SETTINGS;
    const updatedSettings = { ...currentSettings, ...settings };

    const { error } = await supabase
      .from('businesses')
      .update({ feature_settings: updatedSettings })
      .eq('id', businessId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    const featureLogger = logger.child({ context: 'features' });
    featureLogger.error({
      msg: 'Error updating feature settings',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}
