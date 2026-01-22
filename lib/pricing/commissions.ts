// =====================================================
// TRADESCAPTAIN COMMISSION TRACKING - v6.0
// Complete commission rates for all plans
// Updated: January 2025
// Changes: Removed bundles, renamed SEO to SEO/AEO, added extra_user
// =====================================================
//
// Commission Structure:
// - Upfront: 50% of monthly price (after 2nd payment clears)
// - Recurring (Months 3-5): 10% of monthly price
// - Recurring (Months 6-14): 15% of monthly price (LOCKED)
// - Annual: 35% of annual price
//
// Retention Bonuses:
// - Month 3 Check-In: $15 (call logged + satisfaction audit sent)
// - Month 4 Retained: $25 (customer's 4th payment processed)
// - Month 6 Retained: $50 (customer still active + rate bumps to 15%)
// - Month 12 Retained: $100 (customer still active)
// - Total Possible: $190 per customer (monthly plans only)
//
// Payout Schedule: 1st and 15th of every month
// Same-Day Rule: Commission cannot be paid same day as client payment
// =====================================================

import type { PlanTrack, LegacyPlanTrack } from './plans';

export interface CommissionRate {
  plan_id: string;
  monthly_price: number;
  upfront_commission: number; // 50% - Paid after Month 2
  recurring_10_commission: number; // 10% per month (Months 3-5)
  recurring_15_commission: number; // 15% per month (Months 6-14)
  annual_price: number;
  annual_commission: number; // 35% of annual price
}

// =====================================================
// LEADS CAPTAIN COMMISSIONS - DISCONTINUED (v6.0)
// Now included in Blue Pro/Enterprise
// =====================================================

export const LEADS_CAPTAIN_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'leads_captain',
    monthly_price: 39,
    upfront_commission: 19.50, // 50%
    recurring_10_commission: 3.90, // 10% (Months 3-5)
    recurring_15_commission: 5.85, // 15% (Months 6-14)
    annual_price: 398,
    annual_commission: 139, // 35%
  },
];

// =====================================================
// BLUE CRM COMMISSIONS - v6.0
// Pro/Enterprise include AI SMS (formerly Leads Captain)
// =====================================================

export const BLUE_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'blue_starter',
    monthly_price: 49,
    upfront_commission: 24.50, // 50%
    recurring_10_commission: 4.90, // 10%
    recurring_15_commission: 7.35, // 15%
    annual_price: 500,
    annual_commission: 175, // 35%
  },
  {
    plan_id: 'blue_pro',
    monthly_price: 99,
    upfront_commission: 49.50, // 50%
    recurring_10_commission: 9.90, // 10%
    recurring_15_commission: 14.85, // 15%
    annual_price: 1010,
    annual_commission: 354, // 35%
  },
  {
    plan_id: 'blue_enterprise',
    monthly_price: 199,
    upfront_commission: 99.50, // 50%
    recurring_10_commission: 19.90, // 10%
    recurring_15_commission: 29.85, // 15%
    annual_price: 2030,
    annual_commission: 711, // 35%
  },
];

// =====================================================
// WEB COMMISSIONS - v6.0
// =====================================================

export const WEB_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'web_starter',
    monthly_price: 199,
    upfront_commission: 99.50, // 50%
    recurring_10_commission: 19.90, // 10%
    recurring_15_commission: 29.85, // 15%
    annual_price: 2030,
    annual_commission: 711, // 35%
  },
  {
    plan_id: 'web_pro',
    monthly_price: 299,
    upfront_commission: 149.50, // 50%
    recurring_10_commission: 29.90, // 10%
    recurring_15_commission: 44.85, // 15%
    annual_price: 3050,
    annual_commission: 1068, // 35%
  },
  {
    plan_id: 'web_enterprise',
    monthly_price: 499,
    upfront_commission: 249.50, // 50%
    recurring_10_commission: 49.90, // 10%
    recurring_15_commission: 74.85, // 15%
    annual_price: 5090,
    annual_commission: 1782, // 35%
  },
];

// =====================================================
// SEO/AEO COMMISSIONS - v6.0 (renamed from Local SEO)
// =====================================================

export const SEO_AEO_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'seo_aeo_starter',
    monthly_price: 99,
    upfront_commission: 49.50, // 50%
    recurring_10_commission: 9.90, // 10%
    recurring_15_commission: 14.85, // 15%
    annual_price: 1010,
    annual_commission: 354, // 35%
  },
  {
    plan_id: 'seo_aeo_pro',
    monthly_price: 199,
    upfront_commission: 99.50, // 50%
    recurring_10_commission: 19.90, // 10%
    recurring_15_commission: 29.85, // 15%
    annual_price: 2030,
    annual_commission: 711, // 35%
  },
  {
    plan_id: 'seo_aeo_enterprise',
    monthly_price: 299, // Updated from $249 to $299 per v6.0
    upfront_commission: 149.50, // 50%
    recurring_10_commission: 29.90, // 10%
    recurring_15_commission: 44.85, // 15%
    annual_price: 3050, // 15% discount
    annual_commission: 1068, // 35%
  },
];

// Legacy SEO_COMMISSIONS alias for backward compatibility
export const SEO_COMMISSIONS = SEO_AEO_COMMISSIONS;

// =====================================================
// SILVER BUNDLE COMMISSIONS - DISCONTINUED (v6.0)
// =====================================================

export const SILVER_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'silver_starter',
    monthly_price: 249,
    upfront_commission: 124.50, // 50%
    recurring_10_commission: 24.90, // 10%
    recurring_15_commission: 37.35, // 15%
    annual_price: 2540,
    annual_commission: 889, // 35%
  },
  {
    plan_id: 'silver_pro',
    monthly_price: 349,
    upfront_commission: 174.50, // 50%
    recurring_10_commission: 34.90, // 10%
    recurring_15_commission: 52.35, // 15%
    annual_price: 3560,
    annual_commission: 1246, // 35%
  },
  {
    plan_id: 'silver_enterprise',
    monthly_price: 499,
    upfront_commission: 249.50, // 50%
    recurring_10_commission: 49.90, // 10%
    recurring_15_commission: 74.85, // 15%
    annual_price: 5090,
    annual_commission: 1782, // 35%
  },
];

// =====================================================
// GOLD BUNDLE COMMISSIONS - DISCONTINUED (v6.0)
// =====================================================

export const GOLD_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'gold_starter',
    monthly_price: 299,
    upfront_commission: 149.50, // 50%
    recurring_10_commission: 29.90, // 10%
    recurring_15_commission: 44.85, // 15%
    annual_price: 3050,
    annual_commission: 1068, // 35%
  },
  {
    plan_id: 'gold_pro',
    monthly_price: 399,
    upfront_commission: 199.50, // 50%
    recurring_10_commission: 39.90, // 10%
    recurring_15_commission: 59.85, // 15%
    annual_price: 4070,
    annual_commission: 1425, // 35%
  },
  {
    plan_id: 'gold_enterprise',
    monthly_price: 598,
    upfront_commission: 299.00, // 50%
    recurring_10_commission: 59.80, // 10%
    recurring_15_commission: 89.70, // 15%
    annual_price: 6100,
    annual_commission: 2135, // 35%
  },
];

// =====================================================
// ADD-ON COMMISSIONS - v6.0
// =====================================================

export const ADDON_COMMISSIONS = {
  extra_user: {
    addon_id: 'extra_user',
    price: 10,
    commission: 5, // 50% upfront
    recurring_10_commission: 1, // 10%
    recurring_15_commission: 1.50, // 15%
    billing_type: 'recurring' as const,
    notes: 'Additional user seat for Blue CRM plans. Same commission structure as plans.',
  },
  background_video: {
    addon_id: 'background_video',
    price: 99,
    commission: 35, // Flat rate
    billing_type: 'one_time' as const,
    notes: 'Paid when customer payment clears.',
  },
  textual_page_update: {
    addon_id: 'textual_page_update',
    price: 29,
    commission: 10, // Flat rate
    billing_type: 'one_time' as const,
    notes: 'Per-page basis.',
  },
  design_page_update: {
    addon_id: 'design_page_update',
    price: 69,
    commission: 24, // Flat rate
    billing_type: 'one_time' as const,
    notes: 'Per-page basis.',
  },
};

// =====================================================
// REFERRAL BONUS
// =====================================================

export const REFERRAL_BONUS = {
  amount: 50,
  requirements: [
    'Referring customer must be active (not cancelled)',
    'New customer must complete their 2nd payment',
    'Referral must be documented in CRM at time of sale',
  ],
  notes: 'Bonus is IN ADDITION to normal commission on the new sale.',
};

// =====================================================
// RETENTION BONUSES - v6.0
// (For monthly billing only)
// =====================================================

export interface RetentionBonus {
  month: number;
  bonus_amount: number;
  requirement: string;
}

export const RETENTION_BONUSES: RetentionBonus[] = [
  { month: 3, bonus_amount: 15, requirement: 'Call logged + satisfaction audit sent' },
  { month: 4, bonus_amount: 25, requirement: "Customer's 4th payment processed" },
  { month: 6, bonus_amount: 50, requirement: 'Customer still active + rate bumps to 15%' },
  { month: 12, bonus_amount: 100, requirement: 'Customer still active at Month 12' },
];

export const RETENTION_BONUS_TOTAL = 190; // Max possible per customer

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Active commissions only (v6.0 products)
export const ALL_COMMISSIONS: CommissionRate[] = [
  ...BLUE_COMMISSIONS,
  ...WEB_COMMISSIONS,
  ...SEO_AEO_COMMISSIONS,
];

// Legacy commissions (discontinued products - for existing subscriptions)
export const LEGACY_COMMISSIONS: CommissionRate[] = [
  ...LEADS_CAPTAIN_COMMISSIONS,
  ...SILVER_COMMISSIONS,
  ...GOLD_COMMISSIONS,
];

// All commissions including legacy (for lookups)
export const ALL_COMMISSIONS_WITH_LEGACY: CommissionRate[] = [
  ...ALL_COMMISSIONS,
  ...LEGACY_COMMISSIONS,
];

export function getCommissionRate(planId: string): CommissionRate | undefined {
  // Search all commissions including legacy for backward compatibility
  return ALL_COMMISSIONS_WITH_LEGACY.find(c => c.plan_id === planId);
}

export function getActiveCommissionRate(planId: string): CommissionRate | undefined {
  return ALL_COMMISSIONS.find(c => c.plan_id === planId);
}

export function getCommissionsByTrack(track: PlanTrack | LegacyPlanTrack): CommissionRate[] {
  switch (track) {
    // Active tracks
    case 'blue': return BLUE_COMMISSIONS;
    case 'web': return WEB_COMMISSIONS;
    case 'seo_aeo': return SEO_AEO_COMMISSIONS;
    // Legacy tracks
    case 'leads_captain': return LEADS_CAPTAIN_COMMISSIONS;
    case 'seo': return SEO_AEO_COMMISSIONS; // Redirects to new SEO/AEO
    case 'silver': return SILVER_COMMISSIONS;
    case 'gold': return GOLD_COMMISSIONS;
    default: return [];
  }
}

/**
 * Calculate recurring commission based on month number
 * Months 3-5: 10%
 * Months 6-14: 15% (LOCKED)
 */
export function getRecurringCommissionForMonth(rate: CommissionRate, month: number): number {
  if (month < 3 || month > 14) return 0;
  if (month <= 5) return rate.recurring_10_commission;
  return rate.recurring_15_commission;
}

export function calculateUpgradeCommission(
  oldPlanId: string,
  newPlanId: string,
  monthsSinceOriginalSale: number
): { upfront: number; remainingRecurring: number; total: number } | null {
  const oldRate = getCommissionRate(oldPlanId);
  const newRate = getCommissionRate(newPlanId);

  if (!oldRate || !newRate) return null;
  if (newRate.monthly_price <= oldRate.monthly_price) return null; // Not an upgrade

  const priceDifference = newRate.monthly_price - oldRate.monthly_price;

  // Upfront on difference: 50%
  const upfront = Math.round(priceDifference * 0.5 * 100) / 100;

  // Calculate remaining recurring based on where we are in the commission period
  let remainingRecurring = 0;
  for (let m = monthsSinceOriginalSale + 1; m <= 14; m++) {
    const recurringRate = m <= 5 ? 0.10 : 0.15;
    remainingRecurring += priceDifference * recurringRate;
  }
  remainingRecurring = Math.round(remainingRecurring * 100) / 100;

  return {
    upfront,
    remainingRecurring,
    total: Math.round((upfront + remainingRecurring) * 100) / 100,
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

  // Monthly: upfront + 3 months at 10% + 9 months at 15%
  const upfront = rate.upfront_commission;
  const recurring10 = rate.recurring_10_commission * 3; // Months 3-5
  const recurring15 = rate.recurring_15_commission * 9; // Months 6-14
  const recurringTotal = recurring10 + recurring15;

  if (includeRetention) {
    return Math.round((upfront + recurringTotal + RETENTION_BONUS_TOTAL) * 100) / 100;
  }

  return Math.round((upfront + recurringTotal) * 100) / 100;
}

// =====================================================
// COMMISSION PAYMENT SCHEDULE - v6.0
// =====================================================

export interface CommissionScheduleEntry {
  month: number;
  type: 'upfront' | 'recurring_10' | 'recurring_15' | 'retention' | 'annual';
  amount: number;
  description: string;
  condition: string;
}

export function generateCommissionSchedule(
  planId: string,
  billingFrequency: 'monthly' | 'annual'
): CommissionScheduleEntry[] {
  const rate = getCommissionRate(planId);
  if (!rate) return [];

  const schedule: CommissionScheduleEntry[] = [];

  if (billingFrequency === 'annual') {
    schedule.push({
      month: 1,
      type: 'annual',
      amount: rate.annual_commission,
      description: `Annual commission (35% of $${rate.annual_price})`,
      condition: 'Payment clears',
    });
    return schedule;
  }

  // Monthly schedule
  // Upfront (after Month 2)
  schedule.push({
    month: 2,
    type: 'upfront',
    amount: rate.upfront_commission,
    description: `Upfront commission (50% of $${rate.monthly_price})`,
    condition: 'After Month 2 payment clears',
  });

  // Recurring Months 3-5 at 10%
  for (let m = 3; m <= 5; m++) {
    schedule.push({
      month: m,
      type: 'recurring_10',
      amount: rate.recurring_10_commission,
      description: `Recurring commission (10% of $${rate.monthly_price})`,
      condition: `Month ${m} payment clears`,
    });
  }

  // Recurring Months 6-14 at 15% (LOCKED)
  for (let m = 6; m <= 14; m++) {
    schedule.push({
      month: m,
      type: 'recurring_15',
      amount: rate.recurring_15_commission,
      description: `Recurring commission (15% of $${rate.monthly_price}) - LOCKED`,
      condition: `Month ${m} payment clears`,
    });
  }

  // Retention bonuses
  for (const bonus of RETENTION_BONUSES) {
    schedule.push({
      month: bonus.month,
      type: 'retention',
      amount: bonus.bonus_amount,
      description: `Retention bonus ($${bonus.bonus_amount})`,
      condition: bonus.requirement,
    });
  }

  return schedule.sort((a, b) => a.month - b.month);
}

// =====================================================
// MULTI-LOCATION PRICING - v6.0
// =====================================================

export const MULTI_LOCATION_DISCOUNTS = {
  '2-4': 0.10, // 10% off additional locations
  '5-9': 0.15, // 15% off additional locations
  '10+': 'custom', // Custom pricing - contact sales
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
  // 10+ requires custom pricing

  const additionalLocations = locationCount - 1;
  const discountedPrice = basePrice * (1 - discountRate);
  const total = basePrice + discountedPrice * additionalLocations;

  return {
    perLocation: Math.round(discountedPrice * 100) / 100,
    total: Math.round(total * 100) / 100,
    discount: discountRate,
  };
}
