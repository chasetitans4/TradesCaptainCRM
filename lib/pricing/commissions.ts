// =====================================================
// TRADESCAPTAIN COMMISSION TRACKING - v6.1
// Complete commission rates for all plans
// Updated: January 2026
// Changes: New commission structure with setup fees, 40%/50% upfront, 15% recurring
// =====================================================
//
// Commission Structure (v6.1):
// - CRM Products: 50% upfront (on setup fee + first month)
// - All Other Products: 40% upfront (on setup fee + first month)
// - All Products: 15% recurring (monthly)
//
// Qualification Periods:
// - Upfront: 30 days after payment
// - Recurring: 60 days after payment
//
// Bonuses:
// - Monthly: 5% of monthly revenue if 10+ qualified sales
// - Yearly: 5% of annual revenue, cutoff Oct 15, paid Nov 1
//
// Payout Schedule: 15th of every month
// =====================================================

import type { PlanTrack, LegacyPlanTrack } from './plans';

// v6.1 Commission rates
export const COMMISSION_RATES = {
  CRM_UPFRONT: 0.50, // 50% for CRM products
  OTHER_UPFRONT: 0.40, // 40% for all other products
  RECURRING: 0.15, // 15% for all products
  UPFRONT_QUALIFICATION_DAYS: 30,
  RECURRING_QUALIFICATION_DAYS: 60,
  MONTHLY_BONUS_RATE: 0.05, // 5%
  MONTHLY_BONUS_MIN_SALES: 10,
  YEARLY_BONUS_RATE: 0.05, // 5%
  YEARLY_CUTOFF_MONTH: 10, // October
  YEARLY_CUTOFF_DAY: 15,
  YEARLY_PAYOUT_MONTH: 11, // November
  YEARLY_PAYOUT_DAY: 1,
  PAYOUT_DAY: 15,
};

export interface CommissionRate {
  plan_id: string;
  setup_price: number; // v6.1: One-time setup fee
  monthly_price: number;
  upfront_rate: number; // v6.1: 50% for CRM, 40% for others
  upfront_commission: number; // Calculated: (setup + first month) * rate
  recurring_commission: number; // v6.1: 15% of monthly
  annual_price: number;
  annual_commission: number; // v6.1: (setup + annual) * rate
  is_crm: boolean; // v6.1: true for CRM products (50% upfront)
}

// =====================================================
// LEADS CAPTAIN COMMISSIONS - v6.1
// $79/mo add-on, requires CRM or Gold
// =====================================================

export const LEADS_CAPTAIN_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'leads_captain',
    setup_price: 0,
    monthly_price: 79,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 31.60, // 79 * 0.40
    recurring_commission: 11.85, // 79 * 0.15
    annual_price: 806,
    annual_commission: 322.40, // 806 * 0.40
    is_crm: false,
  },
];

// =====================================================
// CRM COMMISSIONS - v6.1 (formerly Blue)
// 50% upfront, 15% recurring
// =====================================================

export const CRM_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'crm_starter',
    setup_price: 0,
    monthly_price: 39,
    upfront_rate: COMMISSION_RATES.CRM_UPFRONT, // 50%
    upfront_commission: 19.50, // 39 * 0.50
    recurring_commission: 5.85, // 39 * 0.15
    annual_price: 398,
    annual_commission: 199, // 398 * 0.50
    is_crm: true,
  },
  {
    plan_id: 'crm_pro',
    setup_price: 0,
    monthly_price: 99,
    upfront_rate: COMMISSION_RATES.CRM_UPFRONT, // 50%
    upfront_commission: 49.50, // 99 * 0.50
    recurring_commission: 14.85, // 99 * 0.15
    annual_price: 1010,
    annual_commission: 505, // 1010 * 0.50
    is_crm: true,
  },
  {
    plan_id: 'crm_enterprise',
    setup_price: 0,
    monthly_price: 199,
    upfront_rate: COMMISSION_RATES.CRM_UPFRONT, // 50%
    upfront_commission: 99.50, // 199 * 0.50
    recurring_commission: 29.85, // 199 * 0.15
    annual_price: 2030,
    annual_commission: 1015, // 2030 * 0.50
    is_crm: true,
  },
];

// Legacy alias for backwards compatibility
export const BLUE_COMMISSIONS = CRM_COMMISSIONS;

// =====================================================
// WEB COMMISSIONS - v6.1
// Setup fee + monthly, 40% upfront, 15% recurring
// =====================================================

export const WEB_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'web_starter',
    setup_price: 2500,
    monthly_price: 49,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 1019.60, // (2500 + 49) * 0.40
    recurring_commission: 7.35, // 49 * 0.15
    annual_price: 500,
    annual_commission: 1200, // (2500 + 500) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'web_pro',
    setup_price: 5000,
    monthly_price: 79,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 2031.60, // (5000 + 79) * 0.40
    recurring_commission: 11.85, // 79 * 0.15
    annual_price: 806,
    annual_commission: 2322.40, // (5000 + 806) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'web_enterprise',
    setup_price: 10000,
    monthly_price: 99,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 4039.60, // (10000 + 99) * 0.40
    recurring_commission: 14.85, // 99 * 0.15
    annual_price: 1010,
    annual_commission: 4404, // (10000 + 1010) * 0.40
    is_crm: false,
  },
];

// =====================================================
// SEO/AEO COMMISSIONS - v6.1
// Setup fee + monthly, 40% upfront, 15% recurring
// =====================================================

export const SEO_AEO_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'seo_starter',
    setup_price: 100,
    monthly_price: 300,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 160, // (100 + 300) * 0.40
    recurring_commission: 45, // 300 * 0.15
    annual_price: 3060,
    annual_commission: 1264, // (100 + 3060) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'seo_pro',
    setup_price: 250,
    monthly_price: 500,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 300, // (250 + 500) * 0.40
    recurring_commission: 75, // 500 * 0.15
    annual_price: 5100,
    annual_commission: 2140, // (250 + 5100) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'seo_enterprise',
    setup_price: 500,
    monthly_price: 1500,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 800, // (500 + 1500) * 0.40
    recurring_commission: 225, // 1500 * 0.15
    annual_price: 15300,
    annual_commission: 6320, // (500 + 15300) * 0.40
    is_crm: false,
  },
];

// Legacy SEO_COMMISSIONS alias for backward compatibility
export const SEO_COMMISSIONS = SEO_AEO_COMMISSIONS;

// =====================================================
// SILVER BUNDLE COMMISSIONS - LEGACY (discontinued)
// =====================================================

export const SILVER_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'silver_starter',
    setup_price: 0,
    monthly_price: 249,
    upfront_rate: 0.50,
    upfront_commission: 124.50,
    recurring_commission: 37.35,
    annual_price: 2540,
    annual_commission: 889,
    is_crm: false,
  },
  {
    plan_id: 'silver_pro',
    setup_price: 0,
    monthly_price: 349,
    upfront_rate: 0.50,
    upfront_commission: 174.50,
    recurring_commission: 52.35,
    annual_price: 3560,
    annual_commission: 1246,
    is_crm: false,
  },
  {
    plan_id: 'silver_enterprise',
    setup_price: 0,
    monthly_price: 499,
    upfront_rate: 0.50,
    upfront_commission: 249.50,
    recurring_commission: 74.85,
    annual_price: 5090,
    annual_commission: 1782,
    is_crm: false,
  },
];

// =====================================================
// GOLD BUNDLE COMMISSIONS - v6.1 (ACTIVE)
// Setup fee + monthly, 40% upfront, 15% recurring
// =====================================================

export const GOLD_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'gold_starter',
    setup_price: 1999,
    monthly_price: 399,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 959.20, // (1999 + 399) * 0.40
    recurring_commission: 59.85, // 399 * 0.15
    annual_price: 4070,
    annual_commission: 2427.60, // (1999 + 4070) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'gold_pro',
    setup_price: 3999,
    monthly_price: 649,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 1859.20, // (3999 + 649) * 0.40
    recurring_commission: 97.35, // 649 * 0.15
    annual_price: 6620,
    annual_commission: 4247.60, // (3999 + 6620) * 0.40
    is_crm: false,
  },
  {
    plan_id: 'gold_enterprise',
    setup_price: 7999,
    monthly_price: 1499,
    upfront_rate: COMMISSION_RATES.OTHER_UPFRONT, // 40%
    upfront_commission: 3799.20, // (7999 + 1499) * 0.40
    recurring_commission: 224.85, // 1499 * 0.15
    annual_price: 15290,
    annual_commission: 9315.60, // (7999 + 15290) * 0.40
    is_crm: false,
  },
];

// =====================================================
// GOLD LEGACY COMMISSIONS - v6.0 (for existing subscriptions)
// =====================================================

export const GOLD_LEGACY_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'gold_starter_legacy',
    setup_price: 0,
    monthly_price: 299,
    upfront_rate: 0.50,
    upfront_commission: 149.50,
    recurring_commission: 44.85,
    annual_price: 3050,
    annual_commission: 1068,
    is_crm: false,
  },
  {
    plan_id: 'gold_pro_legacy',
    setup_price: 0,
    monthly_price: 399,
    upfront_rate: 0.50,
    upfront_commission: 199.50,
    recurring_commission: 59.85,
    annual_price: 4070,
    annual_commission: 1425,
    is_crm: false,
  },
  {
    plan_id: 'gold_enterprise_legacy',
    setup_price: 0,
    monthly_price: 598,
    upfront_rate: 0.50,
    upfront_commission: 299.00,
    recurring_commission: 89.70,
    annual_price: 6100,
    annual_commission: 2135,
    is_crm: false,
  },
];

// =====================================================
// ADD-ON COMMISSIONS - v6.1
// =====================================================

export const ADDON_COMMISSIONS = {
  leads_captain_addon: {
    addon_id: 'leads_captain_addon',
    setup_price: 0,
    monthly_price: 79,
    upfront_commission: 31.60, // 79 * 0.40
    recurring_commission: 11.85, // 79 * 0.15
    billing_type: 'recurring' as const,
    notes: 'AI SMS text-back, Web Chat, Scheduling. Requires CRM or Gold bundle.',
  },
  extra_user: {
    addon_id: 'extra_user',
    setup_price: 0,
    monthly_price: 10,
    upfront_commission: 5, // 10 * 0.50 (CRM rate)
    recurring_commission: 1.50, // 10 * 0.15
    billing_type: 'recurring' as const,
    notes: 'Additional user seat for CRM plans (Pro/Enterprise only).',
  },
  web_extra_location: {
    addon_id: 'web_extra_location',
    setup_price: 5000,
    monthly_price: 99,
    upfront_commission: 2039.60, // (5000 + 99) * 0.40
    recurring_commission: 14.85, // 99 * 0.15
    billing_type: 'setup_and_recurring' as const,
    notes: 'Additional website location. Requires Web Enterprise or Gold Enterprise.',
  },
  seo_extra_location: {
    addon_id: 'seo_extra_location',
    setup_price: 0,
    monthly_price: 750,
    upfront_commission: 300, // 750 * 0.40
    recurring_commission: 112.50, // 750 * 0.15
    billing_type: 'recurring' as const,
    notes: 'Additional SEO location. Requires SEO Enterprise or Gold Enterprise.',
  },
  background_video: {
    addon_id: 'background_video',
    setup_price: 99,
    monthly_price: 0,
    upfront_commission: 39.60, // 99 * 0.40
    recurring_commission: 0,
    billing_type: 'one_time' as const,
    notes: 'Custom background video for hero section.',
  },
  textual_page_update: {
    addon_id: 'textual_page_update',
    setup_price: 29,
    monthly_price: 0,
    upfront_commission: 11.60, // 29 * 0.40
    recurring_commission: 0,
    billing_type: 'one_time' as const,
    notes: 'Text changes beyond monthly allowance (per page).',
  },
  design_page_update: {
    addon_id: 'design_page_update',
    setup_price: 69,
    monthly_price: 0,
    upfront_commission: 27.60, // 69 * 0.40
    recurring_commission: 0,
    billing_type: 'one_time' as const,
    notes: 'Layout/design changes to existing page (per page).',
  },
};

// =====================================================
// REFERRAL BONUS
// =====================================================

export const REFERRAL_BONUS = {
  amount: 50,
  requirements: [
    'Referring customer must be active (not cancelled)',
    'New customer must complete qualification period (30 days)',
    'Referral must be documented in CRM at time of sale',
  ],
  notes: 'Bonus is IN ADDITION to normal commission on the new sale.',
};

// =====================================================
// BONUS STRUCTURE - v6.1
// Monthly and Yearly bonuses based on performance
// =====================================================

export interface PerformanceBonus {
  type: 'monthly' | 'yearly';
  rate: number;
  threshold?: number; // Minimum sales for monthly bonus
  cutoff_date?: string; // For yearly bonus
  payout_date?: string; // For yearly bonus
  description: string;
}

export const PERFORMANCE_BONUSES: PerformanceBonus[] = [
  {
    type: 'monthly',
    rate: COMMISSION_RATES.MONTHLY_BONUS_RATE, // 5%
    threshold: COMMISSION_RATES.MONTHLY_BONUS_MIN_SALES, // 10 qualified sales
    description: '5% of monthly revenue if 10+ qualified sales in the month',
  },
  {
    type: 'yearly',
    rate: COMMISSION_RATES.YEARLY_BONUS_RATE, // 5%
    cutoff_date: 'October 15',
    payout_date: 'November 1',
    description: '5% of annual revenue, cutoff October 15, paid November 1',
  },
];

// Legacy retention bonuses (for backwards compatibility)
export interface RetentionBonus {
  month: number;
  bonus_amount: number;
  requirement: string;
}

export const RETENTION_BONUSES: RetentionBonus[] = [
  { month: 3, bonus_amount: 15, requirement: 'Call logged + satisfaction audit sent' },
  { month: 4, bonus_amount: 25, requirement: "Customer's 4th payment processed" },
  { month: 6, bonus_amount: 50, requirement: 'Customer still active' },
  { month: 12, bonus_amount: 100, requirement: 'Customer still active at Month 12' },
];

export const RETENTION_BONUS_TOTAL = 190; // Max possible per customer (legacy)

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Active commissions only (v6.1 products)
export const ALL_COMMISSIONS: CommissionRate[] = [
  ...CRM_COMMISSIONS,
  ...WEB_COMMISSIONS,
  ...SEO_AEO_COMMISSIONS,
  ...GOLD_COMMISSIONS,
  ...LEADS_CAPTAIN_COMMISSIONS,
];

// Legacy commissions (discontinued products - for existing subscriptions)
export const LEGACY_COMMISSIONS: CommissionRate[] = [
  ...SILVER_COMMISSIONS,
  ...GOLD_LEGACY_COMMISSIONS,
];

// All commissions including legacy (for lookups)
export const ALL_COMMISSIONS_WITH_LEGACY: CommissionRate[] = [
  ...ALL_COMMISSIONS,
  ...LEGACY_COMMISSIONS,
];

export function getCommissionRate(planId: string): CommissionRate | undefined {
  // Search all commissions including legacy for backward compatibility
  // Also handle 'blue_*' -> 'crm_*' mapping
  let rate = ALL_COMMISSIONS_WITH_LEGACY.find(c => c.plan_id === planId);
  if (!rate && planId.startsWith('blue_')) {
    const crmId = planId.replace('blue_', 'crm_');
    rate = ALL_COMMISSIONS_WITH_LEGACY.find(c => c.plan_id === crmId);
  }
  return rate;
}

export function getActiveCommissionRate(planId: string): CommissionRate | undefined {
  let rate = ALL_COMMISSIONS.find(c => c.plan_id === planId);
  if (!rate && planId.startsWith('blue_')) {
    const crmId = planId.replace('blue_', 'crm_');
    rate = ALL_COMMISSIONS.find(c => c.plan_id === crmId);
  }
  return rate;
}

export function getCommissionsByTrack(track: PlanTrack | LegacyPlanTrack): CommissionRate[] {
  switch (track) {
    // Active tracks
    case 'crm':
    case 'blue': return CRM_COMMISSIONS;
    case 'web': return WEB_COMMISSIONS;
    case 'seo_aeo': return SEO_AEO_COMMISSIONS;
    case 'gold': return GOLD_COMMISSIONS;
    // Legacy tracks
    case 'leads_captain': return LEADS_CAPTAIN_COMMISSIONS;
    case 'seo': return SEO_AEO_COMMISSIONS;
    case 'silver': return SILVER_COMMISSIONS;
    case 'gold_legacy': return GOLD_LEGACY_COMMISSIONS;
    default: return [];
  }
}

/**
 * v6.1: Calculate recurring commission (15% flat rate)
 */
export function getRecurringCommission(rate: CommissionRate): number {
  return rate.recurring_commission;
}

/**
 * v6.1: Calculate upfront commission based on plan type
 * CRM products: 50% of (setup + first month)
 * Other products: 40% of (setup + first month)
 */
export function calculateUpfrontCommission(
  setupPrice: number,
  monthlyPrice: number,
  isCRM: boolean
): number {
  const rate = isCRM ? COMMISSION_RATES.CRM_UPFRONT : COMMISSION_RATES.OTHER_UPFRONT;
  return Math.round((setupPrice + monthlyPrice) * rate * 100) / 100;
}

export function calculateUpgradeCommission(
  oldPlanId: string,
  newPlanId: string,
  _monthsSinceOriginalSale: number // Unused in v6.1 but kept for API compatibility
): { upfront: number; remainingRecurring: number; total: number } | null {
  const oldRate = getCommissionRate(oldPlanId);
  const newRate = getCommissionRate(newPlanId);

  if (!oldRate || !newRate) return null;

  const oldTotal = oldRate.setup_price + oldRate.monthly_price;
  const newTotal = newRate.setup_price + newRate.monthly_price;

  if (newTotal <= oldTotal) return null; // Not an upgrade

  const priceDifference = newRate.monthly_price - oldRate.monthly_price;
  const setupDifference = newRate.setup_price - oldRate.setup_price;

  // v6.1: Upfront on difference using appropriate rate
  const upfrontRate = newRate.is_crm ? COMMISSION_RATES.CRM_UPFRONT : COMMISSION_RATES.OTHER_UPFRONT;
  const upfront = Math.round((setupDifference + priceDifference) * upfrontRate * 100) / 100;

  // v6.1: Ongoing recurring commission difference (15% flat)
  const recurringDiff = Math.round(priceDifference * COMMISSION_RATES.RECURRING * 100) / 100;

  return {
    upfront,
    remainingRecurring: recurringDiff, // Per month increase
    total: Math.round((upfront + recurringDiff * 12) * 100) / 100, // First year estimate
  };
}

export function calculateRetentionBonus(monthNumber: number): number {
  const bonus = RETENTION_BONUSES.find(b => b.month === monthNumber);
  return bonus?.bonus_amount || 0;
}

export function calculateTotalPotentialCommission(
  planId: string,
  billingFrequency: 'monthly' | 'annual',
  includeRetention: boolean = true
): number {
  const rate = getCommissionRate(planId);
  if (!rate) return 0;

  if (billingFrequency === 'annual') {
    return rate.annual_commission;
  }

  // v6.1: Upfront + 12 months recurring (15% flat)
  const upfront = rate.upfront_commission;
  const recurringYear = rate.recurring_commission * 12;

  if (includeRetention) {
    return Math.round((upfront + recurringYear + RETENTION_BONUS_TOTAL) * 100) / 100;
  }

  return Math.round((upfront + recurringYear) * 100) / 100;
}

/**
 * v6.1: Calculate monthly performance bonus
 */
export function calculateMonthlyBonus(
  monthlyRevenue: number,
  qualifiedSalesCount: number
): number {
  if (qualifiedSalesCount < COMMISSION_RATES.MONTHLY_BONUS_MIN_SALES) {
    return 0;
  }
  return Math.round(monthlyRevenue * COMMISSION_RATES.MONTHLY_BONUS_RATE * 100) / 100;
}

/**
 * v6.1: Calculate yearly performance bonus
 */
export function calculateYearlyBonus(annualRevenue: number): number {
  return Math.round(annualRevenue * COMMISSION_RATES.YEARLY_BONUS_RATE * 100) / 100;
}

// =====================================================
// COMMISSION PAYMENT SCHEDULE - v6.1
// =====================================================

export interface CommissionScheduleEntry {
  month: number;
  type: 'upfront' | 'recurring' | 'retention' | 'annual';
  amount: number;
  description: string;
  condition: string;
  qualification_days: number;
}

export function generateCommissionSchedule(
  planId: string,
  billingFrequency: 'monthly' | 'annual'
): CommissionScheduleEntry[] {
  const rate = getCommissionRate(planId);
  if (!rate) return [];

  const schedule: CommissionScheduleEntry[] = [];
  const upfrontPercent = rate.is_crm ? '50%' : '40%';

  if (billingFrequency === 'annual') {
    const setupDesc = rate.setup_price > 0 ? ` + $${rate.setup_price} setup` : '';
    schedule.push({
      month: 1,
      type: 'annual',
      amount: rate.annual_commission,
      description: `Annual commission (${upfrontPercent} of $${rate.annual_price}${setupDesc})`,
      condition: `Payment clears + ${COMMISSION_RATES.UPFRONT_QUALIFICATION_DAYS} day qualification`,
      qualification_days: COMMISSION_RATES.UPFRONT_QUALIFICATION_DAYS,
    });
    return schedule;
  }

  // Monthly schedule - v6.1: Upfront after qualification period
  const setupDesc = rate.setup_price > 0 ? `$${rate.setup_price} setup + ` : '';
  schedule.push({
    month: 1,
    type: 'upfront',
    amount: rate.upfront_commission,
    description: `Upfront commission (${upfrontPercent} of ${setupDesc}$${rate.monthly_price})`,
    condition: `First payment + ${COMMISSION_RATES.UPFRONT_QUALIFICATION_DAYS} day qualification`,
    qualification_days: COMMISSION_RATES.UPFRONT_QUALIFICATION_DAYS,
  });

  // v6.1: Recurring at 15% flat rate starting Month 2
  for (let m = 2; m <= 12; m++) {
    schedule.push({
      month: m,
      type: 'recurring',
      amount: rate.recurring_commission,
      description: `Recurring commission (15% of $${rate.monthly_price})`,
      condition: `Month ${m} payment + ${COMMISSION_RATES.RECURRING_QUALIFICATION_DAYS} day qualification`,
      qualification_days: COMMISSION_RATES.RECURRING_QUALIFICATION_DAYS,
    });
  }

  // Retention bonuses (legacy, still supported)
  for (const bonus of RETENTION_BONUSES) {
    schedule.push({
      month: bonus.month,
      type: 'retention',
      amount: bonus.bonus_amount,
      description: `Retention bonus ($${bonus.bonus_amount})`,
      condition: bonus.requirement,
      qualification_days: 0,
    });
  }

  return schedule.sort((a, b) => a.month - b.month);
}

// =====================================================
// EXTRA LOCATION PRICING - v6.1
// =====================================================

export const EXTRA_LOCATION_PRICING = {
  web: {
    setup_price: 5000,
    monthly_price: 99,
    requires: ['web_enterprise', 'gold_enterprise'],
  },
  seo: {
    setup_price: 0,
    monthly_price: 750,
    requires: ['seo_enterprise', 'gold_enterprise'],
  },
};

export function calculateExtraLocationCommission(
  locationType: 'web' | 'seo',
  locationCount: number
): { upfront: number; monthly: number; total_first_year: number } {
  const pricing = EXTRA_LOCATION_PRICING[locationType];
  const upfrontRate = COMMISSION_RATES.OTHER_UPFRONT; // 40%
  const recurringRate = COMMISSION_RATES.RECURRING; // 15%

  const upfront = (pricing.setup_price + pricing.monthly_price) * upfrontRate * locationCount;
  const monthly = pricing.monthly_price * recurringRate * locationCount;
  const totalFirstYear = upfront + (monthly * 11); // First month included in upfront

  return {
    upfront: Math.round(upfront * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    total_first_year: Math.round(totalFirstYear * 100) / 100,
  };
}

// Legacy multi-location discounts (for backwards compatibility)
export const MULTI_LOCATION_DISCOUNTS = {
  '2-4': 0.10,
  '5-9': 0.15,
  '10+': 'custom',
};

export function calculateMultiLocationPrice(
  basePrice: number,
  locationCount: number
): { perLocation: number; total: number; discount: number } {
  if (locationCount <= 1) {
    return { perLocation: basePrice, total: basePrice, discount: 0 };
  }

  let discountRate = 0;
  if (locationCount >= 2 && locationCount <= 4) {
    discountRate = 0.10;
  } else if (locationCount >= 5 && locationCount <= 9) {
    discountRate = 0.15;
  }

  const additionalLocations = locationCount - 1;
  const discountedPrice = basePrice * (1 - discountRate);
  const total = basePrice + discountedPrice * additionalLocations;

  return {
    perLocation: Math.round(discountedPrice * 100) / 100,
    total: Math.round(total * 100) / 100,
    discount: discountRate,
  };
}
