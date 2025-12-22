// =====================================================
// TRADESCAPTAIN COMMISSION TRACKING - v5
// Complete commission rates for all plans
// =====================================================

import type { PlanTrack, PlanTier, PlanType } from './plans';

export interface CommissionRate {
  plan_id: string;
  monthly_price: number;
  upfront_commission: number; // Paid after Month 2
  recurring_commission: number; // Per month, Months 3-14
  max_recurring_total: number; // 12 months of recurring
  max_with_retention: number; // Including retention bonuses
  annual_price: number;
  annual_commission: number; // 35% of annual price
}

// =====================================================
// BLUE PLAN COMMISSIONS (Monthly)
// =====================================================

export const BLUE_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'blue_starter',
    monthly_price: 49,
    upfront_commission: 25, // 50% rounded
    recurring_commission: 4.90, // 10%
    max_recurring_total: 58.80, // 12 months
    max_with_retention: 273.80,
    annual_price: 441,
    annual_commission: 154, // 35%
  },
  {
    plan_id: 'blue_pro',
    monthly_price: 99,
    upfront_commission: 50,
    recurring_commission: 9.90,
    max_recurring_total: 118.80,
    max_with_retention: 358.80,
    annual_price: 891,
    annual_commission: 312,
  },
  {
    plan_id: 'blue_enterprise',
    monthly_price: 199,
    upfront_commission: 100,
    recurring_commission: 19.90,
    max_recurring_total: 238.80,
    max_with_retention: 528.80,
    annual_price: 1791,
    annual_commission: 627,
  },
  {
    plan_id: 'blue_starter_teams',
    monthly_price: 149,
    upfront_commission: 75,
    recurring_commission: 14.90,
    max_recurring_total: 178.80,
    max_with_retention: 443.80,
    annual_price: 1341,
    annual_commission: 469,
  },
  {
    plan_id: 'blue_pro_teams',
    monthly_price: 199,
    upfront_commission: 100,
    recurring_commission: 19.90,
    max_recurring_total: 238.80,
    max_with_retention: 528.80,
    annual_price: 1791,
    annual_commission: 627,
  },
  {
    plan_id: 'blue_enterprise_teams',
    monthly_price: 399,
    upfront_commission: 200,
    recurring_commission: 39.90,
    max_recurring_total: 478.80,
    max_with_retention: 868.80,
    annual_price: 3591,
    annual_commission: 1257,
  },
];

// =====================================================
// WEB PLAN COMMISSIONS (Monthly)
// =====================================================

export const WEB_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'web_starter',
    monthly_price: 149,
    upfront_commission: 75,
    recurring_commission: 14.90,
    max_recurring_total: 178.80,
    max_with_retention: 443.80,
    annual_price: 1341,
    annual_commission: 469,
  },
  {
    plan_id: 'web_pro',
    monthly_price: 249,
    upfront_commission: 125,
    recurring_commission: 24.90,
    max_recurring_total: 298.80,
    max_with_retention: 613.80,
    annual_price: 2241,
    annual_commission: 784,
  },
  {
    plan_id: 'web_enterprise',
    monthly_price: 349,
    upfront_commission: 175,
    recurring_commission: 34.90,
    max_recurring_total: 418.80,
    max_with_retention: 783.80,
    annual_price: 3141,
    annual_commission: 1099,
  },
];

// =====================================================
// LOCAL SEO PLAN COMMISSIONS (Monthly) - NEW
// =====================================================

export const SEO_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'seo_starter',
    monthly_price: 99,
    upfront_commission: 50,
    recurring_commission: 9.90,
    max_recurring_total: 118.80,
    max_with_retention: 358.80,
    annual_price: 891,
    annual_commission: 312,
  },
  {
    plan_id: 'seo_pro',
    monthly_price: 149,
    upfront_commission: 75,
    recurring_commission: 14.90,
    max_recurring_total: 178.80,
    max_with_retention: 443.80,
    annual_price: 1341,
    annual_commission: 469,
  },
  {
    plan_id: 'seo_enterprise',
    monthly_price: 199,
    upfront_commission: 100,
    recurring_commission: 19.90,
    max_recurring_total: 238.80,
    max_with_retention: 528.80,
    annual_price: 1791,
    annual_commission: 627,
  },
];

// =====================================================
// GOLD PLAN COMMISSIONS (Monthly) - UPDATED PRICING
// =====================================================

export const GOLD_COMMISSIONS: CommissionRate[] = [
  {
    plan_id: 'gold_starter',
    monthly_price: 249, // Updated from $199
    upfront_commission: 125, // 50% of new price
    recurring_commission: 24.90, // 10% of new price
    max_recurring_total: 298.80,
    max_with_retention: 613.80,
    annual_price: 2241,
    annual_commission: 784, // 35%
  },
  {
    plan_id: 'gold_pro',
    monthly_price: 399, // Updated from $349
    upfront_commission: 200,
    recurring_commission: 39.90,
    max_recurring_total: 478.80,
    max_with_retention: 868.80,
    annual_price: 3591,
    annual_commission: 1257,
  },
  {
    plan_id: 'gold_enterprise',
    monthly_price: 549, // Updated from $499
    upfront_commission: 275,
    recurring_commission: 54.90,
    max_recurring_total: 658.80,
    max_with_retention: 1123.80,
    annual_price: 4941,
    annual_commission: 1729,
  },
  {
    plan_id: 'gold_starter_teams',
    monthly_price: 349, // Updated from $299
    upfront_commission: 175,
    recurring_commission: 34.90,
    max_recurring_total: 418.80,
    max_with_retention: 783.80,
    annual_price: 3141,
    annual_commission: 1099,
  },
  {
    plan_id: 'gold_pro_teams',
    monthly_price: 499, // Updated from $449
    upfront_commission: 250,
    recurring_commission: 49.90,
    max_recurring_total: 598.80,
    max_with_retention: 1038.80,
    annual_price: 4491,
    annual_commission: 1572,
  },
  {
    plan_id: 'gold_enterprise_teams',
    monthly_price: 799, // Updated from $749
    upfront_commission: 400,
    recurring_commission: 79.90,
    max_recurring_total: 958.80,
    max_with_retention: 1548.80,
    annual_price: 7191,
    annual_commission: 2517,
  },
];

// =====================================================
// ADD-ON COMMISSIONS
// =====================================================

export const ADDON_COMMISSIONS = {
  gbp_setup: {
    addon_id: 'gbp_setup',
    price: 99,
    commission: 35, // Flat rate
    billing_type: 'one_time' as const,
    notes: 'Paid when customer payment clears. Only available with Web plans.',
  },
  extra_location: {
    addon_id: 'extra_location',
    monthly_price: 199,
    upfront_commission: 100,
    recurring_commission: 19.90,
    max_recurring_total: 238.80,
    max_with_retention: 528.80,
    annual_price: 1791,
    annual_commission: 627, // 35%
    notes: 'Same commission structure as plans. Credited to original agent if sold within 12 months.',
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
// RETENTION BONUSES (for monthly billing)
// =====================================================

export interface RetentionBonus {
  month: number;
  bonus_percent: number;
  description: string;
}

export const RETENTION_BONUSES: RetentionBonus[] = [
  { month: 6, bonus_percent: 5, description: '5% of monthly rate at 6-month retention' },
  { month: 9, bonus_percent: 5, description: '5% of monthly rate at 9-month retention' },
  { month: 12, bonus_percent: 5, description: '5% of monthly rate at 12-month retention' },
  { month: 14, bonus_percent: 0, description: '$65 flat bonus at 14-month mark (end of commission period)' },
];

export const RETENTION_BONUS_M14_FLAT = 65;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export const ALL_COMMISSIONS: CommissionRate[] = [
  ...BLUE_COMMISSIONS,
  ...WEB_COMMISSIONS,
  ...SEO_COMMISSIONS,
  ...GOLD_COMMISSIONS,
];

export function getCommissionRate(planId: string): CommissionRate | undefined {
  return ALL_COMMISSIONS.find(c => c.plan_id === planId);
}

export function getCommissionsByTrack(track: PlanTrack): CommissionRate[] {
  switch (track) {
    case 'blue': return BLUE_COMMISSIONS;
    case 'web': return WEB_COMMISSIONS;
    case 'seo': return SEO_COMMISSIONS;
    case 'gold': return GOLD_COMMISSIONS;
    default: return [];
  }
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
  const upfront = Math.round(priceDifference * 0.5);

  // Recurring on difference: 10% for remaining months (up to Month 14)
  const remainingMonths = Math.max(0, 14 - monthsSinceOriginalSale);
  const remainingRecurring = Math.round(priceDifference * 0.1 * remainingMonths * 100) / 100;

  return {
    upfront,
    remainingRecurring,
    total: upfront + remainingRecurring,
  };
}

export function calculateRetentionBonus(monthlyPrice: number, monthNumber: number): number {
  if (monthNumber === 6 || monthNumber === 9 || monthNumber === 12) {
    return Math.round(monthlyPrice * 0.05 * 100) / 100;
  }
  if (monthNumber === 14) {
    return RETENTION_BONUS_M14_FLAT;
  }
  return 0;
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

  if (includeRetention) {
    return rate.max_with_retention;
  }

  return rate.upfront_commission + rate.max_recurring_total;
}

// =====================================================
// COMMISSION PAYMENT SCHEDULE
// =====================================================

export interface CommissionScheduleEntry {
  month: number;
  type: 'upfront' | 'recurring' | 'retention' | 'annual';
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
  schedule.push({
    month: 2,
    type: 'upfront',
    amount: rate.upfront_commission,
    description: `Upfront commission (50% of $${rate.monthly_price})`,
    condition: 'After Month 2 payment clears',
  });

  // Recurring Months 3-14
  for (let m = 3; m <= 14; m++) {
    schedule.push({
      month: m,
      type: 'recurring',
      amount: rate.recurring_commission,
      description: `Recurring commission (10% of $${rate.monthly_price})`,
      condition: `Month ${m} payment clears`,
    });
  }

  // Retention bonuses
  [6, 9, 12].forEach(m => {
    const bonus = Math.round(rate.monthly_price * 0.05 * 100) / 100;
    schedule.push({
      month: m,
      type: 'retention',
      amount: bonus,
      description: `Retention bonus (5% of $${rate.monthly_price})`,
      condition: `Customer active at Month ${m}`,
    });
  });

  schedule.push({
    month: 14,
    type: 'retention',
    amount: RETENTION_BONUS_M14_FLAT,
    description: 'Final retention bonus ($65 flat)',
    condition: 'Customer active at Month 14',
  });

  return schedule.sort((a, b) => a.month - b.month);
}
