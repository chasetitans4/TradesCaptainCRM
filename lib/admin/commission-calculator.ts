// =====================================================
// COMMISSION CALCULATOR LIBRARY
// Version: 5.8.1 - Interactive Commission Calculator
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

// =====================================================
// TYPES
// =====================================================

export interface CommissionInput {
  planSlug: string;
  billingPeriod: 'monthly' | 'annual';
  offerCode?: string | null;
  addOnUsers?: number;  // For NeverMiss +User add-ons
}

export interface RecurringBreakdown {
  rate10: number;       // Per month at 10%
  rate15: number;       // Per month at 15%
  months10: number;     // How many months at 10% (3)
  months15: number;     // How many months at 15% (9)
  total10: number;      // Total at 10%
  total15: number;      // Total at 15%
  totalRecurring: number;
}

export interface BonusBreakdown {
  month3: number;
  month4: number;
  month6: number;
  month12: number;
  total: number;
}

export interface CommissionResult {
  planName: string;
  planPrice: number;           // Monthly or annual price in dollars
  effectivePrice: number;      // After offer applied
  billingPeriod: 'monthly' | 'annual';
  offerApplied?: string;

  upfront: number;
  upfrontDate: string;         // "After Month 2" or specific date

  recurring: RecurringBreakdown;
  bonuses: BonusBreakdown;

  maxCommission: number;
  notes: string[];
}

export interface UpgradeCommissionInput {
  currentPlanSlug: string;
  newPlanSlug: string;
  customerMonth: number;       // What month is customer currently in
  isRateLocked: boolean;       // Have they hit Month 6 on current plan
}

export interface UpgradeCommissionResult {
  currentPlan: string;
  newPlan: string;
  priceDifference: number;

  upgradeUpfront: number;

  newRecurring: {
    rate10: number;
    rate15: number;
    months10: number;
    months15: number;
    total: number;
  };

  continuedOriginalRecurring: {
    rate: number;
    monthsRemaining: number;
    total: number;
  };

  totalUpgradeCommission: number;
  notes: string[];
}

export interface PlanCommissionLookup {
  plan_type: string;
  monthly_price_cents: number;
  upfront_cents: number;
  rate_10_cents: number;
  rate_15_cents: number;
  total_recurring_cents: number;
  total_bonuses_cents: number;
  max_commission_cents: number;
  annual_price_cents: number | null;
  annual_commission_cents: number | null;
}

export interface OfferAdjustment {
  offer_code: string;
  offer_name: string;
  upfront_adjustment_type: string | null;
  upfront_adjustment_value: number | null;
  recurring_adjustment_type: string | null;
  recurring_adjustment_value: number | null;
  notes: string | null;
}

// =====================================================
// CONSTANTS
// =====================================================

const UPFRONT_RATE = 0.50;          // 50% upfront
const RECURRING_RATE_10 = 0.10;     // 10% months 3-5
const RECURRING_RATE_15 = 0.15;     // 15% months 6-14
const ANNUAL_RATE = 0.35;           // 35% annual
const MONTHS_AT_10 = 3;             // Months 3, 4, 5
const MONTHS_AT_15 = 9;             // Months 6-14

const RETENTION_BONUSES: BonusBreakdown = {
  month3: 15,
  month4: 25,
  month6: 50,
  month12: 100,
  total: 190,
};

// Plan pricing in cents (fallback if DB not available) - v5.9 pricing
const PLAN_PRICING: Record<string, { monthly: number; annual: number | null; name: string }> = {
  leads_captain: { monthly: 3900, annual: 35100, name: 'Leads Captain' },
  leads_captain_user: { monthly: 1900, annual: null, name: 'Leads Captain +User' },
  blue_starter: { monthly: 4900, annual: 44100, name: 'Blue Starter' },
  blue_pro: { monthly: 9900, annual: 89100, name: 'Blue Pro' },
  blue_enterprise: { monthly: 19900, annual: 179100, name: 'Blue Enterprise' },
  web_starter: { monthly: 19900, annual: 179100, name: 'Web Starter' },
  web_pro: { monthly: 29900, annual: 269100, name: 'Web Pro' },
  web_enterprise: { monthly: 49900, annual: 449100, name: 'Web Enterprise' },
  silver_starter: { monthly: 24900, annual: 224100, name: 'Silver Starter' },
  silver_pro: { monthly: 34900, annual: 314100, name: 'Silver Pro' },
  silver_enterprise: { monthly: 49900, annual: 449100, name: 'Silver Enterprise' },
  gold_starter: { monthly: 29900, annual: 269100, name: 'Gold Starter' },
  gold_pro: { monthly: 39900, annual: 359100, name: 'Gold Pro' },
  gold_enterprise: { monthly: 59800, annual: 538200, name: 'Gold Enterprise' },
  local_seo_starter: { monthly: 9900, annual: 89100, name: 'Local SEO Starter' },
  local_seo_pro: { monthly: 19900, annual: 179100, name: 'Local SEO Pro' },
};

// =====================================================
// MAIN CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate commission for a new sale
 */
export async function calculateCommission(input: CommissionInput): Promise<CommissionResult> {
  const supabase = createAdminClient();
  const notes: string[] = [];

  // Get plan info
  let planData: PlanCommissionLookup | null = null;
  const { data } = await supabase
    .from('plan_commission_lookup')
    .select('*')
    .eq('plan_type', input.planSlug)
    .single();

  planData = data;

  // Fallback to hardcoded if not in DB
  const fallback = PLAN_PRICING[input.planSlug];
  const monthlyPriceCents = planData?.monthly_price_cents ?? fallback?.monthly ?? 0;
  const annualPriceCents = planData?.annual_price_cents ?? fallback?.annual ?? null;
  const planName = fallback?.name ?? input.planSlug.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Get offer adjustments if applicable
  let offerAdjustment: OfferAdjustment | null = null;
  if (input.offerCode) {
    const { data: offerData } = await supabase
      .from('offer_commission_adjustments')
      .select('*')
      .eq('offer_code', input.offerCode)
      .eq('is_active', true)
      .single();

    offerAdjustment = offerData;
  }

  // ANNUAL PLANS
  if (input.billingPeriod === 'annual') {
    if (!annualPriceCents) {
      throw new Error('Annual billing not available for this plan');
    }

    let effectiveAnnualPrice = annualPriceCents;

    // Apply offer if VIP20
    if (offerAdjustment?.offer_code === 'VIP20') {
      effectiveAnnualPrice = Math.round(annualPriceCents * 0.80);
      notes.push('VIP20: 20% off applied to annual price');
    }

    const annualCommission = Math.round(effectiveAnnualPrice * ANNUAL_RATE) / 100;

    return {
      planName,
      planPrice: annualPriceCents / 100,
      effectivePrice: effectiveAnnualPrice / 100,
      billingPeriod: 'annual',
      offerApplied: offerAdjustment?.offer_name,
      upfront: annualCommission,
      upfrontDate: 'Upon payment',
      recurring: {
        rate10: 0,
        rate15: 0,
        months10: 0,
        months15: 0,
        total10: 0,
        total15: 0,
        totalRecurring: 0,
      },
      bonuses: { month3: 0, month4: 0, month6: 0, month12: 0, total: 0 },
      maxCommission: annualCommission,
      notes: ['Annual plans: One-time 35% commission, no recurring or retention bonuses'],
    };
  }

  // MONTHLY PLANS
  let effectivePrice = monthlyPriceCents;
  let upfrontDate = 'After Month 2 payment';

  // Apply offer adjustments
  if (offerAdjustment) {
    if (offerAdjustment.upfront_adjustment_type === 'reduce_base' && offerAdjustment.upfront_adjustment_value) {
      // For FIRST50: upfront based on discounted first month
      // But we calculate on full price since Month 2 is full price
      notes.push(`${offerAdjustment.offer_name}: First month discounted, upfront based on Month 2 price`);
    }

    if (offerAdjustment.upfront_adjustment_type === 'delay') {
      upfrontDate = `After trial + Month 2 payment (${offerAdjustment.upfront_adjustment_value} day delay)`;
      notes.push(`${offerAdjustment.offer_name}: Upfront delayed until paid service starts`);
    }

    if (offerAdjustment.offer_code === 'VIP20') {
      effectivePrice = Math.round(monthlyPriceCents * 0.80);
      notes.push('VIP20: All commission based on 20% discounted price');
    }
  }

  // Calculate commission components
  const upfront = Math.round(effectivePrice * UPFRONT_RATE) / 100;
  const rate10 = Math.round(effectivePrice * RECURRING_RATE_10) / 100;
  const rate15 = Math.round(effectivePrice * RECURRING_RATE_15) / 100;
  const total10 = rate10 * MONTHS_AT_10;
  const total15 = rate15 * MONTHS_AT_15;
  const totalRecurring = total10 + total15;

  // Add-on users calculation
  if (input.addOnUsers && input.addOnUsers > 0) {
    const addOnPrice = 1900; // $19 per user
    const addOnTotal = addOnPrice * input.addOnUsers;
    notes.push(`+${input.addOnUsers} users: Additional $${(addOnTotal / 100).toFixed(0)}/mo commission base`);
  }

  const maxCommission = upfront + totalRecurring + RETENTION_BONUSES.total;

  return {
    planName,
    planPrice: monthlyPriceCents / 100,
    effectivePrice: effectivePrice / 100,
    billingPeriod: 'monthly',
    offerApplied: offerAdjustment?.offer_name,
    upfront,
    upfrontDate,
    recurring: {
      rate10,
      rate15,
      months10: MONTHS_AT_10,
      months15: MONTHS_AT_15,
      total10,
      total15,
      totalRecurring,
    },
    bonuses: RETENTION_BONUSES,
    maxCommission,
    notes,
  };
}

/**
 * Calculate commission for an upgrade
 */
export async function calculateUpgradeCommission(input: UpgradeCommissionInput): Promise<UpgradeCommissionResult> {
  const notes: string[] = [];

  // Get current and new plan pricing
  const currentPlan = PLAN_PRICING[input.currentPlanSlug];
  const newPlan = PLAN_PRICING[input.newPlanSlug];

  if (!currentPlan || !newPlan) {
    throw new Error('Invalid plan slug');
  }

  const currentPriceCents = currentPlan.monthly;
  const newPriceCents = newPlan.monthly;
  const priceDifferenceCents = newPriceCents - currentPriceCents;

  if (priceDifferenceCents <= 0) {
    throw new Error('New plan must be higher priced than current plan');
  }

  const priceDifference = priceDifferenceCents / 100;

  // Upfront on difference (50%)
  const upgradeUpfront = priceDifference * UPFRONT_RATE;

  // New recurring timeline
  const newRate10 = priceDifference * RECURRING_RATE_10;
  const newRate15 = priceDifference * RECURRING_RATE_15;

  // Determine if upgrade is before or after Month 6
  if (input.customerMonth < 6) {
    notes.push('⚠️ Upgrade BEFORE Month 6: New recurring timeline resets to Month 1 on price difference');
    notes.push('Tip: Waiting until Month 6 locks in 15% rate on original plan');
  } else if (input.isRateLocked) {
    notes.push('✓ Upgrade AFTER Month 6: Customer keeps 15% rate locked in');
    notes.push('✓ New recurring on difference also starts at 15% immediately');
  }

  // Original plan recurring continues
  const originalRate = input.isRateLocked
    ? (currentPriceCents / 100) * RECURRING_RATE_15
    : (currentPriceCents / 100) * RECURRING_RATE_10;

  const originalMonthsRemaining = Math.max(0, 14 - input.customerMonth);

  return {
    currentPlan: currentPlan.name,
    newPlan: newPlan.name,
    priceDifference,
    upgradeUpfront,
    newRecurring: {
      rate10: newRate10,
      rate15: newRate15,
      months10: MONTHS_AT_10,
      months15: MONTHS_AT_15,
      total: (newRate10 * MONTHS_AT_10) + (newRate15 * MONTHS_AT_15),
    },
    continuedOriginalRecurring: {
      rate: Math.round(originalRate * 100) / 100,
      monthsRemaining: originalMonthsRemaining,
      total: Math.round(originalRate * originalMonthsRemaining * 100) / 100,
    },
    totalUpgradeCommission: upgradeUpfront + (newRate10 * MONTHS_AT_10) + (newRate15 * MONTHS_AT_15),
    notes,
  };
}

// =====================================================
// QUICK LOOKUP FUNCTIONS
// =====================================================

/**
 * Get quick commission reference for all plans
 */
export async function getCommissionQuickReference(): Promise<Array<{
  planType: string;
  planName: string;
  monthlyPrice: number;
  upfront: number;
  rate10: number;
  rate15: number;
  maxMonthly: number;
  annualCommission: number | null;
}>> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('plan_commission_lookup')
    .select('*')
    .order('monthly_price_cents', { ascending: true });

  if (!data) {
    // Return from hardcoded if DB not available
    return Object.entries(PLAN_PRICING).map(([slug, plan]) => ({
      planType: slug,
      planName: plan.name,
      monthlyPrice: plan.monthly / 100,
      upfront: (plan.monthly * 0.50) / 100,
      rate10: (plan.monthly * 0.10) / 100,
      rate15: (plan.monthly * 0.15) / 100,
      maxMonthly: ((plan.monthly * 0.50) + (plan.monthly * 0.10 * 3) + (plan.monthly * 0.15 * 9) + 19000) / 100,
      annualCommission: plan.annual ? (plan.annual * 0.35) / 100 : null,
    }));
  }

  return data.map((row) => ({
    planType: row.plan_type,
    planName: PLAN_PRICING[row.plan_type]?.name ?? row.plan_type,
    monthlyPrice: row.monthly_price_cents / 100,
    upfront: row.upfront_cents / 100,
    rate10: row.rate_10_cents / 100,
    rate15: row.rate_15_cents / 100,
    maxMonthly: row.max_commission_cents / 100,
    annualCommission: row.annual_commission_cents ? row.annual_commission_cents / 100 : null,
  }));
}

/**
 * Get current commission rates
 */
export async function getCurrentRates(): Promise<{
  upfront: number;
  recurring10: number;
  recurring15: number;
  annual: number;
}> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('commission_rates')
    .select('rate_type, rate_percentage')
    .eq('is_active', true);

  if (!data || data.length === 0) {
    return {
      upfront: 50,
      recurring10: 10,
      recurring15: 15,
      annual: 35,
    };
  }

  const rates: Record<string, number> = {};
  data.forEach((row) => {
    rates[row.rate_type] = row.rate_percentage;
  });

  return {
    upfront: rates['upfront'] ?? 50,
    recurring10: rates['recurring_10'] ?? 10,
    recurring15: rates['recurring_15'] ?? 15,
    annual: rates['annual'] ?? 35,
  };
}

/**
 * Get retention bonus amounts
 */
export async function getRetentionBonuses(): Promise<BonusBreakdown> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('retention_bonuses')
    .select('milestone, bonus_amount_cents')
    .eq('is_active', true);

  if (!data || data.length === 0) {
    return RETENTION_BONUSES;
  }

  const bonuses: BonusBreakdown = {
    month3: 0,
    month4: 0,
    month6: 0,
    month12: 0,
    total: 0,
  };

  data.forEach((row) => {
    const amount = row.bonus_amount_cents / 100;
    switch (row.milestone) {
      case 'month_3':
        bonuses.month3 = amount;
        break;
      case 'month_4':
        bonuses.month4 = amount;
        break;
      case 'month_6':
        bonuses.month6 = amount;
        break;
      case 'month_12':
        bonuses.month12 = amount;
        break;
    }
    bonuses.total += amount;
  });

  return bonuses;
}

/**
 * Get available offers and their commission impact
 */
export async function getOfferAdjustments(): Promise<OfferAdjustment[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('offer_commission_adjustments')
    .select('*')
    .eq('is_active', true)
    .order('offer_code');

  return data || [];
}
