// =====================================================
// OFFER CODE SYSTEM LIBRARY
// Manage promotional offers and apply during checkout
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type {
  OfferCode,
  OfferUsage,
  OfferValidation,
  OfferDiscountType,
} from './types';

const adminLogger = logger.child({ context: 'admin.offers' });

// =====================================================
// OFFER CODE MANAGEMENT
// =====================================================

/**
 * Get all active offer codes
 */
export async function getOfferCodes(options?: {
  includeRestricted?: boolean;
  includeExpired?: boolean;
}): Promise<OfferCode[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('offer_codes')
    .select('*')
    .order('code', { ascending: true });

  if (!options?.includeExpired) {
    query = query.eq('is_active', true);
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get offer codes: ${error.message}`);

  let offers = data || [];

  if (!options?.includeRestricted) {
    offers = offers.filter((o) => !o.requires_approval);
  }

  return offers;
}

/**
 * Get offer code by code string
 */
export async function getOfferByCode(code: string): Promise<OfferCode | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('offer_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get offer: ${error.message}`);
  }

  return data;
}

/**
 * Get available offers for a specific plan
 */
export async function getAvailableOffers(planSlug: string): Promise<{
  standard: OfferCode[];
  restricted: OfferCode[];
}> {
  const supabase = createAdminClient();

  const { data: offers, error } = await supabase
    .from('offer_codes')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('code', { ascending: true });

  if (error) throw new Error(`Failed to get available offers: ${error.message}`);

  const allOffers = offers || [];

  // Filter by applicable plans
  const applicableOffers = allOffers.filter((offer) => {
    if (!offer.applicable_plans || offer.applicable_plans.length === 0) {
      return true; // Applies to all plans
    }
    return offer.applicable_plans.includes(planSlug);
  });

  // Check usage limits
  const validOffers = applicableOffers.filter((offer) => {
    if (!offer.usage_limit) return true;
    return offer.usage_count < offer.usage_limit;
  });

  return {
    standard: validOffers.filter((o) => !o.requires_approval),
    restricted: validOffers.filter((o) => o.requires_approval),
  };
}

// =====================================================
// OFFER VALIDATION
// =====================================================

/**
 * Validate an offer code for a specific plan
 */
export async function validateOfferCode(
  code: string,
  planSlug: string,
  monthlyPriceCents: number
): Promise<OfferValidation> {
  const offer = await getOfferByCode(code);

  if (!offer) {
    return { valid: false, error: 'Offer code not found' };
  }

  if (!offer.is_active) {
    return { valid: false, error: 'Offer code is no longer active' };
  }

  // Check expiration
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    return { valid: false, error: 'Offer code has expired' };
  }

  // Check usage limit
  if (offer.usage_limit && offer.usage_count >= offer.usage_limit) {
    return { valid: false, error: 'Offer code has reached its usage limit' };
  }

  // Check applicable plans
  if (offer.applicable_plans && offer.applicable_plans.length > 0) {
    if (!offer.applicable_plans.includes(planSlug)) {
      return { valid: false, error: 'Offer code is not valid for this plan' };
    }
  }

  // Calculate commission impact
  const commissionImpact = calculateCommissionImpact(offer, monthlyPriceCents);

  return {
    valid: true,
    offer,
    commission_impact: commissionImpact,
  };
}

/**
 * Calculate commission impact of an offer
 */
function calculateCommissionImpact(
  offer: OfferCode,
  monthlyPriceCents: number
): {
  upfront_adjustment: number;
  recurring_adjustment: number;
  description: string;
} {
  const impactType = offer.commission_impact_type;
  const impactValue = offer.commission_impact_value || 0;

  let upfrontAdjustment = 0;
  let recurringAdjustment = 0;
  let description = '';

  switch (impactType) {
    case 'reduce_upfront':
      // Upfront is based on discounted first month price
      if (offer.discount_type === 'percent_first_month') {
        const discountedPrice = monthlyPriceCents * (1 - (offer.discount_value || 0) / 100);
        upfrontAdjustment = -((monthlyPriceCents - discountedPrice) * 0.5);
        description = `Upfront commission based on ${100 - (offer.discount_value || 0)}% of first month`;
      } else if (offer.discount_type === 'free_trial') {
        description = 'Upfront commission delayed until after trial converts';
      }
      break;

    case 'reduce_all':
      // All commissions reduced by percentage
      upfrontAdjustment = -(impactValue / 100);
      recurringAdjustment = -(impactValue / 100);
      description = `All commissions reduced by ${impactValue}%`;
      break;

    case 'delay_upfront':
      description = 'Upfront commission delayed until Month 2';
      break;

    case 'none':
    default:
      description = 'No impact on commission';
      break;
  }

  return {
    upfront_adjustment: upfrontAdjustment,
    recurring_adjustment: recurringAdjustment,
    description,
  };
}

// =====================================================
// OFFER APPLICATION
// =====================================================

/**
 * Apply an offer code to a subscription
 */
export async function applyOfferCode(
  code: string,
  clientId: string,
  agentId: string,
  subscriptionId?: string
): Promise<OfferUsage> {
  const supabase = createAdminClient();

  const offer = await getOfferByCode(code);

  if (!offer) {
    throw new Error('Offer code not found');
  }

  // Create usage record
  const { data: usage, error: usageError } = await supabase
    .from('offer_usage')
    .insert({
      offer_code_id: offer.id,
      client_id: clientId,
      agent_id: agentId,
      subscription_id: subscriptionId,
    })
    .select()
    .single();

  if (usageError) throw new Error(`Failed to apply offer: ${usageError.message}`);

  // Increment usage count
  const { error: updateError } = await supabase
    .from('offer_codes')
    .update({ usage_count: offer.usage_count + 1 })
    .eq('id', offer.id);

  if (updateError) {
    adminLogger.error({
      msg: 'Failed to update usage count',
      error: updateError instanceof Error
        ? { name: updateError.name, message: updateError.message, stack: updateError.stack }
        : { message: String(updateError) },
    });
  }

  return usage;
}

/**
 * Get offer usage history for a client
 */
export async function getClientOfferHistory(
  clientId: string
): Promise<(OfferUsage & { offer: OfferCode })[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('offer_usage')
    .select(`
      *,
      offer:offer_codes(*)
    `)
    .eq('client_id', clientId)
    .order('applied_at', { ascending: false });

  if (error) throw new Error(`Failed to get offer history: ${error.message}`);

  return data || [];
}

// =====================================================
// OFFER APPROVAL REQUESTS
// =====================================================

/**
 * Request approval for a restricted offer
 */
export async function requestOfferApproval(
  code: string,
  agentId: string,
  clientId: string,
  justification: string
): Promise<{ id: string; status: string }> {
  const supabase = createAdminClient();

  const offer = await getOfferByCode(code);

  if (!offer) {
    throw new Error('Offer code not found');
  }

  if (!offer.requires_approval) {
    throw new Error('This offer does not require approval');
  }

  // Create approval request
  const { data, error } = await supabase
    .from('offer_approval_requests')
    .insert({
      offer_code_id: offer.id,
      agent_id: agentId,
      client_id: clientId,
      justification,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create approval request: ${error.message}`);

  return { id: data.id, status: 'pending' };
}

// =====================================================
// OFFER PRICE CALCULATIONS
// =====================================================

/**
 * Calculate discounted price based on offer
 */
export function calculateDiscountedPrice(
  offer: OfferCode,
  monthlyPriceCents: number,
  billingPeriod: 'monthly' | 'annual'
): {
  first_payment: number;
  regular_payment: number;
  description: string;
} {
  let firstPayment = monthlyPriceCents;
  let regularPayment = monthlyPriceCents;
  let description = '';

  switch (offer.discount_type) {
    case 'percent_first_month':
      const discount = offer.discount_value || 0;
      firstPayment = Math.round(monthlyPriceCents * (1 - discount / 100));
      description = `${discount}% off first month`;
      break;

    case 'free_trial':
      firstPayment = 0;
      description = `${offer.discount_duration_months || 14}-day free trial`;
      break;

    case 'percent_forever':
      const foreverDiscount = offer.discount_value || 0;
      firstPayment = Math.round(monthlyPriceCents * (1 - foreverDiscount / 100));
      regularPayment = firstPayment;
      description = `${foreverDiscount}% off forever`;
      break;

    case 'percent_months':
      const monthsDiscount = offer.discount_value || 0;
      const months = offer.discount_duration_months || 1;
      firstPayment = Math.round(monthlyPriceCents * (1 - monthsDiscount / 100));
      description = `${monthsDiscount}% off first ${months} months`;
      break;

    case 'flat_waive':
      // This is for waiving fees, not changing subscription price
      description = offer.description || 'Fee waived';
      break;
  }

  // Adjust for annual billing if needed
  if (billingPeriod === 'annual') {
    firstPayment = firstPayment * 12;
    regularPayment = regularPayment * 12;
  }

  return {
    first_payment: firstPayment,
    regular_payment: regularPayment,
    description,
  };
}

// =====================================================
// STANDARD OFFER CODES
// =====================================================

export const STANDARD_OFFERS = [
  {
    code: 'FIRST50',
    name: '50% off first month',
    discount_type: 'percent_first_month' as OfferDiscountType,
    discount_value: 50,
    commission_impact: 'Upfront based on 50% price',
    requires_approval: false,
  },
  {
    code: 'FREETRIAL14',
    name: '14-day free trial',
    discount_type: 'free_trial' as OfferDiscountType,
    discount_duration_months: 14,
    commission_impact: 'Upfront delayed to M2',
    requires_approval: false,
  },
  {
    code: 'ANNUAL15',
    name: '15% off annual (auto-applied)',
    discount_type: 'percent_forever' as OfferDiscountType,
    discount_value: 15,
    commission_impact: 'Commission on 85% price (~10 months)',
    requires_approval: false,
  },
];

export const RESTRICTED_OFFERS = [
  {
    code: 'VIP20',
    name: '20% off forever',
    discount_type: 'percent_forever' as OfferDiscountType,
    discount_value: 20,
    commission_impact: 'ALL commission reduced by 20%',
    requires_approval: true,
  },
  {
    code: 'PARTNER50',
    name: '50% off first year',
    discount_type: 'percent_months' as OfferDiscountType,
    discount_value: 50,
    discount_duration_months: 12,
    commission_impact: 'Upfront on 50% price',
    requires_approval: true,
  },
];
