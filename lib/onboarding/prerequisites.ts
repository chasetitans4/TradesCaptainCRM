// =====================================================
// PREREQUISITE DETECTION SYSTEM
// Checks if required integrations and settings are configured
// before allowing access to certain features
// Version: 1.0
// =====================================================

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
const onboardingLogger = logger.child({ context: 'onboarding.prerequisites' });

// Available prerequisite checks
export type PrerequisiteId =
  | 'twilio'
  | 'stripe'
  | 'team'
  | 'business-profile'
  | 'services'
  | 'email-templates';

// Feature requirements mapping
export type FeatureId =
  | 'messaging'
  | 'leads-captain'
  | 'invoicing'
  | 'payments'
  | 'dispatch'
  | 'quotes'
  | 'outreach'
  | 'automation';

// Prerequisite status
export interface PrerequisiteStatus {
  id: PrerequisiteId;
  name: string;
  description: string;
  configured: boolean;
  configUrl: string;
  priority: 'required' | 'recommended' | 'optional';
}

// Feature with prerequisites
export interface FeaturePrerequisites {
  featureId: FeatureId;
  name: string;
  description: string;
  prerequisites: PrerequisiteId[];
  allRequired: boolean; // If true, all prerequisites must be met
}

// Prerequisite definitions
const PREREQUISITES: Record<PrerequisiteId, Omit<PrerequisiteStatus, 'configured'>> = {
  twilio: {
    id: 'twilio',
    name: 'Twilio SMS',
    description: 'Send and receive text messages with customers',
    configUrl: '/settings/integrations/twilio',
    priority: 'required',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Accept payments from customers online',
    configUrl: '/settings/integrations/stripe',
    priority: 'required',
  },
  team: {
    id: 'team',
    name: 'Team Members',
    description: 'Add technicians and staff to your team',
    configUrl: '/settings/team',
    priority: 'recommended',
  },
  'business-profile': {
    id: 'business-profile',
    name: 'Business Profile',
    description: 'Complete your business information for professional quotes',
    configUrl: '/settings/business',
    priority: 'required',
  },
  services: {
    id: 'services',
    name: 'Services & Pricing',
    description: 'Define your services and pricing for quotes',
    configUrl: '/settings/services',
    priority: 'recommended',
  },
  'email-templates': {
    id: 'email-templates',
    name: 'Email Templates',
    description: 'Set up email templates for automated communications',
    configUrl: '/settings/templates/email',
    priority: 'optional',
  },
};

// Feature to prerequisites mapping
const FEATURE_PREREQUISITES: Record<FeatureId, Omit<FeaturePrerequisites, 'featureId'>> = {
  messaging: {
    name: 'SMS Messaging',
    description: 'Send text messages to customers',
    prerequisites: ['twilio'],
    allRequired: true,
  },
  'leads-captain': {
    name: 'Leads Captain AI',
    description: 'Automated lead follow-up and qualification',
    prerequisites: ['twilio', 'business-profile'],
    allRequired: true,
  },
  invoicing: {
    name: 'Invoicing',
    description: 'Create and send invoices to customers',
    prerequisites: ['business-profile', 'services'],
    allRequired: false, // Can work with just business profile
  },
  payments: {
    name: 'Online Payments',
    description: 'Accept credit card payments',
    prerequisites: ['stripe'],
    allRequired: true,
  },
  dispatch: {
    name: 'Dispatch & Scheduling',
    description: 'Assign and schedule technicians',
    prerequisites: ['team'],
    allRequired: true,
  },
  quotes: {
    name: 'Quote Generation',
    description: 'Create professional quotes',
    prerequisites: ['business-profile', 'services'],
    allRequired: false,
  },
  outreach: {
    name: 'Outreach Campaigns',
    description: 'Run outbound calling campaigns',
    prerequisites: ['twilio', 'business-profile'],
    allRequired: true,
  },
  automation: {
    name: 'Email Automation',
    description: 'Automated email sequences',
    prerequisites: ['email-templates'],
    allRequired: true,
  },
};

// Check individual prerequisite status
async function checkPrerequisite(id: PrerequisiteId): Promise<boolean> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Get user's business ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) return false;

    const businessId = profile.business_id;

    switch (id) {
      case 'twilio': {
        // Check if Twilio is configured
        const { data: integration } = await supabase
          .from('integrations')
          .select('id, is_active')
          .eq('business_id', businessId)
          .eq('provider', 'twilio')
          .single();
        return !!integration?.is_active;
      }

      case 'stripe': {
        // Check if Stripe is configured
        const { data: integration } = await supabase
          .from('integrations')
          .select('id, is_active')
          .eq('business_id', businessId)
          .eq('provider', 'stripe')
          .single();
        return !!integration?.is_active;
      }

      case 'team': {
        // Check if there are team members besides the owner
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .neq('id', user.id);
        return (count || 0) > 0;
      }

      case 'business-profile': {
        // Check if business profile is complete
        const { data: business } = await supabase
          .from('businesses')
          .select('name, phone, address_line1, city, state')
          .eq('id', businessId)
          .single();
        return !!(
          business?.name &&
          business?.phone &&
          business?.address_line1 &&
          business?.city &&
          business?.state
        );
      }

      case 'services': {
        // Check if services are defined
        const { count } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId);
        return (count || 0) > 0;
      }

      case 'email-templates': {
        // Check if email templates exist
        const { count } = await supabase
          .from('email_templates')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId);
        return (count || 0) > 0;
      }

      default:
        return false;
    }
  } catch (error) {
    onboardingLogger.error({
      msg: 'Error checking prerequisite',
      prerequisiteId: id,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return false;
  }
}

// Get status of all prerequisites
export async function getAllPrerequisiteStatuses(): Promise<PrerequisiteStatus[]> {
  const statuses: PrerequisiteStatus[] = [];

  for (const [id, prereq] of Object.entries(PREREQUISITES)) {
    const configured = await checkPrerequisite(id as PrerequisiteId);
    statuses.push({
      ...prereq,
      configured,
    });
  }

  return statuses;
}

// Get status of specific prerequisites
export async function getPrerequisiteStatuses(
  ids: PrerequisiteId[]
): Promise<PrerequisiteStatus[]> {
  const statuses: PrerequisiteStatus[] = [];

  for (const id of ids) {
    const prereq = PREREQUISITES[id];
    if (prereq) {
      const configured = await checkPrerequisite(id);
      statuses.push({
        ...prereq,
        configured,
      });
    }
  }

  return statuses;
}

// Check if a feature's prerequisites are met
export interface FeatureAvailability {
  featureId: FeatureId;
  available: boolean;
  missingPrerequisites: PrerequisiteStatus[];
  recommendedPrerequisites: PrerequisiteStatus[];
  message: string;
}

export async function checkFeatureAvailability(
  featureId: FeatureId
): Promise<FeatureAvailability> {
  const feature = FEATURE_PREREQUISITES[featureId];
  if (!feature) {
    return {
      featureId,
      available: false,
      missingPrerequisites: [],
      recommendedPrerequisites: [],
      message: 'Unknown feature',
    };
  }

  const statuses = await getPrerequisiteStatuses(feature.prerequisites);
  const missing = statuses.filter((s) => !s.configured && s.priority === 'required');
  const recommended = statuses.filter(
    (s) => !s.configured && s.priority === 'recommended'
  );

  let available: boolean;
  if (feature.allRequired) {
    // All prerequisites must be configured
    available = missing.length === 0;
  } else {
    // At least one required prerequisite must be configured
    const configuredRequired = statuses.filter(
      (s) => s.configured && s.priority === 'required'
    );
    available = configuredRequired.length > 0 || missing.length === 0;
  }

  let message: string;
  if (available) {
    if (recommended.length > 0) {
      message = `${feature.name} is ready! Set up ${recommended.map((r) => r.name).join(', ')} for the best experience.`;
    } else {
      message = `${feature.name} is fully configured and ready to use.`;
    }
  } else {
    const missingNames = missing.map((m) => m.name).join(', ');
    message = `To use ${feature.name}, please configure: ${missingNames}`;
  }

  return {
    featureId,
    available,
    missingPrerequisites: missing,
    recommendedPrerequisites: recommended,
    message,
  };
}

// Get all feature availabilities
export async function getAllFeatureAvailabilities(): Promise<FeatureAvailability[]> {
  const featureIds = Object.keys(FEATURE_PREREQUISITES) as FeatureId[];
  return Promise.all(featureIds.map(checkFeatureAvailability));
}

// Helper: Check if any required setup is missing
export async function hasRequiredSetupIncomplete(): Promise<boolean> {
  const statuses = await getAllPrerequisiteStatuses();
  return statuses.some((s) => !s.configured && s.priority === 'required');
}

// Helper: Get setup progress percentage
export async function getSetupProgress(): Promise<{
  completed: number;
  total: number;
  percentage: number;
}> {
  const statuses = await getAllPrerequisiteStatuses();
  const completed = statuses.filter((s) => s.configured).length;
  const total = statuses.length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

// Caching layer for client-side performance
const cache: Map<string, { data: unknown; expiry: number }> = new Map();
const CACHE_TTL = 60000; // 1 minute

export async function getCachedPrerequisiteStatus(
  id: PrerequisiteId
): Promise<boolean> {
  const cacheKey = `prereq-${id}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expiry) {
    return cached.data as boolean;
  }

  const result = await checkPrerequisite(id);
  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  return result;
}

export function invalidatePrerequisiteCache(id?: PrerequisiteId): void {
  if (id) {
    cache.delete(`prereq-${id}`);
  } else {
    cache.clear();
  }
}
