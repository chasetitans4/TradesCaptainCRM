// =====================================================
// TRADESCAPTAIN PRICING & PLANS CONFIGURATION - v6.3
// Updated: January 2025
// Terms: Month-to-month | $0 deposit | Cancel anytime
// Changes: Blue Starter $39, Blue Pro 5 users, Leads Captain $49 add-on
// =====================================================

// Plan track types (v6.0: removed leads_captain, silver, gold; renamed seo to seo_aeo)
export type PlanTrack = 'blue' | 'web' | 'seo_aeo';

// Legacy plan tracks for existing subscriptions
export type LegacyPlanTrack = 'leads_captain' | 'seo' | 'silver' | 'gold';
export type PlanTier = 'starter' | 'pro' | 'enterprise' | 'custom';
export type PlanType = 'individual' | 'teams';
export type BillingFrequency = 'monthly' | 'annual';

export interface PlanFeatures {
  website_pages?: string;
  users: number;
  user_limit?: number; // Alias for users for backwards compatibility
  contacts?: number | 'unlimited'; // Contact limit for CRM plans
  includes_website: boolean;
  includes_crm: boolean;
  includes_local_seo: boolean;
  local_seo_tier?: PlanTier;
  includes_gbp: boolean;
  gbp_addon_available: boolean;
  includes_ai_sms: boolean;
  includes_leads_captain: boolean; // v5.9: Leads Captain inclusion
  sms_limit?: number; // Monthly SMS limit
  citations?: number;
  requires_existing_website: boolean;
  features: string[];
  support_level?: 'email' | 'email_chat' | 'priority';
}

// Available plan tracks (v6.0 - active only)
export const PLAN_TRACKS: PlanTrack[] = ['blue', 'web', 'seo_aeo'];

// Legacy plan tracks for existing subscriptions
export const LEGACY_PLAN_TRACKS: LegacyPlanTrack[] = ['leads_captain', 'seo', 'silver', 'gold'];

export interface Plan {
  id: string;
  name: string;
  track: PlanTrack | LegacyPlanTrack;
  tier: PlanTier;
  type: PlanType;
  monthly_price: number;
  annual_price: number;
  features: PlanFeatures;
  description: string; // Short description for UI
  invoice_description: string;
  invoice_includes: string;
  is_active: boolean;
  is_discontinued?: boolean; // v6.0: true for removed products
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
// LEADS CAPTAIN - DISCONTINUED (v6.0)
// Now included in Blue Pro/Enterprise
// =====================================================

export const LEADS_CAPTAIN_PLANS: Plan[] = [
  {
    id: 'leads_captain',
    name: 'Leads Captain',
    track: 'leads_captain',
    tier: 'starter',
    type: 'individual',
    monthly_price: 39,
    annual_price: 398, // 15% discount (~2 months free)
    description: 'AI Missed Call Text-Back (DISCONTINUED - Now in Blue Pro/Enterprise)',
    features: {
      users: 1,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700, // Soft cap
      requires_existing_website: false,
      support_level: 'email',
      features: [
        'Dedicated phone number',
        'Automatic text-back',
        'AI SMS conversations',
        '700 SMS messages/month (soft cap)',
        'Conversation dashboard',
      ],
    },
    invoice_description: 'Leads Captain — AI Missed Call Text-Back',
    invoice_includes: 'Dedicated phone number, AI SMS conversations, 700 SMS/month',
    is_active: false, // DISCONTINUED
    is_discontinued: true,
  },
];

// =====================================================
// BLUE CRM PLANS - v6.3 pricing
// Leads Captain is now a $49/mo add-on (not included)
// =====================================================

export const BLUE_PLANS: Plan[] = [
  {
    id: 'blue_starter',
    name: 'Blue Starter',
    track: 'blue',
    tier: 'starter',
    type: 'individual',
    monthly_price: 39, // v6.3: reduced from $49
    annual_price: 398, // 15% discount
    description: 'Perfect for solo contractors',
    features: {
      users: 1,
      contacts: 500,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: false, // v6.3: LC is now an add-on
      includes_leads_captain: false,
      requires_existing_website: false,
      support_level: 'email',
      features: [
        'Blue CRM (1 user)',
        '500 contacts',
        'Lead tracking',
        'Basic job management',
      ],
    },
    invoice_description: 'Blue Starter — CRM Only',
    invoice_includes: 'Blue CRM (1 user), 500 contacts, lead tracking, basic job management',
    is_active: true,
  },
  {
    id: 'blue_pro',
    name: 'Blue Pro',
    track: 'blue',
    tier: 'pro',
    type: 'individual',
    monthly_price: 99,
    annual_price: 1010, // 15% discount
    description: 'Advanced CRM for growing teams', // v6.3: updated description
    features: {
      users: 5, // v6.3: increased from 3
      contacts: 2000,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: false, // v6.3: LC is now an add-on
      includes_leads_captain: false, // v6.3: LC is now an add-on
      requires_existing_website: false,
      support_level: 'email_chat',
      features: [
        'Blue CRM (5 users)', // v6.3: updated
        '2,000 contacts',
        'Lead tracking',
        'Full job management',
        'Two-way SMS',
        'Estimate templates',
        'Document storage',
        '+$10/mo per additional user', // v6.3: added
      ],
    },
    invoice_description: 'Blue Pro — CRM',
    invoice_includes: 'Blue CRM (5 users), 2,000 contacts',
    is_active: true,
  },
  {
    id: 'blue_enterprise',
    name: 'Blue Enterprise',
    track: 'blue',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 199,
    annual_price: 2030, // 15% discount
    description: 'Full-featured CRM with priority support',
    features: {
      users: 10,
      contacts: 'unlimited',
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: false, // v6.3: LC is now an add-on
      includes_leads_captain: false, // v6.3: LC is now an add-on
      requires_existing_website: false,
      support_level: 'priority',
      features: [
        'Blue CRM (10 users)',
        'Unlimited contacts',
        'Lead tracking',
        'Full job management',
        'Two-way SMS',
        'Estimate templates',
        'Document storage',
        'Calendar sync',
        'Auto follow-ups',
        '+$10/mo per additional user', // v6.3: added
        'Priority support',
      ],
    },
    invoice_description: 'Blue Enterprise — CRM',
    invoice_includes: 'Blue CRM (10 users), Unlimited contacts, Priority support',
    is_active: true,
  },
];

// =====================================================
// WEB PLANS (Website Only) - v5.9 pricing
// Cloud hosting: 2 years included, then $15/mo
// =====================================================

export const WEB_PLANS: Plan[] = [
  {
    id: 'web_starter',
    name: 'Web Starter',
    track: 'web',
    tier: 'starter',
    type: 'individual',
    monthly_price: 199,
    annual_price: 2030, // 15% discount
    description: 'Professional 5-page website',
    features: {
      website_pages: '5',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      features: [
        '5 pages',
        'Mobile responsive',
        'Basic on-page SEO',
        'Contact forms',
        'Domain name (1 year)',
        'Cloud hosting (2 years included)',
        'SSL certificate',
        '3 stock images/graphics',
        '1 design revision',
        'Delivery: 3-4 weeks',
      ],
    },
    invoice_description: 'Web Starter — Professional Website',
    invoice_includes: '5 page website, domain, 2 years hosting, SSL',
    is_active: true,
  },
  {
    id: 'web_pro',
    name: 'Web Pro',
    track: 'web',
    tier: 'pro',
    type: 'individual',
    monthly_price: 299,
    annual_price: 3050, // 15% discount
    description: 'Feature-rich 10-page website with blog',
    features: {
      website_pages: '10',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      features: [
        '10 pages',
        'Mobile responsive',
        'Basic on-page SEO',
        'Contact forms',
        'Domain name (1 year)',
        'Cloud hosting (2 years included)',
        'SSL certificate',
        '6 stock images/graphics',
        '3 service area pages',
        'Blog setup',
        'Schema markup',
        '2 design revisions',
        'Delivery: 3-4 weeks',
      ],
    },
    invoice_description: 'Web Pro — Professional Website',
    invoice_includes: '10 page website, domain, 2 years hosting, SSL, blog, service area pages',
    is_active: true,
  },
  {
    id: 'web_enterprise',
    name: 'Web Enterprise',
    track: 'web',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 499,
    annual_price: 5090, // 15% discount
    description: 'Premium 15+ page website',
    features: {
      website_pages: '15+',
      users: 0,
      includes_website: true,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: true,
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      features: [
        '15+ pages',
        'Mobile responsive',
        'Basic on-page SEO',
        'Contact forms',
        'Domain name (1 year)',
        'Cloud hosting (2 years included)',
        'SSL certificate',
        '9 stock images/graphics',
        '10 service area pages',
        'Blog setup',
        'Schema markup',
        '3 design revisions',
        'Delivery: 3-4 weeks',
      ],
    },
    invoice_description: 'Web Enterprise — Professional Website',
    invoice_includes: '15+ page website, domain, 2 years hosting, SSL, blog, 10 service area pages',
    is_active: true,
  },
];

// =====================================================
// SEO/AEO PLANS - v6.0 pricing (renamed from Local SEO)
// For existing websites - GBP Management INCLUDED
// =====================================================

export const SEO_AEO_PLANS: Plan[] = [
  {
    id: 'seo_aeo_starter',
    name: 'SEO/AEO Starter',
    track: 'seo_aeo',
    tier: 'starter',
    type: 'individual',
    monthly_price: 99,
    annual_price: 1010, // 15% discount
    description: 'GBP optimization & initial setup',
    features: {
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'starter',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: true,
      features: [
        'GBP optimization (initial setup)',
        'Geogrid ranking report (monthly)',
        'Citation audit (initial)',
        'NAP consistency check',
        'SEO/AEO audit (initial only)',
      ],
    },
    invoice_description: 'SEO/AEO Starter',
    invoice_includes: 'GBP initial setup, monthly geogrid report, citation audit',
    is_active: true,
  },
  {
    id: 'seo_aeo_pro',
    name: 'SEO/AEO Pro',
    track: 'seo_aeo',
    tier: 'pro',
    type: 'individual',
    monthly_price: 199,
    annual_price: 2030, // 15% discount
    description: 'Setup + monthly review with citation building',
    features: {
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: false,
      includes_leads_captain: false,
      citations: 30,
      requires_existing_website: true,
      features: [
        'GBP optimization (setup + monthly review)',
        '2 GBP posts/month',
        'Geogrid ranking report (bi-weekly)',
        'Citation audit (quarterly)',
        'Citation building (up to 30 directories)',
        'NAP consistency check',
        'Competitor ranking comparison',
        'Review monitoring alerts',
        'SEO/AEO audit (quarterly)',
      ],
    },
    invoice_description: 'SEO/AEO Pro',
    invoice_includes: 'GBP monthly review, 2 posts/mo, bi-weekly reports, 30 citations, competitor tracking',
    is_active: true,
  },
  {
    id: 'seo_aeo_enterprise',
    name: 'SEO/AEO Enterprise',
    track: 'seo_aeo',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 299, // Updated from $249 to $299 per v6.0
    annual_price: 3050, // 15% discount
    description: 'Full GBP management with strategy calls',
    features: {
      users: 0,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: true,
      local_seo_tier: 'enterprise',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: false,
      includes_leads_captain: false,
      citations: 50,
      requires_existing_website: true,
      features: [
        'Full GBP management',
        '4 GBP posts/month',
        'Geogrid ranking report (weekly)',
        'Citation audit (monthly)',
        'Citation building (up to 50 directories)',
        'NAP consistency check',
        'Competitor ranking comparison',
        'Review monitoring alerts',
        'SEO/AEO audit (quarterly)',
        'Strategy review call (quarterly)',
      ],
    },
    invoice_description: 'SEO/AEO Enterprise',
    invoice_includes: 'Full GBP management, 4 posts/mo, weekly reports, 50 citations, quarterly strategy calls',
    is_active: true,
  },
];

// Legacy SEO_PLANS alias for backward compatibility
export const SEO_PLANS = SEO_AEO_PLANS;

// =====================================================
// SILVER BUNDLE - DISCONTINUED (v6.0)
// Website + CRM + Leads Captain (no Local SEO)
// =====================================================

export const SILVER_PLANS: Plan[] = [
  {
    id: 'silver_starter',
    name: 'Silver Starter',
    track: 'silver',
    tier: 'starter',
    type: 'individual',
    monthly_price: 249,
    annual_price: 2540, // 15% discount
    description: 'Website + CRM + Leads Captain bundle (DISCONTINUED)',
    features: {
      website_pages: '5',
      users: 1,
      contacts: 500,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      requires_existing_website: false,
      features: [
        'Web Starter (5 pages)',
        'Blue Starter CRM',
        'Leads Captain included',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        '500 contacts',
        '1 team member',
        '700 SMS/month',
      ],
    },
    invoice_description: 'Silver Starter — Website + CRM + Leads Captain',
    invoice_includes: '5 page website, Blue CRM, Leads Captain, 700 SMS/mo',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'silver_pro',
    name: 'Silver Pro',
    track: 'silver',
    tier: 'pro',
    type: 'individual',
    monthly_price: 349,
    annual_price: 3560, // 15% discount
    description: 'Enhanced bundle with two-way SMS (DISCONTINUED)',
    features: {
      website_pages: '10',
      users: 3,
      contacts: 2000,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      requires_existing_website: false,
      features: [
        'Web Pro (10 pages)',
        'Blue Pro CRM',
        'Leads Captain included',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        '2,000 contacts',
        '3 team members',
        '700 SMS/month',
        'Two-way SMS',
        '3 service area pages',
      ],
    },
    invoice_description: 'Silver Pro — Website + CRM + Leads Captain',
    invoice_includes: '10 page website, Blue Pro CRM, Leads Captain, 700 SMS/mo, two-way SMS',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'silver_enterprise',
    name: 'Silver Enterprise',
    track: 'silver',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 499,
    annual_price: 5090, // 15% discount
    description: 'Premium bundle with unlimited contacts (DISCONTINUED)',
    features: {
      website_pages: '15+',
      users: 10,
      contacts: 'unlimited',
      includes_website: true,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      requires_existing_website: false,
      features: [
        'Web Enterprise (15+ pages)',
        'Blue Enterprise CRM',
        'Leads Captain included',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        'Unlimited contacts',
        '10 team members',
        '700 SMS/month',
        'Two-way SMS',
        '10 service area pages',
      ],
    },
    invoice_description: 'Silver Enterprise — Website + CRM + Leads Captain',
    invoice_includes: '15+ page website, Blue Enterprise CRM, Leads Captain, 700 SMS/mo',
    is_active: false,
    is_discontinued: true,
  },
];

// =====================================================
// GOLD BUNDLE - DISCONTINUED (v6.0)
// Website + CRM + Leads Captain + Local SEO
// =====================================================

export const GOLD_PLANS: Plan[] = [
  {
    id: 'gold_starter',
    name: 'Gold Starter',
    track: 'gold',
    tier: 'starter',
    type: 'individual',
    monthly_price: 299,
    annual_price: 3050, // 15% discount
    description: 'Complete package: Website + CRM + Leads Captain + SEO (DISCONTINUED)',
    features: {
      website_pages: '5',
      users: 3,
      contacts: 2000,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'starter',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      requires_existing_website: false,
      features: [
        'Web Starter (5 pages)',
        'Blue Pro CRM (3 users)',
        'Leads Captain included',
        'Local SEO Starter',
        'GBP optimization',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        '2,000 contacts',
        '700 SMS/month',
        'Monthly geogrid report',
      ],
    },
    invoice_description: 'Gold Starter — Website + CRM + Leads Captain + Local SEO',
    invoice_includes: '5 page website, Blue Pro CRM (3 users), Leads Captain, Local SEO Starter',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'gold_pro',
    name: 'Gold Pro',
    track: 'gold',
    tier: 'pro',
    type: 'individual',
    monthly_price: 399,
    annual_price: 4070, // 15% discount
    description: 'Recommended all-in-one for growing businesses (DISCONTINUED)',
    features: {
      website_pages: '10',
      users: 3,
      contacts: 2000,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      citations: 30,
      requires_existing_website: false,
      features: [
        'Web Pro (10 pages)',
        'Blue Pro CRM (3 users)',
        'Leads Captain included',
        'Local SEO Pro',
        'GBP management + 2 posts/mo',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        '2,000 contacts',
        '700 SMS/month',
        'Up to 30 citations',
        'Bi-weekly geogrid report',
        'Competitor comparison',
        'Review monitoring',
      ],
    },
    invoice_description: 'Gold Pro — Website + CRM + Leads Captain + Local SEO Pro',
    invoice_includes: '10 page website, Blue Pro CRM (3 users), Leads Captain, Local SEO Pro, 30 citations',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'gold_enterprise',
    name: 'Gold Enterprise',
    track: 'gold',
    tier: 'enterprise',
    type: 'individual',
    monthly_price: 598,
    annual_price: 6100, // 15% discount
    description: 'Premium all-in-one with full features (DISCONTINUED)',
    features: {
      website_pages: '15+',
      users: 10,
      contacts: 'unlimited',
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'enterprise',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 700,
      citations: 50,
      requires_existing_website: false,
      features: [
        'Web Enterprise (15+ pages)',
        'Blue Enterprise CRM (10 users)',
        'Leads Captain included',
        'Local SEO Enterprise',
        'Full GBP management + 4 posts/mo',
        'Domain name (1 year)',
        'Cloud hosting (2 years)',
        'Unlimited contacts',
        '700 SMS/month',
        'Up to 50 citations',
        'Weekly geogrid report',
        'Competitor comparison',
        'Review monitoring',
      ],
    },
    invoice_description: 'Gold Enterprise — Website + CRM + Leads Captain + Local SEO Enterprise',
    invoice_includes: '15+ page website, Blue Enterprise CRM (10 users), Leads Captain, Local SEO Enterprise, 50 citations',
    is_active: false,
    is_discontinued: true,
  },
];

// =====================================================
// ADD-ONS - v6.3
// =====================================================

export const ADDONS: AddOn[] = [
  {
    id: 'leads_captain_addon',
    name: 'Leads Captain',
    price: 49, // v6.3: New add-on pricing
    billing_type: 'recurring',
    description: 'AI-powered missed call text-back with SMS automation',
    available_for: ['blue_starter', 'blue_pro', 'blue_enterprise'],
    not_available_for: ['web_*', 'seo_aeo_*', 'silver_*', 'gold_*'],
  },
  {
    id: 'extra_user',
    name: 'Extra User',
    price: 10,
    billing_type: 'recurring',
    description: 'Additional user seat for Blue CRM plans (Pro/Enterprise only)',
    available_for: ['blue_pro', 'blue_enterprise'], // v6.3: Not available for Starter
    not_available_for: ['blue_starter', 'web_*', 'seo_aeo_*', 'silver_*', 'gold_*', 'leads_captain'],
  },
  {
    id: 'background_video',
    name: 'Background Video Creation',
    price: 99,
    billing_type: 'one_time',
    description: 'Custom background video for hero section',
    available_for: ['web_*'],
    not_available_for: ['blue_*', 'seo_aeo_*', 'leads_captain'],
  },
  {
    id: 'textual_page_update',
    name: 'Textual Page Update',
    price: 29,
    billing_type: 'one_time',
    description: 'Text changes beyond monthly allowance (per page)',
    available_for: ['web_*'],
    not_available_for: ['blue_*', 'seo_aeo_*', 'leads_captain'],
  },
  {
    id: 'design_page_update',
    name: 'Design Page Update',
    price: 69,
    billing_type: 'one_time',
    description: 'Layout/design changes to existing page (per page)',
    available_for: ['web_*'],
    not_available_for: ['blue_*', 'seo_aeo_*', 'leads_captain'],
  },
];

// =====================================================
// ALL PLANS COMBINED (v6.3 - active plans only)
// =====================================================

export const ALL_PLANS: Plan[] = [
  ...BLUE_PLANS,
  ...WEB_PLANS,
  ...SEO_AEO_PLANS,
];

// Legacy plans for existing subscriptions (includes discontinued)
export const LEGACY_PLANS: Plan[] = [
  ...LEADS_CAPTAIN_PLANS,
  ...SILVER_PLANS,
  ...GOLD_PLANS,
];

// All plans including legacy (for lookups)
export const ALL_PLANS_WITH_LEGACY: Plan[] = [
  ...ALL_PLANS,
  ...LEGACY_PLANS,
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getPlanById(planId: string): Plan | undefined {
  // Search all plans including legacy for backward compatibility
  return ALL_PLANS_WITH_LEGACY.find(p => p.id === planId);
}

export function getActivePlanById(planId: string): Plan | undefined {
  return ALL_PLANS.find(p => p.id === planId && p.is_active);
}

export function getPlansByTrack(track: PlanTrack | LegacyPlanTrack): Plan[] {
  return ALL_PLANS_WITH_LEGACY.filter(p => p.track === track && p.is_active);
}

export function getActivePlansByTrack(track: PlanTrack): Plan[] {
  return ALL_PLANS.filter(p => p.track === track && p.is_active && !p.is_discontinued);
}

export function getPlansByTier(tier: PlanTier): Plan[] {
  return ALL_PLANS.filter(p => p.tier === tier && p.is_active && !p.is_discontinued);
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
  // 15% discount for annual (~2 months free)
  // Formula: monthly * 12 * 0.85, rounded to nearest $10
  return Math.round((monthlyPrice * 12 * 0.85) / 10) * 10;
}

export function getTrackLabel(track: PlanTrack | LegacyPlanTrack): string {
  const labels: Record<PlanTrack | LegacyPlanTrack, string> = {
    blue: 'Blue CRM',
    web: 'Web (Website)',
    seo_aeo: 'SEO/AEO',
    // Legacy tracks
    leads_captain: 'Leads Captain (Discontinued)',
    seo: 'Local SEO (Now SEO/AEO)',
    silver: 'Silver Bundle (Discontinued)',
    gold: 'Gold Bundle (Discontinued)',
  };
  return labels[track] || track;
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

// Check if a plan is discontinued
export function isPlanDiscontinued(planId: string): boolean {
  const plan = getPlanById(planId);
  return plan?.is_discontinued === true || plan?.is_active === false;
}
