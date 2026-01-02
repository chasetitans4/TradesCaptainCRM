// =====================================================
// NeverMiss v2.0 Feature Gating
// Plan-based feature limits and access control
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import {
  PlanTier,
  NevermissFeatureLimits,
  PLAN_FEATURE_LIMITS,
} from '@/types/nevermiss';

// Feature keys for checking access
export type NevermissFeature =
  | 'ai_responses'
  | 'approval_queue'
  | 'analytics'
  | 'crm_integration'
  | 'custom_intents'
  | 'multi_language';

// Limit keys for checking counts
export type NevermissLimit =
  | 'rules'
  | 'templates'
  | 'notification_recipients'
  | 'price_list_items'
  | 'ai_messages_per_conversation';

/**
 * Get the plan tier for a business
 */
export async function getBusinessPlanTier(businessId: string): Promise<PlanTier> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('businesses')
    .select('subscription_tier')
    .eq('id', businessId)
    .single();

  // Map subscription tiers to NeverMiss plan tiers
  // Adjust this mapping based on your actual subscription tiers
  if (!data?.subscription_tier) {
    return 'standalone';
  }

  const tier = data.subscription_tier.toLowerCase();

  if (tier.includes('gold') || tier.includes('premium') || tier.includes('enterprise')) {
    return 'gold';
  }

  if (tier.includes('silver') || tier.includes('pro') || tier.includes('professional')) {
    return 'silver';
  }

  return 'standalone';
}

/**
 * Get feature limits for a business
 */
export async function getFeatureLimits(businessId: string): Promise<NevermissFeatureLimits> {
  const planTier = await getBusinessPlanTier(businessId);
  return PLAN_FEATURE_LIMITS[planTier];
}

/**
 * Check if a business can access a specific feature
 */
export async function canAccessFeature(
  businessId: string,
  feature: NevermissFeature
): Promise<boolean> {
  const limits = await getFeatureLimits(businessId);

  switch (feature) {
    case 'ai_responses':
      return limits.ai_enabled;
    case 'approval_queue':
      return limits.approval_queue_enabled;
    case 'analytics':
      return limits.analytics_enabled;
    case 'crm_integration':
      return limits.crm_integration_enabled;
    case 'custom_intents':
      return limits.custom_intents_enabled;
    case 'multi_language':
      return limits.multi_language_enabled;
    default:
      return false;
  }
}

/**
 * Check if a business is within a limit
 */
export async function checkPlanLimit(
  businessId: string,
  limitType: NevermissLimit,
  currentCount?: number
): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  remaining: number;
}> {
  const limits = await getFeatureLimits(businessId);
  const supabase = createAdminClient();

  // Get current count if not provided
  let count = currentCount;
  if (count === undefined) {
    count = await getCurrentCount(businessId, limitType, supabase);
  }

  // Get the max for this limit type
  let max: number;
  switch (limitType) {
    case 'rules':
      max = limits.max_rules;
      break;
    case 'templates':
      max = limits.max_templates;
      break;
    case 'notification_recipients':
      max = limits.max_notification_recipients;
      break;
    case 'price_list_items':
      max = limits.max_price_list_items;
      break;
    case 'ai_messages_per_conversation':
      max = limits.ai_max_messages_per_conversation;
      break;
    default:
      max = 0;
  }

  const remaining = Math.max(0, max - count);

  return {
    allowed: count < max,
    current: count,
    max,
    remaining,
  };
}

/**
 * Get current count for a limit type
 */
async function getCurrentCount(
  businessId: string,
  limitType: NevermissLimit,
  supabase: ReturnType<typeof createAdminClient>
): Promise<number> {
  // First get the config_id for this business
  const { data: config } = await supabase
    .from('nevermiss_config')
    .select('id')
    .eq('business_id', businessId)
    .single();

  if (!config) return 0;

  const configId = config.id;

  switch (limitType) {
    case 'rules': {
      const { count } = await supabase
        .from('nevermiss_rules')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', configId)
        .eq('is_system', false); // Don't count system rules against limit
      return count || 0;
    }

    case 'templates': {
      const { count } = await supabase
        .from('nevermiss_templates')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', configId)
        .eq('is_system', false); // Don't count system templates against limit
      return count || 0;
    }

    case 'notification_recipients': {
      const { count } = await supabase
        .from('nevermiss_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', configId);
      return count || 0;
    }

    case 'price_list_items': {
      const { count } = await supabase
        .from('nevermiss_price_list')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', configId);
      return count || 0;
    }

    case 'ai_messages_per_conversation':
      // This is checked per conversation, not globally
      return 0;

    default:
      return 0;
  }
}

/**
 * Get all limits and current usage for a business
 */
export async function getAllLimitsStatus(businessId: string): Promise<{
  plan: PlanTier;
  limits: NevermissFeatureLimits;
  usage: {
    rules: { current: number; max: number; remaining: number };
    templates: { current: number; max: number; remaining: number };
    notification_recipients: { current: number; max: number; remaining: number };
    price_list_items: { current: number; max: number; remaining: number };
  };
  features: {
    ai_responses: boolean;
    approval_queue: boolean;
    analytics: boolean;
    crm_integration: boolean;
    custom_intents: boolean;
    multi_language: boolean;
  };
}> {
  const plan = await getBusinessPlanTier(businessId);
  const limits = PLAN_FEATURE_LIMITS[plan];

  const [rules, templates, notification_recipients, price_list_items] = await Promise.all([
    checkPlanLimit(businessId, 'rules'),
    checkPlanLimit(businessId, 'templates'),
    checkPlanLimit(businessId, 'notification_recipients'),
    checkPlanLimit(businessId, 'price_list_items'),
  ]);

  return {
    plan,
    limits,
    usage: {
      rules: { current: rules.current, max: rules.max, remaining: rules.remaining },
      templates: { current: templates.current, max: templates.max, remaining: templates.remaining },
      notification_recipients: {
        current: notification_recipients.current,
        max: notification_recipients.max,
        remaining: notification_recipients.remaining,
      },
      price_list_items: {
        current: price_list_items.current,
        max: price_list_items.max,
        remaining: price_list_items.remaining,
      },
    },
    features: {
      ai_responses: limits.ai_enabled,
      approval_queue: limits.approval_queue_enabled,
      analytics: limits.analytics_enabled,
      crm_integration: limits.crm_integration_enabled,
      custom_intents: limits.custom_intents_enabled,
      multi_language: limits.multi_language_enabled,
    },
  };
}

/**
 * Check if upgrading would unlock a specific feature
 */
export function getFeatureUnlockPlan(feature: NevermissFeature): PlanTier | null {
  // Find the lowest tier that has this feature
  for (const tier of ['standalone', 'silver', 'gold'] as PlanTier[]) {
    const limits = PLAN_FEATURE_LIMITS[tier];

    switch (feature) {
      case 'ai_responses':
        if (limits.ai_enabled) return tier;
        break;
      case 'approval_queue':
        if (limits.approval_queue_enabled) return tier;
        break;
      case 'analytics':
        if (limits.analytics_enabled) return tier;
        break;
      case 'crm_integration':
        if (limits.crm_integration_enabled) return tier;
        break;
      case 'custom_intents':
        if (limits.custom_intents_enabled) return tier;
        break;
      case 'multi_language':
        if (limits.multi_language_enabled) return tier;
        break;
    }
  }

  return null;
}

/**
 * Get upgrade suggestion message
 */
export function getUpgradeMessage(
  currentPlan: PlanTier,
  limitType: NevermissLimit | NevermissFeature
): string {
  const featureNames: Record<string, string> = {
    rules: 'automation rules',
    templates: 'response templates',
    notification_recipients: 'notification recipients',
    price_list_items: 'price list items',
    ai_messages_per_conversation: 'AI messages per conversation',
    ai_responses: 'AI-powered responses',
    approval_queue: 'the approval queue',
    analytics: 'analytics and reporting',
    crm_integration: 'CRM integration',
    custom_intents: 'custom intents',
    multi_language: 'multi-language support',
  };

  const featureName = featureNames[limitType] || limitType;

  switch (currentPlan) {
    case 'standalone':
      return `Upgrade to Silver or Gold to unlock more ${featureName}.`;
    case 'silver':
      return `Upgrade to Gold to unlock more ${featureName}.`;
    case 'gold':
      return `You're on our highest tier! Contact support if you need higher limits for ${featureName}.`;
    default:
      return `Contact support to unlock more ${featureName}.`;
  }
}
