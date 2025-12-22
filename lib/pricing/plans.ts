// =====================================================
// TRADESCAPTAIN PRICING & PLANS CONFIGURATION - v5
// Updated: December 2025
// =====================================================

// Plan track types
export type PlanTrack = 'blue' | 'web' | 'seo' | 'gold';
export type PlanTier = 'starter' | 'pro' | 'enterprise' | 'custom';
export type PlanType = 'individual' | 'teams';
export type BillingFrequency = 'monthly' | 'annual';

export interface PlanFeatures {
  website_pages?: string;
  users: number;
  user_limit?: number; // Alias for users for backwards compatibility
  includes_website: boolean;
  includes_crm: boolean;
  includes_local_seo: boolean;
  local_seo_tier?: PlanTier;
  includes_gbp: boolean;
  gbp_addon_available: boolean;
  includes_ai_sms: boolean;
  citations?: number;
  requires_existing_website: boolean;
  features: string[];
}

// Available plan tracks
export const PLAN_TRACKS: PlanTrack[] = ['blue', 'web', 'seo', 'gold'];

export interface Plan {
  id: string;
  name: string;
  track: PlanTrack;
  tier: PlanTier;
  type: PlanType;
  monthly_price: number;
  annual_price: number;
  features: PlanFeatures;
  description: string; // Short description for UI
  invoice_description: string;
  invoice_includes: string;
  is_active: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  billing_type: 'one_time' | 'recurring';
  description: string;
  available_for: string[]; // plan IDs or wildcards like 'web_*'
  not_available_for: string[];
}

// =====================================================
// BLUE PLANS (CRM Only) - No pricing changes
// =====================================================

export const BLUE_PLANS: Plan[] = [
  {
    id: 'blue_starter',
    name: 'Blue Starter',
    track: 'blue',
    tier: 'starter',
    type: 'individual',
    monthly_price: 49,
    annual_price: 441,
    description: 'Perfect for solo contractors',
    features: {
      users: 1,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Lead Management',
        'Job Scheduling',
        'Basic Invoicing',
      ],
    },
    invoice_description: 'Blue Starter — CRM Only',
    invoice_includes: 'BlueHQ CRM (1 user), AI SMS Lead Capture',
    is_active: true,
  },
  {
    id: 'blue_pro',
    name: 'Blue Pro',
    track: 'blue',
    tier: 'pro',
    type: 'individual',
    monthly_price: 99,
    annual_price: 891,
    description: 'Advanced features for growing businesses',
    features: {
      users: 1,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Advanced Lead Management',
        'Job Scheduling & Dispatch',
        'Quotes & Invoicing',
        'Expense Tracking',
        'Basic Reports',
      ],
    },
    invoice_description: 'Blue Pro — CRM Only',
    invoice_includes: 'BlueHQ CRM (1 user), AI SMS, Advanced Features',
    is_active: true,
  },
  {
    id: 'blue_enterprise',
    name: 'Blue Enterprise',
    track: 'blue',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 199,
    annual_price: 1791,
    description: 'Full-featured CRM with priority support',
    features: {
      users: 1,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Full CRM Features',
        'Advanced Dispatch',
        'Full Reporting Suite',
        'Integrations',
        'Priority Support',
      ],
    },
    invoice_description: 'Blue Enterprise — CRM Only',
    invoice_includes: 'BlueHQ CRM (1 user), Full Features, Priority Support',
    is_active: true,
  },
  {
    id: 'blue_starter_teams',
    name: 'Blue Starter Teams',
    track: 'blue',
    tier: 'starter',
    type: 'teams',
    monthly_price: 149,
    annual_price: 1341,
    description: 'Team CRM for small crews',
    features: {
      users: 5,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (5 users)',
        'AI SMS Lead Capture',
        'Team Management',
        'Role-based Access',
        'Job Scheduling',
      ],
    },
    invoice_description: 'Blue Starter Teams — CRM (5 users)',
    invoice_includes: 'BlueHQ CRM (5 users), AI SMS, Team Features',
    is_active: true,
  },
  {
    id: 'blue_pro_teams',
    name: 'Blue Pro Teams',
    track: 'blue',
    tier: 'pro',
    type: 'teams',
    monthly_price: 199,
    annual_price: 1791,
    description: 'Advanced team features with dispatch',
    features: {
      users: 10,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (10 users)',
        'AI SMS Lead Capture',
        'Advanced Team Management',
        'Dispatch & Routing',
        'Full Reporting',
      ],
    },
    invoice_description: 'Blue Pro Teams — CRM (10 users)',
    invoice_includes: 'BlueHQ CRM (10 users), AI SMS, Advanced Team Features',
    is_active: true,
  },
  {
    id: 'blue_enterprise_teams',
    name: 'Blue Enterprise Teams',
    track: 'blue',
    tier: 'enterprise',
    type: 'teams',
    monthly_price: 399,
    annual_price: 3591,
    description: 'Enterprise CRM for large operations',
    features: {
      users: 20,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      requires_existing_website: false,
      features: [
        'BlueHQ CRM (20 users)',
        'AI SMS Lead Capture',
        'Enterprise Team Management',
        'Advanced Dispatch',
        'Full Reporting Suite',
        'API Access',
        'Dedicated Support',
      ],
    },
    invoice_description: 'Blue Enterprise Teams — CRM (20 users)',
    invoice_includes: 'BlueHQ CRM (20 users), Full Enterprise Features',
    is_active: true,
  },
];

// =====================================================
// WEB PLANS (Website Only) - No pricing changes
// GBP Add-On available ($99 one-time)
// =====================================================

export const WEB_PLANS: Plan[] = [
  {
    id: 'web_starter',
    name: 'Web Starter',
    track: 'web',
    tier: 'starter',
    type: 'individual',
    monthly_price: 149,
    annual_price: 1341,
    description: 'Professional 1-5 page website',
    features: {
      website_pages: '1-5',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true, // GBP add-on available for Web plans
      includes_ai_sms: false,
      requires_existing_website: false,
      features: [
        'Semi-Custom Website (1-5 pages)',
        'Mobile Responsive',
        'On-Page SEO (meta tags, schema)',
        'SSL Certificate',
        'Hosting Included',
        'Monthly Maintenance',
      ],
    },
    invoice_description: 'Web Starter — Professional Website',
    invoice_includes: '1-5 page website, On-Page SEO, Hosting & SSL',
    is_active: true,
  },
  {
    id: 'web_pro',
    name: 'Web Pro',
    track: 'web',
    tier: 'pro',
    type: 'individual',
    monthly_price: 249,
    annual_price: 2241,
    description: 'Feature-rich 5-10 page website with blog',
    features: {
      website_pages: '5-10',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      requires_existing_website: false,
      features: [
        'Semi-Custom Website (5-10 pages)',
        'Mobile Responsive',
        'On-Page SEO',
        'SSL Certificate',
        'Hosting Included',
        'Blog Setup',
        'Contact Forms',
        'Monthly Updates',
      ],
    },
    invoice_description: 'Web Pro — Professional Website',
    invoice_includes: '5-10 page website, On-Page SEO, Hosting & SSL, Blog',
    is_active: true,
  },
  {
    id: 'web_enterprise',
    name: 'Web Enterprise',
    track: 'web',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 349,
    annual_price: 3141,
    description: 'Premium 10-15 page website',
    features: {
      website_pages: '10-15',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      requires_existing_website: false,
      features: [
        'Semi-Custom Website (10-15 pages)',
        'Mobile Responsive',
        'Advanced On-Page SEO',
        'SSL Certificate',
        'Premium Hosting',
        'Blog & News Section',
        'Custom Forms',
        'Priority Updates',
      ],
    },
    invoice_description: 'Web Enterprise — Professional Website',
    invoice_includes: '10-15 page website, Advanced SEO, Premium Hosting',
    is_active: true,
  },
  {
    id: 'web_custom',
    name: 'Web Full Custom',
    track: 'web',
    tier: 'custom',
    type: 'individual',
    monthly_price: 0, // Quote-based
    annual_price: 0,
    description: 'Fully custom 15+ page website',
    features: {
      website_pages: '15+',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      requires_existing_website: false,
      features: [
        'Fully Custom Website (15+ pages)',
        'Custom Design',
        'Advanced Functionality',
        'E-commerce Options',
        'Custom Integrations',
        'Dedicated Support',
      ],
    },
    invoice_description: 'Web Full Custom — Custom Website',
    invoice_includes: 'Custom website build per quote',
    is_active: true,
  },
];

// =====================================================
// LOCAL SEO PLANS (NEW) - For existing websites
// GBP Management INCLUDED
// =====================================================

export const SEO_PLANS: Plan[] = [
  {
    id: 'seo_starter',
    name: 'Local SEO Starter',
    track: 'seo',
    tier: 'starter',
    type: 'individual',
    monthly_price: 99,
    annual_price: 891,
    description: 'GBP management + 20 citations',
    features: {
      website_pages: '1-5',
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'starter',
      includes_gbp: true, // GBP INCLUDED
      gbp_addon_available: false, // Already included
      includes_ai_sms: false,
      citations: 20,
      requires_existing_website: true, // Client must have existing website
      features: [
        'GBP Setup & Management',
        '20 Local Citations',
        'Basic On-Site Optimization',
        'Monthly Ranking Report',
        '2 GBP Posts/Month',
      ],
    },
    invoice_description: 'Local SEO Starter — For websites with 1-5 pages',
    invoice_includes: 'GBP setup & management, 20 citations, on-site optimization, monthly ranking report',
    is_active: true,
  },
  {
    id: 'seo_pro',
    name: 'Local SEO Pro',
    track: 'seo',
    tier: 'pro',
    type: 'individual',
    monthly_price: 149,
    annual_price: 1341,
    description: 'GBP + 50 citations + competitor tracking',
    features: {
      website_pages: '5-10',
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: false,
      citations: 50,
      requires_existing_website: true,
      features: [
        'GBP Management',
        '50 Local Citations',
        'On-Site Optimization',
        'Review Response Templates',
        'Competitor Tracking (3)',
        'Bi-Weekly Ranking Reports',
        '4 GBP Posts/Month',
      ],
    },
    invoice_description: 'Local SEO Pro — For websites with 5-10 pages',
    invoice_includes: 'GBP management, 50 citations, review templates, competitor tracking, bi-weekly reports',
    is_active: true,
  },
  {
    id: 'seo_enterprise',
    name: 'Local SEO Enterprise',
    track: 'seo',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 199,
    annual_price: 1791,
    description: 'Full GBP + 100+ citations + review mgmt',
    features: {
      website_pages: '10-15',
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'enterprise',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: false,
      citations: 100,
      requires_existing_website: true,
      features: [
        'Full GBP Management',
        '100+ Local Citations',
        'Advanced On-Site Optimization',
        'Review Management',
        'Competitor Tracking (5)',
        'Weekly Ranking Reports',
        '8 GBP Posts/Month',
        'Priority Support',
      ],
    },
    invoice_description: 'Local SEO Enterprise — For websites with 10-15 pages',
    invoice_includes: 'Full GBP management, 100+ citations, review management, weekly reports',
    is_active: true,
  },
];

// =====================================================
// GOLD PLANS (All-in-One) - UPDATED PRICING +$50
// Website + CRM + Local SEO + GBP INCLUDED
// =====================================================

export const GOLD_PLANS: Plan[] = [
  {
    id: 'gold_starter',
    name: 'Gold Starter',
    track: 'gold',
    tier: 'starter',
    type: 'individual',
    monthly_price: 249, // WAS $199
    annual_price: 2241, // WAS $1,791
    description: 'Complete package: website + CRM + SEO',
    features: {
      website_pages: '1-5',
      users: 1,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'starter', // Matches plan tier
      includes_gbp: true, // GBP INCLUDED
      gbp_addon_available: false, // Already included
      includes_ai_sms: true,
      citations: 20,
      requires_existing_website: false,
      features: [
        'Website (1-5 pages)',
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Local SEO Starter',
        'GBP Management',
        '20 Local Citations',
        'Monthly Ranking Report',
      ],
    },
    invoice_description: 'Gold Starter — Website + CRM + Local SEO Starter',
    invoice_includes: '1-5 page website, BlueHQ CRM (1 user), AI SMS, GBP management, 20 citations',
    is_active: true,
  },
  {
    id: 'gold_pro',
    name: 'Gold Pro',
    track: 'gold',
    tier: 'pro',
    type: 'individual',
    monthly_price: 399, // WAS $349
    annual_price: 3591, // WAS $3,141
    description: 'Recommended all-in-one for growing businesses',
    features: {
      website_pages: '5-10',
      users: 1,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      citations: 50,
      requires_existing_website: false,
      features: [
        'Website (5-10 pages)',
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Local SEO Pro',
        'GBP Management',
        '50 Local Citations',
        'Competitor Tracking',
        'Bi-Weekly Reports',
      ],
    },
    invoice_description: 'Gold Pro — Website + CRM + Local SEO Pro',
    invoice_includes: '5-10 page website, BlueHQ CRM (1 user), AI SMS, GBP management, 50 citations, competitor tracking',
    is_active: true,
  },
  {
    id: 'gold_enterprise',
    name: 'Gold Enterprise',
    track: 'gold',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 549, // WAS $499
    annual_price: 4941, // WAS $4,491
    description: 'Premium all-in-one with full features',
    features: {
      website_pages: '10-15',
      users: 1,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'enterprise',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      citations: 100,
      requires_existing_website: false,
      features: [
        'Website (10-15 pages)',
        'BlueHQ CRM (1 user)',
        'AI SMS Lead Capture',
        'Local SEO Enterprise',
        'Full GBP Management',
        '100+ Local Citations',
        'Review Management',
        'Weekly Reports',
      ],
    },
    invoice_description: 'Gold Enterprise — Website + CRM + Local SEO Enterprise',
    invoice_includes: '10-15 page website, BlueHQ CRM (1 user), AI SMS, full GBP management, 100+ citations, review management',
    is_active: true,
  },
  {
    id: 'gold_starter_teams',
    name: 'Gold Starter Teams',
    track: 'gold',
    tier: 'starter',
    type: 'teams',
    monthly_price: 349, // WAS $299
    annual_price: 3141, // WAS $2,691
    description: 'All-in-one for small teams (5 users)',
    features: {
      website_pages: '1-5',
      users: 5,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'starter',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      citations: 20,
      requires_existing_website: false,
      features: [
        'Website (1-5 pages)',
        'BlueHQ CRM (5 users)',
        'AI SMS Lead Capture',
        'Local SEO Starter',
        'GBP Management',
        '20 Local Citations',
        'Team Management',
      ],
    },
    invoice_description: 'Gold Starter Teams — Website + CRM (5 users) + Local SEO Starter',
    invoice_includes: '1-5 page website, BlueHQ CRM (5 users), AI SMS, GBP management, 20 citations',
    is_active: true,
  },
  {
    id: 'gold_pro_teams',
    name: 'Gold Pro Teams',
    track: 'gold',
    tier: 'pro',
    type: 'teams',
    monthly_price: 499, // WAS $449
    annual_price: 4491, // WAS $4,041
    description: 'All-in-one for growing teams (10 users)',
    features: {
      website_pages: '5-10',
      users: 10,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      citations: 50,
      requires_existing_website: false,
      features: [
        'Website (5-10 pages)',
        'BlueHQ CRM (10 users)',
        'AI SMS Lead Capture',
        'Local SEO Pro',
        'GBP Management',
        '50 Local Citations',
        'Competitor Tracking',
        'Advanced Team Features',
      ],
    },
    invoice_description: 'Gold Pro Teams — Website + CRM (10 users) + Local SEO Pro',
    invoice_includes: '5-10 page website, BlueHQ CRM (10 users), AI SMS, GBP management, 50 citations',
    is_active: true,
  },
  {
    id: 'gold_enterprise_teams',
    name: 'Gold Enterprise Teams',
    track: 'gold',
    tier: 'enterprise',
    type: 'teams',
    monthly_price: 799, // WAS $749
    annual_price: 7191, // WAS $6,741
    description: 'Enterprise all-in-one (20 users)',
    features: {
      website_pages: '10-15',
      users: 20,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'enterprise',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      citations: 100,
      requires_existing_website: false,
      features: [
        'Website (10-15 pages)',
        'BlueHQ CRM (20 users)',
        'AI SMS Lead Capture',
        'Local SEO Enterprise',
        'Full GBP Management',
        '100+ Local Citations',
        'Review Management',
        'Enterprise Team Features',
        'Dedicated Support',
      ],
    },
    invoice_description: 'Gold Enterprise Teams — Website + CRM (20 users) + Local SEO Enterprise',
    invoice_includes: '10-15 page website, BlueHQ CRM (20 users), AI SMS, full GBP management, 100+ citations',
    is_active: true,
  },
];

// =====================================================
// ADD-ONS
// =====================================================

export const ADDONS: AddOn[] = [
  {
    id: 'gbp_setup',
    name: 'GBP Setup/Optimization',
    price: 99,
    billing_type: 'one_time',
    description: 'One-time setup: GBP creation/claim, profile optimization, description, categories, initial photos, first 2 posts',
    available_for: ['web_starter', 'web_pro', 'web_enterprise', 'web_custom'],
    not_available_for: ['gold_*', 'seo_*', 'blue_*'], // Included in Gold/SEO, not available for Blue
  },
  {
    id: 'extra_location',
    name: 'Extra Location',
    price: 199,
    billing_type: 'recurring',
    description: 'Additional business location with full service coverage',
    available_for: ['web_*', 'gold_*', 'seo_*'],
    not_available_for: ['blue_*'],
  },
];

// Convenience export for the GBP add-on
export const GBP_ADDON = ADDONS.find(a => a.id === 'gbp_setup')!;

// =====================================================
// ALL PLANS COMBINED
// =====================================================

export const ALL_PLANS: Plan[] = [
  ...BLUE_PLANS,
  ...WEB_PLANS,
  ...SEO_PLANS,
  ...GOLD_PLANS,
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getPlanById(planId: string): Plan | undefined {
  return ALL_PLANS.find(p => p.id === planId);
}

export function getPlansByTrack(track: PlanTrack): Plan[] {
  return ALL_PLANS.filter(p => p.track === track && p.is_active);
}

export function getPlansByTier(tier: PlanTier): Plan[] {
  return ALL_PLANS.filter(p => p.tier === tier && p.is_active);
}

export function getAddOnById(addonId: string): AddOn | undefined {
  return ADDONS.find(a => a.id === addonId);
}

export function isAddOnAvailableForPlan(addonId: string, planId: string): boolean {
  const addon = getAddOnById(addonId);
  if (!addon) return false;

  // Check not_available_for first (wildcards)
  for (const pattern of addon.not_available_for) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (planId.startsWith(prefix)) return false;
    } else if (pattern === planId) {
      return false;
    }
  }

  // Check available_for (wildcards)
  for (const pattern of addon.available_for) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (planId.startsWith(prefix)) return true;
    } else if (pattern === planId) {
      return true;
    }
  }

  return false;
}

export function calculateAnnualDiscount(monthlyPrice: number): number {
  // 25% discount for annual (customer pays 9 months instead of 12)
  return Math.round(monthlyPrice * 12 * 0.75);
}

export function getTrackLabel(track: PlanTrack): string {
  const labels: Record<PlanTrack, string> = {
    blue: 'Blue (CRM)',
    web: 'Web (Website)',
    seo: 'Local SEO',
    gold: 'Gold (All-in-One)',
  };
  return labels[track];
}

export function getTierLabel(tier: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
    custom: 'Custom',
  };
  return labels[tier];
}
