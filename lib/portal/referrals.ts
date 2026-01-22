// =====================================================
// PORTAL REFERRAL PROGRAM
// Customer referrals and rewards tracking
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { ReferralProgram, CustomerReferral } from './types';

/**
 * Get active referral program for a business
 */
export async function getReferralProgram(
  businessId: string
): Promise<ReferralProgram | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('referral_programs')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get customer's referral code (or create one)
 */
export async function getCustomerReferralCode(
  customerId: string,
  businessId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  // Check if program exists
  const program = await getReferralProgram(businessId);
  if (!program) {
    return null;
  }

  // Check if customer already has a code
  const { data: existing } = await supabase
    .from('customer_referrals')
    .select('referral_code')
    .eq('referrer_id', customerId)
    .eq('business_id', businessId)
    .not('referral_code', 'is', null)
    .limit(1)
    .single();

  if (existing?.referral_code) {
    return existing.referral_code;
  }

  // Generate a unique referral code
  const code = await generateUniqueReferralCode(businessId);

  // Store the code with a self-referral placeholder
  // This creates the referral code record without an actual referral
  const { error } = await supabase
    .from('customer_referrals')
    .insert({
      business_id: businessId,
      program_id: program.id,
      referrer_id: customerId,
      referral_code: code,
      status: 'code_generated',
    });

  if (error) {
    syncLogger.error({
      msg: 'Failed to generate referral code',
      customerId,
      error: error.message,
    });
    return null;
  }

  return code;
}

/**
 * Generate a unique referral code
 */
async function generateUniqueReferralCode(businessId: string): Promise<string> {
  const supabase = createAdminClient();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters

  let attempts = 0;
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code exists
    const { data } = await supabase
      .from('customer_referrals')
      .select('id')
      .eq('business_id', businessId)
      .eq('referral_code', code)
      .limit(1);

    if (!data || data.length === 0) {
      return code;
    }

    attempts++;
  }

  // Fallback: use timestamp-based code
  return `REF${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Submit a referral
 */
export async function submitReferral(
  referrerId: string,
  businessId: string,
  referralData: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Check if program exists
  const program = await getReferralProgram(businessId);
  if (!program) {
    return { success: false, error: 'Referral program not available' };
  }

  // Verify referrer exists
  const { data: referrer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', referrerId)
    .eq('business_id', businessId)
    .single();

  if (!referrer) {
    return { success: false, error: 'Customer not found' };
  }

  // Get or create referral code
  const referralCode = await getCustomerReferralCode(referrerId, businessId);

  const { data, error } = await supabase
    .from('customer_referrals')
    .insert({
      business_id: businessId,
      program_id: program.id,
      referrer_id: referrerId,
      referral_code: referralCode,
      referred_name: referralData.name,
      referred_email: referralData.email,
      referred_phone: referralData.phone,
      notes: referralData.notes,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    syncLogger.error({
      msg: 'Failed to submit referral',
      referrerId,
      error: error.message,
    });
    return { success: false, error: 'Failed to submit referral' };
  }

  syncLogger.info({
    msg: 'Referral submitted via portal',
    referralId: data.id,
    referrerId,
  });

  return { success: true, referralId: data.id };
}

/**
 * Get customer's referrals
 */
export async function getCustomerReferrals(
  customerId: string,
  businessId: string
): Promise<CustomerReferral[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_referrals')
    .select('*')
    .eq('referrer_id', customerId)
    .eq('business_id', businessId)
    .neq('status', 'code_generated') // Exclude placeholder records
    .order('created_at', { ascending: false });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer referrals',
      customerId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Get referral statistics for a customer
 */
export async function getCustomerReferralStats(
  customerId: string,
  businessId: string
): Promise<{
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_referrals')
    .select('status, referrer_reward_amount, referrer_reward_claimed')
    .eq('referrer_id', customerId)
    .eq('business_id', businessId)
    .neq('status', 'code_generated');

  if (error || !data) {
    return {
      totalReferrals: 0,
      convertedReferrals: 0,
      pendingReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
    };
  }

  const stats = {
    totalReferrals: data.length,
    convertedReferrals: 0,
    pendingReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  };

  for (const ref of data) {
    if (ref.status === 'converted' || ref.status === 'rewarded') {
      stats.convertedReferrals++;
      stats.totalEarnings += ref.referrer_reward_amount || 0;
      if (!ref.referrer_reward_claimed) {
        stats.pendingEarnings += ref.referrer_reward_amount || 0;
      }
    } else if (ref.status === 'pending' || ref.status === 'contacted') {
      stats.pendingReferrals++;
    }
  }

  return stats;
}

/**
 * Check if a referral code is valid
 */
export async function validateReferralCode(
  code: string,
  businessId: string
): Promise<{ valid: boolean; referrerName?: string }> {
  const supabase = createAdminClient();

  // Check if program is active
  const program = await getReferralProgram(businessId);
  if (!program) {
    return { valid: false };
  }

  // Find referral with this code
  const { data } = await supabase
    .from('customer_referrals')
    .select(`
      id,
      referrer_id,
      customers!customer_referrals_referrer_id_fkey(name)
    `)
    .eq('business_id', businessId)
    .eq('referral_code', code.toUpperCase())
    .limit(1)
    .single();

  if (!data) {
    return { valid: false };
  }

  return {
    valid: true,
    referrerName: (data.customers as any)?.name,
  };
}

/**
 * Track referral code usage (when someone uses a code)
 */
export async function trackReferralCodeUsage(
  code: string,
  businessId: string,
  newCustomerData: {
    name: string;
    email?: string;
    phone?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Find the referral code owner
  const { data: codeRecord } = await supabase
    .from('customer_referrals')
    .select('id, referrer_id, program_id')
    .eq('business_id', businessId)
    .eq('referral_code', code.toUpperCase())
    .eq('status', 'code_generated')
    .limit(1)
    .single();

  if (!codeRecord) {
    return { success: false, error: 'Invalid referral code' };
  }

  // Create a new referral record for this conversion
  const { error } = await supabase
    .from('customer_referrals')
    .insert({
      business_id: businessId,
      program_id: codeRecord.program_id,
      referrer_id: codeRecord.referrer_id,
      referral_code: code.toUpperCase(),
      referred_name: newCustomerData.name,
      referred_email: newCustomerData.email,
      referred_phone: newCustomerData.phone,
      status: 'contacted',
    });

  if (error) {
    syncLogger.error({
      msg: 'Failed to track referral code usage',
      code,
      error: error.message,
    });
    return { success: false, error: 'Failed to track referral' };
  }

  return { success: true };
}

/**
 * Get referral program details for display
 */
export async function getReferralProgramDetails(
  businessId: string
): Promise<{
  program: ReferralProgram | null;
  terms: string | null;
  rewards: {
    referrer: string;
    referred: string;
  } | null;
}> {
  const program = await getReferralProgram(businessId);

  if (!program) {
    return { program: null, terms: null, rewards: null };
  }

  return {
    program,
    terms: program.terms_and_conditions ?? null,
    rewards: {
      referrer: formatReward(program.referrer_reward_type, program.referrer_reward_amount),
      referred: formatReward(program.referee_reward_type ?? 'none', program.referee_reward_amount ?? 0),
    },
  };
}

/**
 * Format reward for display
 */
function formatReward(type: string, value: number): string {
  switch (type) {
    case 'cash':
      return `$${value} credit`;
    case 'percentage':
      return `${value}% off next service`;
    case 'fixed':
      return `$${value} off next service`;
    case 'free_service':
      return 'Free service';
    default:
      return `${value} reward`;
  }
}
