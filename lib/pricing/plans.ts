// =====================================================
// TRADESCAPTAIN PRICING & PLANS CONFIGURATION - v6.1
// Updated: January 2026
// Terms: Month-to-month | Cancel anytime
// Changes: Gold Bundles reintroduced, setup fees, new commission structure
// =====================================================

// Plan track types (v6.1: added 'crm' alias for 'blue', reactivated 'gold')
export type PlanTrack = 'crm' | 'blue' | 'web' | 'seo_aeo' | 'gold';

// Legacy plan tracks for existing subscriptions
export type LegacyPlanTrack = 'leads_captain' | 'seo' | 'silver' | 'gold_legacy';
export type PlanTier = 'starter' | 'pro' | 'enterprise' | 'custom';
export type PlanType = 'individual' | 'teams' | 'bundle';
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
  includes_leads_captain: boolean; // v6.1: included in Gold bundles
  sms_limit?: number; // Monthly SMS limit
  citations?: number;
  requires_existing_website: boolean;
  features: string[];
  support_level?: 'email' | 'email_chat' | 'priority';
  aeo_tier?: 'Foundation' | 'Authority' | 'Infrastructure'; // v6.1: AEO tier
  allows_extra_locations?: boolean; // v6.1: Enterprise plans allow extra locations
}

// Available plan tracks (v6.1 - active only)
export const PLAN_TRACKS: PlanTrack[] = ['crm', 'web', 'seo_aeo', 'gold'];

// Legacy plan tracks for existing subscriptions
export const LEGACY_PLAN_TRACKS: LegacyPlanTrack[] = ['leads_captain', 'seo', 'silver', 'gold_legacy'];

// v6.1: Bundle configuration
export interface BundleIncludes {
  crm: string;
  web: string;
  seo: string;
  leads_captain: boolean;
}

export interface Plan {
  id: string;
  name: string;
  track: PlanTrack | LegacyPlanTrack;
  tier: PlanTier;
  type: PlanType;
  setup_price: number; // v6.1: One-time setup fee
  monthly_price: number;
  annual_price: number;
  features: PlanFeatures;
  description: string; // Short description for UI
  invoice_description: string;
  invoice_includes: string;
  is_active: boolean;
  is_discontinued?: boolean; // v6.0: true for removed products
  is_bundle?: boolean; // v6.1: true for Gold bundles
  bundle_includes?: BundleIncludes; // v6.1: What's included in bundle
  setup_savings?: number; // v6.1: Savings vs buying individually
  monthly_savings?: number; // v6.1: Monthly savings vs individual
}

export interface AddOn {
  id: string;
  name: string;
  setup_price: number; // v6.1: One-time setup fee
  monthly_price: number; // v6.1: Recurring monthly price
  billing_type: 'one_time' | 'recurring' | 'setup_and_recurring';
  description: string;
  available_for: string[]; // plan IDs or wildcards like 'web_*'
  not_available_for: string[];
  requires?: string[]; // v6.1: Required plans (e.g., 'web_enterprise OR gold_enterprise')
}

// =====================================================
// LEADS CAPTAIN - v6.1 (Now $79/mo add-on)
// Requires CRM or Gold bundle
// =====================================================

export const LEADS_CAPTAIN_PLANS: Plan[] = [
  {
    id: 'leads_captain',
    name: 'Leads Captain',
    track: 'leads_captain',
    tier: 'starter',
    type: 'individual',
    setup_price: 0,
    monthly_price: 79, // v6.1: Updated from $39/$49 to $79
    annual_price: 806, // 15% discount
    description: 'AI SMS Text-Back, Web Chat, Scheduling Integration',
    features: {
      users: 1,
      includes_website: false,
      includes_crm: false,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 1000, // v6.1: increased
      requires_existing_website: false,
      support_level: 'email',
      features: [
        'AI SMS text-back',
        'AI Web Chat widget',
        'Scheduling integration',
        'Dedicated phone number',
        '1,000 SMS messages/month',
        'Conversation dashboard',
      ],
    },
    invoice_description: 'Leads Captain — AI SMS & Web Chat',
    invoice_includes: 'AI SMS text-back, AI Web Chat, Scheduling integration',
    is_active: true, // v6.1: Reactivated as add-on
    is_discontinued: false,
  },
];

// =====================================================
// CRM PLANS - v6.1 pricing (formerly Blue)
// $0 setup fee, recurring monthly
// =====================================================

export const CRM_PLANS: Plan[] = [
  {
    id: 'crm_starter',
    name: 'CRM Starter',
    track: 'crm',
    tier: 'starter',
    type: 'individual',
    setup_price: 0,
    monthly_price: 39,
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
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      support_level: 'email',
      features: [
        'CRM (1 user)',
        '500 contacts',
        'Lead tracking',
        'Basic job management',
      ],
    },
    invoice_description: 'CRM Starter',
    invoice_includes: 'CRM (1 user), 500 contacts, lead tracking, basic job management',
    is_active: true,
  },
  {
    id: 'crm_pro',
    name: 'CRM Pro',
    track: 'crm',
    tier: 'pro',
    type: 'individual',
    setup_price: 0,
    monthly_price: 99,
    annual_price: 1010, // 15% discount
    description: 'Advanced CRM for growing teams',
    features: {
      users: 5,
      contacts: 2000,
      includes_website: false,
      includes_crm: true,
      includes_local_seo: false,
      includes_gbp: false,
      gbp_addon_available: false,
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      support_level: 'email_chat',
      features: [
        'CRM (5 users)',
        '2,000 contacts',
        'Lead tracking',
        'Full job management',
        'Two-way SMS',
        'Estimate templates',
        'Document storage',
        '+$10/mo per additional user',
      ],
    },
    invoice_description: 'CRM Pro',
    invoice_includes: 'CRM (5 users), 2,000 contacts',
    is_active: true,
  },
  {
    id: 'crm_enterprise',
    name: 'CRM Enterprise',
    track: 'crm',
    tier: 'enterprise',
    type: 'individual',
    setup_price: 0,
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
      includes_ai_sms: false,
      includes_leads_captain: false,
      requires_existing_website: false,
      support_level: 'priority',
      features: [
        'CRM (10 users)',
        'Unlimited contacts',
        'Lead tracking',
        'Full job management',
        'Two-way SMS',
        'Estimate templates',
        'Document storage',
        'Calendar sync',
        'Auto follow-ups',
        '+$10/mo per additional user',
        'Priority support',
      ],
    },
    invoice_description: 'CRM Enterprise',
    invoice_includes: 'CRM (10 users), Unlimited contacts, Priority support',
    is_active: true,
  },
];

// Legacy alias for backwards compatibility
export const BLUE_PLANS = CRM_PLANS;

// =====================================================
// WEB PLANS (Website Only) - v6.1 pricing
// Setup fee + monthly hosting/maintenance
// =====================================================

export const WEB_PLANS: Plan[] = [
  {
    id: 'web_starter',
    name: 'Web Starter',
    track: 'web',
    tier: 'starter',
    type: 'individual',
    setup_price: 2500, // v6.1: One-time setup
    monthly_price: 49, // v6.1: Monthly hosting/maintenance
    annual_price: 500, // 15% discount
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
        'Cloud hosting included',
        'SSL certificate',
        '3 stock images/graphics',
        '1 design revision',
        'Delivery: 3-4 weeks',
      ],
    },
    invoice_description: 'Web Starter — Professional Website',
    invoice_includes: '$2,500 setup + $49/mo hosting. 5 page website, domain, hosting, SSL',
    is_active: true,
  },
  {
    id: 'web_pro',
    name: 'Web Pro',
    track: 'web',
    tier: 'pro',
    type: 'individual',
    setup_price: 5000, // v6.1: One-time setup
    monthly_price: 79, // v6.1: Monthly hosting/maintenance
    annual_price: 806, // 15% discount
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
        'Cloud hosting included',
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
    invoice_includes: '$5,000 setup + $79/mo hosting. 10 page website, domain, hosting, SSL, blog',
    is_active: true,
  },
  {
    id: 'web_enterprise',
    name: 'Web Enterprise',
    track: 'web',
    tier: 'enterprise',
    type: 'individual',
    setup_price: 10000, // v6.1: One-time setup
    monthly_price: 99, // v6.1: Monthly hosting/maintenance
    annual_price: 1010, // 15% discount
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
      allows_extra_locations: true, // v6.1: Can add extra locations
      features: [
        '15+ pages',
        'Mobile responsive',
        'Basic on-page SEO',
        'Contact forms',
        'Domain name (1 year)',
        'Cloud hosting included',
        'SSL certificate',
        '9 stock images/graphics',
        '10 service area pages',
        'Blog setup',
        'Schema markup',
        '3 design revisions',
        'Delivery: 3-4 weeks',
        'Extra locations available',
      ],
    },
    invoice_description: 'Web Enterprise — Professional Website',
    invoice_includes: '$10,000 setup + $99/mo hosting. 15+ page website, domain, hosting, SSL, blog',
    is_active: true,
  },
];

// =====================================================
// SEO/AEO PLANS - v6.1 pricing
// Setup fee + monthly management
// AEO Tiers: Foundation, Authority, Infrastructure
// =====================================================

export const SEO_AEO_PLANS: Plan[] = [
  {
    id: 'seo_starter',
    name: 'SEO Starter',
    track: 'seo_aeo',
    tier: 'starter',
    type: 'individual',
    setup_price: 100, // v6.1: One-time setup
    monthly_price: 300, // v6.1: Monthly management
    annual_price: 3060, // 15% discount
    description: 'Foundation AEO - GBP optimization & initial setup',
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
      aeo_tier: 'Foundation', // v6.1
      features: [
        'AEO Foundation tier',
        'GBP optimization (initial setup)',
        'Geogrid ranking report (monthly)',
        'Citation audit (initial)',
        'NAP consistency check',
        'SEO/AEO audit (initial only)',
      ],
    },
    invoice_description: 'SEO Starter — Foundation AEO',
    invoice_includes: '$100 setup + $300/mo. GBP setup, monthly reports, citation audit',
    is_active: true,
  },
  {
    id: 'seo_pro',
    name: 'SEO Pro',
    track: 'seo_aeo',
    tier: 'pro',
    type: 'individual',
    setup_price: 250, // v6.1: One-time setup
    monthly_price: 500, // v6.1: Monthly management
    annual_price: 5100, // 15% discount
    description: 'Authority AEO - Full management with citation building',
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
      aeo_tier: 'Authority', // v6.1
      features: [
        'AEO Authority tier',
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
    invoice_description: 'SEO Pro — Authority AEO',
    invoice_includes: '$250 setup + $500/mo. GBP management, 30 citations, bi-weekly reports',
    is_active: true,
  },
  {
    id: 'seo_enterprise',
    name: 'SEO Enterprise',
    track: 'seo_aeo',
    tier: 'enterprise',
    type: 'individual',
    setup_price: 500, // v6.1: One-time setup
    monthly_price: 1500, // v6.1: Monthly management
    annual_price: 15300, // 15% discount
    description: 'Infrastructure AEO - Full management with strategy calls',
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
      aeo_tier: 'Infrastructure', // v6.1
      allows_extra_locations: true, // v6.1: Can add extra locations
      features: [
        'AEO Infrastructure tier',
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
        'Extra locations available',
      ],
    },
    invoice_description: 'SEO Enterprise — Infrastructure AEO',
    invoice_includes: '$500 setup + $1,500/mo. Full GBP, 50 citations, weekly reports, strategy calls',
    is_active: true,
  },
];

// Legacy SEO_PLANS alias for backward compatibility
export const SEO_PLANS = SEO_AEO_PLANS;

// =====================================================
// SILVER BUNDLE - DISCONTINUED (v6.0)
// Legacy only - for existing subscriptions
// =====================================================

export const SILVER_PLANS: Plan[] = [
  {
    id: 'silver_starter',
    name: 'Silver Starter',
    track: 'silver',
    tier: 'starter',
    type: 'individual',
    setup_price: 0,
    monthly_price: 249,
    annual_price: 2540,
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Silver Starter (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'silver_pro',
    name: 'Silver Pro',
    track: 'silver',
    tier: 'pro',
    type: 'individual',
    setup_price: 0,
    monthly_price: 349,
    annual_price: 3560,
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Silver Pro (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'silver_enterprise',
    name: 'Silver Enterprise',
    track: 'silver',
    tier: 'enterprise',
    type: 'individual',
    setup_price: 0,
    monthly_price: 499,
    annual_price: 5090,
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Silver Enterprise (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
];

// =====================================================
// GOLD BUNDLES - v6.1 (REACTIVATED)
// CRM + Website + SEO + Leads Captain
// Significant savings vs buying individually
// =====================================================

export const GOLD_PLANS: Plan[] = [
  {
    id: 'gold_starter',
    name: 'Gold Starter Bundle',
    track: 'gold',
    tier: 'starter',
    type: 'bundle',
    setup_price: 1999, // v6.1: Bundle setup
    monthly_price: 399, // v6.1: Bundle monthly
    annual_price: 4070, // 15% discount
    description: 'Complete package: CRM + Website + SEO + Leads Captain',
    features: {
      website_pages: '5',
      users: 1,
      contacts: 500,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'starter',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 1000,
      requires_existing_website: false,
      aeo_tier: 'Foundation',
      features: [
        'CRM Starter (1 user, 500 contacts)',
        'Web Starter (5 pages)',
        'SEO Starter (Foundation AEO)',
        'Leads Captain included',
        'AI SMS text-back + Web Chat',
        'Domain name (1 year)',
        'Cloud hosting included',
        '1,000 SMS/month',
        'Monthly geogrid report',
        'Save $601 on setup',
        'Save $68/mo vs individual',
      ],
    },
    invoice_description: 'Gold Starter Bundle',
    invoice_includes: '$1,999 setup + $399/mo. CRM + Website + SEO + Leads Captain',
    is_active: true,
    is_bundle: true,
    bundle_includes: {
      crm: 'crm_starter',
      web: 'web_starter',
      seo: 'seo_starter',
      leads_captain: true,
    },
    setup_savings: 601, // $2,600 individual - $1,999 bundle
    monthly_savings: 68, // $467 individual - $399 bundle
  },
  {
    id: 'gold_pro',
    name: 'Gold Pro Bundle',
    track: 'gold',
    tier: 'pro',
    type: 'bundle',
    setup_price: 3999, // v6.1: Bundle setup
    monthly_price: 649, // v6.1: Bundle monthly
    annual_price: 6620, // 15% discount
    description: 'Professional all-in-one for growing businesses',
    features: {
      website_pages: '10',
      users: 5,
      contacts: 2000,
      includes_website: true,
      includes_crm: true,
      includes_local_seo: true,
      local_seo_tier: 'pro',
      includes_gbp: true,
      gbp_addon_available: false,
      includes_ai_sms: true,
      includes_leads_captain: true,
      sms_limit: 2000,
      citations: 30,
      requires_existing_website: false,
      aeo_tier: 'Authority',
      features: [
        'CRM Pro (5 users, 2,000 contacts)',
        'Web Pro (10 pages)',
        'SEO Pro (Authority AEO)',
        'Leads Captain included',
        'AI SMS text-back + Web Chat',
        'Domain name (1 year)',
        'Cloud hosting included',
        '2,000 SMS/month',
        '30 citations',
        'Bi-weekly geogrid report',
        'Save $1,251 on setup',
        'Save $108/mo vs individual',
      ],
    },
    invoice_description: 'Gold Pro Bundle',
    invoice_includes: '$3,999 setup + $649/mo. CRM + Website + SEO + Leads Captain',
    is_active: true,
    is_bundle: true,
    bundle_includes: {
      crm: 'crm_pro',
      web: 'web_pro',
      seo: 'seo_pro',
      leads_captain: true,
    },
    setup_savings: 1251, // $5,250 individual - $3,999 bundle
    monthly_savings: 108, // $757 individual - $649 bundle
  },
  {
    id: 'gold_enterprise',
    name: 'Gold Enterprise Bundle',
    track: 'gold',
    tier: 'enterprise',
    type: 'bundle',
    setup_price: 7999, // v6.1: Bundle setup
    monthly_price: 1499, // v6.1: Bundle monthly
    annual_price: 15290, // 15% discount
    description: 'Enterprise all-in-one with extra location support',
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
      sms_limit: 3000,
      citations: 50,
      requires_existing_website: false,
      aeo_tier: 'Infrastructure',
      allows_extra_locations: true, // v6.1: Can add extra locations
      features: [
        'CRM Enterprise (10 users, unlimited contacts)',
        'Web Enterprise (15+ pages)',
        'SEO Enterprise (Infrastructure AEO)',
        'Leads Captain included',
        'AI SMS text-back + Web Chat',
        'Domain name (1 year)',
        'Cloud hosting included',
        '3,000 SMS/month',
        '50 citations',
        'Weekly geogrid report',
        'Strategy review calls',
        'Extra locations available',
        'Save $2,501 on setup',
        'Save $378/mo vs individual',
      ],
    },
    invoice_description: 'Gold Enterprise Bundle',
    invoice_includes: '$7,999 setup + $1,499/mo. CRM + Website + SEO + Leads Captain + Extra locations',
    is_active: true,
    is_bundle: true,
    bundle_includes: {
      crm: 'crm_enterprise',
      web: 'web_enterprise',
      seo: 'seo_enterprise',
      leads_captain: true,
    },
    setup_savings: 2501, // $10,500 individual - $7,999 bundle
    monthly_savings: 378, // $1,877 individual - $1,499 bundle
  },
];

// =====================================================
// LEGACY GOLD BUNDLES - v6.0 (for existing subscriptions)
// =====================================================

export const GOLD_LEGACY_PLANS: Plan[] = [
  {
    id: 'gold_starter_legacy',
    name: 'Gold Starter (Legacy)',
    track: 'gold_legacy',
    tier: 'starter',
    type: 'bundle',
    setup_price: 0,
    monthly_price: 299,
    annual_price: 3050,
    description: 'Legacy Gold Starter (DISCONTINUED)',
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Gold Starter (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'gold_pro_legacy',
    name: 'Gold Pro (Legacy)',
    track: 'gold_legacy',
    tier: 'pro',
    type: 'bundle',
    setup_price: 0,
    monthly_price: 399,
    annual_price: 4070,
    description: 'Legacy Gold Pro (DISCONTINUED)',
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Gold Pro (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
  {
    id: 'gold_enterprise_legacy',
    name: 'Gold Enterprise (Legacy)',
    track: 'gold_legacy',
    tier: 'enterprise',
    type: 'bundle',
    setup_price: 0,
    monthly_price: 598,
    annual_price: 6100,
    description: 'Legacy Gold Enterprise (DISCONTINUED)',
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
      features: ['Legacy plan - no longer available'],
    },
    invoice_description: 'Gold Enterprise (Legacy)',
    invoice_includes: 'Legacy bundle',
    is_active: false,
    is_discontinued: true,
  },
];

// =====================================================
// ADD-ONS - v6.1
// =====================================================

export const ADDONS: AddOn[] = [
  {
    id: 'leads_captain_addon',
    name: 'Leads Captain',
    setup_price: 0,
    monthly_price: 79, // v6.1: Updated to $79/mo
    billing_type: 'recurring',
    description: 'AI SMS text-back, Web Chat, Scheduling integration',
    available_for: ['crm_*', 'gold_*'], // v6.1: Requires CRM or Gold
    not_available_for: ['web_*', 'seo_*', 'silver_*'],
    requires: ['crm_*', 'gold_*'],
  },
  {
    id: 'extra_user',
    name: 'Extra User',
    setup_price: 0,
    monthly_price: 10,
    billing_type: 'recurring',
    description: 'Additional user seat for CRM plans (Pro/Enterprise only)',
    available_for: ['crm_pro', 'crm_enterprise', 'gold_pro', 'gold_enterprise'],
    not_available_for: ['crm_starter', 'web_*', 'seo_*', 'silver_*', 'gold_starter'],
  },
  {
    id: 'web_extra_location',
    name: 'Extra Web Location',
    setup_price: 5000, // v6.1: $5,000 setup per location
    monthly_price: 99, // v6.1: $99/mo per location
    billing_type: 'setup_and_recurring',
    description: 'Additional website for another business location',
    available_for: ['web_enterprise', 'gold_enterprise'],
    not_available_for: ['web_starter', 'web_pro', 'crm_*', 'seo_*', 'gold_starter', 'gold_pro'],
    requires: ['web_enterprise', 'gold_enterprise'],
  },
  {
    id: 'seo_extra_location',
    name: 'Extra SEO Location',
    setup_price: 0, // v6.1: No setup fee
    monthly_price: 750, // v6.1: $750/mo per location
    billing_type: 'recurring',
    description: 'SEO management for additional business location',
    available_for: ['seo_enterprise', 'gold_enterprise'],
    not_available_for: ['seo_starter', 'seo_pro', 'crm_*', 'web_*', 'gold_starter', 'gold_pro'],
    requires: ['seo_enterprise', 'gold_enterprise'],
  },
  {
    id: 'background_video',
    name: 'Background Video Creation',
    setup_price: 99,
    monthly_price: 0,
    billing_type: 'one_time',
    description: 'Custom background video for hero section',
    available_for: ['web_*', 'gold_*'],
    not_available_for: ['crm_*', 'seo_*'],
  },
  {
    id: 'textual_page_update',
    name: 'Textual Page Update',
    setup_price: 29,
    monthly_price: 0,
    billing_type: 'one_time',
    description: 'Text changes beyond monthly allowance (per page)',
    available_for: ['web_*', 'gold_*'],
    not_available_for: ['crm_*', 'seo_*'],
  },
  {
    id: 'design_page_update',
    name: 'Design Page Update',
    setup_price: 69,
    monthly_price: 0,
    billing_type: 'one_time',
    description: 'Layout/design changes to existing page (per page)',
    available_for: ['web_*', 'gold_*'],
    not_available_for: ['crm_*', 'seo_*'],
  },
];

// =====================================================
// ALL PLANS COMBINED (v6.1 - active plans only)
// =====================================================

export const ALL_PLANS: Plan[] = [
  ...CRM_PLANS,
  ...WEB_PLANS,
  ...SEO_AEO_PLANS,
  ...GOLD_PLANS,
  ...LEADS_CAPTAIN_PLANS, // v6.1: Leads Captain is now active as add-on
];

// Legacy plans for existing subscriptions (includes discontinued)
export const LEGACY_PLANS: Plan[] = [
  ...SILVER_PLANS,
  ...GOLD_LEGACY_PLANS,
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
  // Also handle 'blue_*' -> 'crm_*' mapping for backwards compatibility
  let plan = ALL_PLANS_WITH_LEGACY.find(p => p.id === planId);
  if (!plan && planId.startsWith('blue_')) {
    const crmId = planId.replace('blue_', 'crm_');
    plan = ALL_PLANS_WITH_LEGACY.find(p => p.id === crmId);
  }
  return plan;
}

export function getActivePlanById(planId: string): Plan | undefined {
  let plan = ALL_PLANS.find(p => p.id === planId && p.is_active);
  if (!plan && planId.startsWith('blue_')) {
    const crmId = planId.replace('blue_', 'crm_');
    plan = ALL_PLANS.find(p => p.id === crmId && p.is_active);
  }
  return plan;
}

export function getPlansByTrack(track: PlanTrack | LegacyPlanTrack): Plan[] {
  // Handle 'blue' -> 'crm' mapping
  const mappedTrack = track === 'blue' ? 'crm' : track;
  return ALL_PLANS_WITH_LEGACY.filter(p => p.track === mappedTrack && p.is_active);
}

export function getActivePlansByTrack(track: PlanTrack): Plan[] {
  const mappedTrack = track === 'blue' ? 'crm' : track;
  return ALL_PLANS.filter(p => p.track === mappedTrack && p.is_active && !p.is_discontinued);
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
    crm: 'CRM',
    blue: 'CRM', // Legacy alias
    web: 'Website',
    seo_aeo: 'SEO/AEO',
    gold: 'Gold Bundle',
    // Legacy tracks
    leads_captain: 'Leads Captain',
    seo: 'SEO/AEO',
    silver: 'Silver Bundle (Discontinued)',
    gold_legacy: 'Gold Bundle (Legacy)',
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

// v6.1: Check if a plan is a bundle
export function isPlanBundle(planId: string): boolean {
  const plan = getPlanById(planId);
  return plan?.is_bundle === true;
}

// v6.1: Get total price (setup + first month)
export function getTotalFirstPayment(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;
  return plan.setup_price + plan.monthly_price;
}

// v6.1: Get bundle savings
export function getBundleSavings(planId: string): { setup: number; monthly: number } | null {
  const plan = getPlanById(planId);
  if (!plan || !plan.is_bundle) return null;
  return {
    setup: plan.setup_savings || 0,
    monthly: plan.monthly_savings || 0,
  };
}

// v6.1: Check if plan allows extra locations
export function allowsExtraLocations(planId: string): boolean {
  const plan = getPlanById(planId);
  return plan?.features.allows_extra_locations === true;
}
