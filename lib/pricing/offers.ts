// =====================================================
// TRADESCAPTAIN OFFERS / DISCOUNT SYSTEM - v5
// Pre-defined offers only - Agents cannot modify prices
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
    code: 'ANNUAL25',
    name: 'Annual 25% Off',
    description: 'Standard annual discount. Pay for 9 months, get 12 months of service.',
    discount_type: 'percent_annual',
    discount_value: 25,
    applies_to: ['all'],
    requires_approval: false,
    approval_role: null,
    is_active: true,
    current_uses: 0,
    commission_impact: 'Agent receives 35% of annual price as one-time commission.',
  },
  {
    id: 'offer_003',
    code: 'WAIVE99',
    name: 'Waive GBP Setup Fee',
    description: 'Waives the $99 one-time GBP setup/optimization fee for Web plans.',
    discount_type: 'waive_fee',
    discount_value: 99,
    applies_to: ['web_starter', 'web_pro', 'web_enterprise', 'web_custom'],
    requires_approval: false,
    approval_role: null,
    is_active: true,
    current_uses: 0,
    commission_impact: 'Agent loses $35 GBP add-on commission when applied.',
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
  FIRST50: ['ANNUAL25', 'FREETRIAL14', 'VIP20'],
  ANNUAL25: ['FIRST50', 'WAIVE99', 'FREETRIAL14', 'VIP20'], // Annual is standalone
  WAIVE99: ['ANNUAL25'], // Can combine with others except annual
  FREETRIAL14: ['FIRST50', 'ANNUAL25'],
  VIP20: ['FIRST50', 'ANNUAL25'],
};

export const MAX_OFFERS_PER_SUBSCRIPTION = 2;

// =====================================================
// IN-MEMORY STORAGE (Replace with Supabase in production)
// =====================================================

const approvalRequests: Map<string, OfferApprovalRequest> = new Map();
let requestCounter = 1000;

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

  // Check for ANNUAL25 - must be standalone
  if (offerCodes.includes('ANNUAL25') && offerCodes.length > 1) {
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
  includeGbpAddon: boolean = false
): PricingCalculation {
  let base_monthly_rate = planMonthlyPrice;
  let first_month_rate = planMonthlyPrice;
  let effective_monthly_rate = planMonthlyPrice;
  let annual_rate = planAnnualPrice;
  let one_time_fees = includeGbpAddon ? 99 : 0;
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
        if (offer.code === 'WAIVE99' && includeGbpAddon) {
          one_time_fees -= 99;
          fees_waived.push('gbp_setup');
        }
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
  recurring_commission_monthly: number;
  max_recurring_total: number; // 12 months (M3-14)
  retention_bonus_max: number;
  max_total_commission: number;
  gbp_addon_commission: number;
  commission_notes: string[];
}

export function calculateCommission(
  planMonthlyPrice: number,
  billingFrequency: 'monthly' | 'annual',
  planAnnualPrice: number,
  offerCodes: string[],
  includeGbpAddon: boolean = false,
  gbpFeeWaived: boolean = false
): CommissionCalculation {
  const notes: string[] = [];
  let upfrontMultiplier = 1.0; // 50% of monthly price by default
  let recurringMultiplier = 1.0; // 10% of monthly price by default
  let effectiveMonthlyPrice = planMonthlyPrice;
  let gbp_addon_commission = includeGbpAddon && !gbpFeeWaived ? 35 : 0;

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
        if (offer.code === 'WAIVE99') {
          gbp_addon_commission = 0;
          notes.push('WAIVE99: GBP add-on commission waived');
        }
        break;
    }
  }

  let upfront_commission: number;
  let recurring_commission_monthly: number;
  let max_recurring_total: number;
  let retention_bonus_max: number;
  let max_total_commission: number;

  if (billingFrequency === 'annual') {
    // Annual: 35% of annual price, one-time
    upfront_commission = Math.round(planAnnualPrice * 0.35);
    recurring_commission_monthly = 0;
    max_recurring_total = 0;
    retention_bonus_max = 0;
    max_total_commission = upfront_commission + gbp_addon_commission;
    notes.push('Annual billing: 35% one-time commission');
  } else {
    // Monthly: 50% upfront (after M2), 10% recurring (M3-14)
    const baseUpfront = effectiveMonthlyPrice * 0.5;
    upfront_commission = Math.round(baseUpfront * upfrontMultiplier);

    recurring_commission_monthly = Math.round(effectiveMonthlyPrice * 0.1 * recurringMultiplier * 100) / 100;
    max_recurring_total = Math.round(recurring_commission_monthly * 12 * 100) / 100; // M3-14

    // Retention bonuses (not affected by discounts)
    retention_bonus_max = Math.round(planMonthlyPrice * 0.1 * 6 + 65); // ~6 months + M14 bonus

    max_total_commission = upfront_commission + max_recurring_total + retention_bonus_max + gbp_addon_commission;
  }

  return {
    upfront_commission,
    recurring_commission_monthly,
    max_recurring_total,
    retention_bonus_max,
    max_total_commission,
    gbp_addon_commission,
    commission_notes: notes,
  };
}

// =====================================================
// APPROVAL REQUEST FUNCTIONS
// =====================================================

export async function createApprovalRequest(request: Omit<OfferApprovalRequest, 'id' | 'status' | 'requested_at'>): Promise<OfferApprovalRequest> {
  requestCounter++;
  const id = `apr_${Date.now()}_${requestCounter}`;

  const fullRequest: OfferApprovalRequest = {
    ...request,
    id,
    status: 'pending',
    requested_at: new Date().toISOString(),
  };

  approvalRequests.set(id, fullRequest);
  return fullRequest;
}

export async function getApprovalRequest(id: string): Promise<OfferApprovalRequest | null> {
  return approvalRequests.get(id) || null;
}

export async function getPendingApprovalRequests(): Promise<OfferApprovalRequest[]> {
  return Array.from(approvalRequests.values()).filter(r => r.status === 'pending');
}

export async function approveRequest(
  id: string,
  reviewedBy: string,
  notes?: string
): Promise<OfferApprovalRequest | null> {
  const request = approvalRequests.get(id);
  if (!request) return null;

  request.status = 'approved';
  request.reviewed_at = new Date().toISOString();
  request.reviewed_by = reviewedBy;
  request.review_notes = notes;

  approvalRequests.set(id, request);
  return request;
}

export async function denyRequest(
  id: string,
  reviewedBy: string,
  notes?: string
): Promise<OfferApprovalRequest | null> {
  const request = approvalRequests.get(id);
  if (!request) return null;

  request.status = 'denied';
  request.reviewed_at = new Date().toISOString();
  request.reviewed_by = reviewedBy;
  request.review_notes = notes;

  approvalRequests.set(id, request);
  return request;
}

// =====================================================
// OFFER USAGE TRACKING
// =====================================================

export function incrementOfferUsage(offerCode: string): void {
  const offer = OFFERS.find(o => o.code === offerCode);
  if (offer) {
    offer.current_uses++;
  }
}

export function getOfferUsageStats(): { code: string; name: string; uses: number; max_uses?: number }[] {
  return OFFERS.map(o => ({
    code: o.code,
    name: o.name,
    uses: o.current_uses,
    max_uses: o.max_uses,
  }));
}
