// =====================================================
// TRADESCAPTAIN OFFERS / DISCOUNT SYSTEM - v5.9
// Pre-defined offers only - Agents cannot modify prices
// Updated for v5.9 pricing: 15% annual discount
// =====================================================

export type DiscountType =
  | 'percent_first_month'
  | 'percent_ongoing'
  | 'waive_fee'
  | 'free_trial_days'
  | 'percent_annual';

export type ApprovalRole = 'manager' | 'admin' | null;

export interface Offer {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number; // percent or dollar amount or days
  applies_to: string[]; // plan IDs or wildcards like 'gold_*' or 'all'
  requires_approval: boolean;
  approval_role: ApprovalRole;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  max_uses?: number;
  current_uses: number;
  commission_impact: string; // Description of how it affects agent commission
}

export interface OfferApprovalRequest {
  id: string;
  offer_id: string;
  offer_code: string;
  agent_id: string;
  agent_name: string;
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

// =====================================================
// PRE-DEFINED OFFERS
// =====================================================

export const OFFERS: Offer[] = [
  {
    id: 'offer_001',
    code: 'FIRST50',
    name: 'First Month 50% Off',
    description: 'Customer pays 50% of normal rate for first month only. Full price from Month 2.',
    discount_type: 'percent_first_month',
    discount_value: 50,
    applies_to: ['all'],
    requires_approval: false,
    approval_role: null,
    is_active: true,
    current_uses: 0,
    commission_impact: 'Agent receives 50% of normal upfront commission. Full recurring from Month 3.',
  },
  {
    id: 'offer_002',
    code: 'ANNUAL15',
    name: 'Annual 15% Off',
    description: 'Standard annual discount. Pay for ~10 months, get 12 months of service.',
    discount_type: 'percent_annual',
    discount_value: 15,
    applies_to: ['all'],
    requires_approval: false,
    approval_role: null,
    is_active: true,
    current_uses: 0,
    commission_impact: 'Agent receives 35% of annual price as one-time commission.',
  },
  {
    id: 'offer_004',
    code: 'FREETRIAL14',
    name: '14-Day Free Trial',
    description: 'Customer gets 14 days free. First charge on Day 15. CRM access during trial.',
    discount_type: 'free_trial_days',
    discount_value: 14,
    applies_to: ['blue_*', 'gold_*'], // Only CRM-inclusive plans
    requires_approval: false,
    approval_role: null,
    is_active: true,
    current_uses: 0,
    commission_impact: 'Agent receives 75% of normal upfront commission (risk adjustment). Full recurring.',
  },
  {
    id: 'offer_005',
    code: 'VIP20',
    name: 'VIP 20% Off Monthly',
    description: '20% discount applied to ALL monthly payments (ongoing). For strategic accounts.',
    discount_type: 'percent_ongoing',
    discount_value: 20,
    applies_to: ['all'],
    requires_approval: true,
    approval_role: 'manager',
    is_active: true,
    current_uses: 0,
    commission_impact: 'All commission (upfront + recurring) calculated on discounted price.',
  },
];

// =====================================================
// OFFER STACKING RULES
// =====================================================

export const OFFER_STACKING_RULES: Record<string, string[]> = {
  // Key: offer code, Value: array of incompatible offer codes
  FIRST50: ['ANNUAL15', 'FREETRIAL14', 'VIP20'],
  ANNUAL15: ['FIRST50', 'FREETRIAL14', 'VIP20'], // Annual is standalone
  FREETRIAL14: ['FIRST50', 'ANNUAL15'],
  VIP20: ['FIRST50', 'ANNUAL15'],
};

export const MAX_OFFERS_PER_SUBSCRIPTION = 2;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getOfferByCode(code: string): Offer | undefined {
  return OFFERS.find(o => o.code === code && o.is_active);
}

export function getOfferById(id: string): Offer | undefined {
  return OFFERS.find(o => o.id === id);
}

export function getActiveOffers(): Offer[] {
  return OFFERS.filter(o => o.is_active);
}

export function isOfferAvailableForPlan(offerCode: string, planId: string): boolean {
  const offer = getOfferByCode(offerCode);
  if (!offer || !offer.is_active) return false;

  // Check max uses
  if (offer.max_uses && offer.current_uses >= offer.max_uses) return false;

  // Check date range
  const now = new Date();
  if (offer.start_date && new Date(offer.start_date) > now) return false;
  if (offer.end_date && new Date(offer.end_date) < now) return false;

  // Check applies_to (wildcards supported)
  for (const pattern of offer.applies_to) {
    if (pattern === 'all') return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (planId.startsWith(prefix)) return true;
    } else if (pattern === planId) {
      return true;
    }
  }

  return false;
}

export function canCombineOffers(offer1Code: string, offer2Code: string): boolean {
  const incompatible = OFFER_STACKING_RULES[offer1Code] || [];
  return !incompatible.includes(offer2Code);
}

export function validateOfferCombination(offerCodes: string[]): { valid: boolean; error?: string } {
  if (offerCodes.length > MAX_OFFERS_PER_SUBSCRIPTION) {
    return { valid: false, error: `Maximum ${MAX_OFFERS_PER_SUBSCRIPTION} offers per subscription` };
  }

  // Check for ANNUAL15 - must be standalone
  if (offerCodes.includes('ANNUAL15') && offerCodes.length > 1) {
    return { valid: false, error: 'Annual discount cannot be combined with other offers' };
  }

  // Check all combinations
  for (let i = 0; i < offerCodes.length; i++) {
    for (let j = i + 1; j < offerCodes.length; j++) {
      if (!canCombineOffers(offerCodes[i], offerCodes[j])) {
        const offer1 = getOfferByCode(offerCodes[i]);
        const offer2 = getOfferByCode(offerCodes[j]);
        return {
          valid: false,
          error: `Cannot combine ${offer1?.name || offerCodes[i]} with ${offer2?.name || offerCodes[j]}`,
        };
      }
    }
  }

  return { valid: true };
}

// =====================================================
// PRICING CALCULATIONS
// =====================================================

export interface PricingCalculation {
  base_monthly_rate: number;
  first_month_rate: number;
  effective_monthly_rate: number; // After ongoing discounts
  annual_rate?: number;
  one_time_fees: number;
  trial_days: number;
  trial_end_date?: string;
  offers_applied: string[];
  first_month_discount_percent: number;
  ongoing_discount_percent: number;
  fees_waived: string[];
  due_today: number;
}

export function calculatePricing(
  planMonthlyPrice: number,
  planAnnualPrice: number,
  billingFrequency: 'monthly' | 'annual',
  offerCodes: string[],
  _includeGbpAddon: boolean = false // Deprecated in v5.9 - kept for API compatibility
): PricingCalculation {
  let base_monthly_rate = planMonthlyPrice;
  let first_month_rate = planMonthlyPrice;
  let effective_monthly_rate = planMonthlyPrice;
  let annual_rate = planAnnualPrice;
  let one_time_fees = 0; // GBP addon removed in v5.9
  let trial_days = 0;
  let first_month_discount_percent = 0;
  let ongoing_discount_percent = 0;
  const fees_waived: string[] = [];

  for (const code of offerCodes) {
    const offer = getOfferByCode(code);
    if (!offer) continue;

    switch (offer.discount_type) {
      case 'percent_first_month':
        first_month_discount_percent = offer.discount_value;
        first_month_rate = planMonthlyPrice * (1 - offer.discount_value / 100);
        break;

      case 'percent_ongoing':
        ongoing_discount_percent = offer.discount_value;
        effective_monthly_rate = planMonthlyPrice * (1 - offer.discount_value / 100);
        first_month_rate = effective_monthly_rate;
        break;

      case 'waive_fee':
        // GBP addon waiver removed in v5.9
        break;

      case 'free_trial_days':
        trial_days = offer.discount_value;
        break;

      case 'percent_annual':
        // This is the standard annual discount - already factored into annual_price
        break;
    }
  }

  // Calculate due today
  let due_today: number;
  if (billingFrequency === 'annual') {
    due_today = annual_rate + one_time_fees;
  } else if (trial_days > 0) {
    due_today = one_time_fees; // Only one-time fees during trial
  } else {
    due_today = first_month_rate + one_time_fees;
  }

  // Calculate trial end date
  let trial_end_date: string | undefined;
  if (trial_days > 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trial_days);
    trial_end_date = endDate.toISOString().split('T')[0];
  }

  return {
    base_monthly_rate,
    first_month_rate: Math.round(first_month_rate * 100) / 100,
    effective_monthly_rate: Math.round(effective_monthly_rate * 100) / 100,
    annual_rate: billingFrequency === 'annual' ? annual_rate : undefined,
    one_time_fees: Math.max(0, one_time_fees),
    trial_days,
    trial_end_date,
    offers_applied: offerCodes,
    first_month_discount_percent,
    ongoing_discount_percent,
    fees_waived,
    due_today: Math.round(due_today * 100) / 100,
  };
}

// =====================================================
// COMMISSION CALCULATIONS WITH OFFERS
// =====================================================

export interface CommissionCalculation {
  upfront_commission: number;
  recurring_10_monthly: number; // 10% for Months 3-5
  recurring_15_monthly: number; // 15% for Months 6-14
  max_recurring_total: number; // 12 months (M3-14)
  retention_bonus_max: number; // $190 max ($15 + $25 + $50 + $100)
  max_total_commission: number;
  commission_notes: string[];
}

/**
 * Calculate commission for v5.9 pricing structure
 * - Upfront: 50% of monthly price (after customer's 2nd payment)
 * - Recurring: 10% (Months 3-5), 15% (Months 6-14) - LOCKED
 * - Retention Bonuses: $15 (M3) + $25 (M4) + $50 (M6) + $100 (M12) = $190 max
 * - Annual: 35% of annual price, one-time
 */
export function calculateCommission(
  planMonthlyPrice: number,
  billingFrequency: 'monthly' | 'annual',
  planAnnualPrice: number,
  offerCodes: string[],
  _includeGbpAddon: boolean = false, // Deprecated in v5.9
  _gbpFeeWaived: boolean = false // Deprecated in v5.9
): CommissionCalculation {
  const notes: string[] = [];
  let upfrontMultiplier = 1.0; // 50% of monthly price by default
  let effectiveMonthlyPrice = planMonthlyPrice;

  // Check offer impacts
  for (const code of offerCodes) {
    const offer = getOfferByCode(code);
    if (!offer) continue;

    switch (offer.discount_type) {
      case 'percent_first_month':
        // FIRST50: Agent gets 50% of normal upfront
        upfrontMultiplier = 0.5;
        notes.push('FIRST50: Upfront commission reduced to 50%');
        break;

      case 'free_trial_days':
        // FREETRIAL14: Agent gets 75% of normal upfront (risk adjustment)
        upfrontMultiplier = 0.75;
        notes.push('FREETRIAL14: Upfront commission reduced to 75% (risk adjustment)');
        break;

      case 'percent_ongoing':
        // VIP20: All commission based on discounted price
        effectiveMonthlyPrice = planMonthlyPrice * (1 - offer.discount_value / 100);
        notes.push(`VIP20: Commission based on discounted price ($${effectiveMonthlyPrice.toFixed(2)})`);
        break;

      case 'waive_fee':
        // GBP waiver removed in v5.9
        break;
    }
  }

  let upfront_commission: number;
  let recurring_10_monthly: number;
  let recurring_15_monthly: number;
  let max_recurring_total: number;
  let retention_bonus_max: number;
  let max_total_commission: number;

  if (billingFrequency === 'annual') {
    // Annual: 35% of annual price, one-time
    upfront_commission = Math.round(planAnnualPrice * 0.35);
    recurring_10_monthly = 0;
    recurring_15_monthly = 0;
    max_recurring_total = 0;
    retention_bonus_max = 0;
    max_total_commission = upfront_commission;
    notes.push('Annual billing: 35% one-time commission');
  } else {
    // Monthly v5.9 structure:
    // - 50% upfront (after customer's 2nd payment)
    // - 10% recurring (Months 3-5) = 3 months
    // - 15% recurring (Months 6-14) = 9 months
    const baseUpfront = effectiveMonthlyPrice * 0.5;
    upfront_commission = Math.round(baseUpfront * upfrontMultiplier);

    recurring_10_monthly = Math.round(effectiveMonthlyPrice * 0.10 * 100) / 100;
    recurring_15_monthly = Math.round(effectiveMonthlyPrice * 0.15 * 100) / 100;

    // Total recurring: 3 months at 10% + 9 months at 15%
    const recurring_10_total = recurring_10_monthly * 3; // M3, M4, M5
    const recurring_15_total = recurring_15_monthly * 9; // M6-M14
    max_recurring_total = Math.round((recurring_10_total + recurring_15_total) * 100) / 100;

    // Retention bonuses per v5.9: $15 (M3) + $25 (M4) + $50 (M6) + $100 (M12) = $190
    retention_bonus_max = 190;

    max_total_commission = upfront_commission + max_recurring_total + retention_bonus_max;
    notes.push('v5.9: 10% recurring (M3-5), 15% recurring (M6-14), $190 max retention bonuses');
  }

  return {
    upfront_commission,
    recurring_10_monthly,
    recurring_15_monthly,
    max_recurring_total,
    retention_bonus_max,
    max_total_commission,
    commission_notes: notes,
  };
}
