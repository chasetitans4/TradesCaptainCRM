// =====================================================
// REFERRAL PROGRAM
// Referral codes, tracking, and reward management
// =====================================================

import { createClient } from '@/lib/supabase/server';

// Generate a random alphanumeric code
function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface ReferralCode {
  id: string;
  businessId: string;
  customerId: string;
  code: string;
  timesUsed: number;
  totalValueGenerated: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface Referral {
  id: string;
  businessId: string;
  referrerCustomerId: string;
  referralCodeId: string | null;
  refereeCustomerId: string | null;
  refereeName: string | null;
  refereeEmail: string | null;
  refereePhone: string | null;
  status: 'pending' | 'converted' | 'rewarded' | 'expired' | 'invalid';
  convertedAt: string | null;
  convertedJobId: string | null;
  jobValue: number | null;
  referrerRewardAmount: number;
  referrerRewardStatus: string | null;
  referrerRewardIssuedAt: string | null;
  refereeRewardAmount: number;
  refereeRewardStatus: string | null;
  source: string;
  createdAt: string;
}

export interface ReferralSettings {
  id: string;
  businessId: string;
  isEnabled: boolean;
  referrerRewardType: 'credit' | 'cash' | 'discount' | 'gift_card';
  referrerRewardAmount: number;
  refereeRewardType: 'credit' | 'cash' | 'discount' | 'gift_card';
  refereeRewardAmount: number;
  minimumJobValue: number;
  requireJobCompletion: boolean;
  maxReferralsPerCustomer: number | null;
  rewardExpiryDays: number;
}

// Get or create referral settings for a business
export async function getReferralSettings(businessId: string): Promise<ReferralSettings | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('referral_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  return data ? transformSettings(data) : null;
}

// Create or update referral settings
export async function upsertReferralSettings(
  businessId: string,
  settings: Partial<Omit<ReferralSettings, 'id' | 'businessId'>>
): Promise<{ success: boolean; settings?: ReferralSettings; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('referral_settings')
      .upsert(
        {
          business_id: businessId,
          is_enabled: settings.isEnabled,
          referrer_reward_type: settings.referrerRewardType,
          referrer_reward_amount: settings.referrerRewardAmount,
          referee_reward_type: settings.refereeRewardType,
          referee_reward_amount: settings.refereeRewardAmount,
          minimum_job_value: settings.minimumJobValue,
          require_job_completion: settings.requireJobCompletion,
          max_referrals_per_customer: settings.maxReferralsPerCustomer,
          reward_expiry_days: settings.rewardExpiryDays,
        },
        { onConflict: 'business_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return { success: true, settings: transformSettings(data) };
  } catch (error: any) {
    console.error('Error updating referral settings:', error);
    return { success: false, error: error.message };
  }
}

// Get or create referral code for customer
export async function getOrCreateReferralCode(
  customerId: string,
  businessId: string
): Promise<string> {
  const supabase = await createClient();

  // Check for existing code
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();

  if (existing) return existing.code;

  // Get customer name for personalized code
  const { data: customer } = await supabase
    .from('customers')
    .select('name')
    .eq('id', customerId)
    .single();

  // Generate personalized code (e.g., "JOHN" + random)
  const firstName = customer?.name?.split(' ')[0]?.toUpperCase().slice(0, 4) || '';
  const randomPart = generateCode(4);
  const code = `${firstName}${randomPart}`;

  await supabase.from('referral_codes').insert({
    business_id: businessId,
    customer_id: customerId,
    code,
  });

  return code;
}

// Validate referral code
export async function validateReferralCode(
  businessId: string,
  code: string
): Promise<{ valid: boolean; referralCode?: ReferralCode; error?: string }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('business_id', businessId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!data) {
    return { valid: false, error: 'Invalid referral code' };
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'Referral code has expired' };
  }

  return { valid: true, referralCode: transformReferralCode(data) };
}

// Create referral from code
export async function createReferral(
  businessId: string,
  referralCode: string,
  referee: {
    name: string;
    email?: string;
    phone?: string;
  }
): Promise<{ success: boolean; referral?: Referral; error?: string }> {
  try {
    const supabase = await createClient();

    // Find the referral code
    const { data: codeRecord } = await supabase
      .from('referral_codes')
      .select('id, customer_id')
      .eq('business_id', businessId)
      .eq('code', referralCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!codeRecord) {
      return { success: false, error: 'Invalid referral code' };
    }

    // Get referral settings
    const { data: settings } = await supabase
      .from('referral_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    // Create the referral
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        business_id: businessId,
        referrer_customer_id: codeRecord.customer_id,
        referral_code_id: codeRecord.id,
        referee_name: referee.name,
        referee_email: referee.email,
        referee_phone: referee.phone,
        referrer_reward_amount: settings?.referrer_reward_amount || 50,
        referee_reward_amount: settings?.referee_reward_amount || 25,
        source: 'code',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, referral: transformReferral(referral) };
  } catch (error: any) {
    console.error('Error creating referral:', error);
    return { success: false, error: error.message };
  }
}

// Convert referral (when job is completed)
export async function convertReferral(
  referralId: string,
  jobId: string,
  jobValue: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get referral and settings
    const { data: referral } = await supabase
      .from('referrals')
      .select('*, referral_code:referral_codes(*)')
      .eq('id', referralId)
      .single();

    if (!referral || referral.status !== 'pending') {
      return { success: false, error: 'Referral not found or already converted' };
    }

    const { data: settings } = await supabase
      .from('referral_settings')
      .select('*')
      .eq('business_id', referral.business_id)
      .single();

    // Check minimum job value
    if (settings?.minimum_job_value && jobValue < settings.minimum_job_value) {
      return { success: false, error: 'Job value below minimum for referral reward' };
    }

    // Update referral status
    await supabase
      .from('referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        converted_job_id: jobId,
        job_value: jobValue,
      })
      .eq('id', referralId);

    // Update referral code stats
    if (referral.referral_code_id && referral.referral_code) {
      await supabase
        .from('referral_codes')
        .update({
          times_used: (referral.referral_code.times_used || 0) + 1,
          total_value_generated:
            (referral.referral_code.total_value_generated || 0) + jobValue,
        })
        .eq('id', referral.referral_code_id);
    }

    // Issue rewards
    await issueReferralReward(referralId);

    return { success: true };
  } catch (error: any) {
    console.error('Error converting referral:', error);
    return { success: false, error: error.message };
  }
}

// Issue referral reward to referrer
async function issueReferralReward(referralId: string): Promise<void> {
  const supabase = await createClient();

  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single();

  if (!referral) return;

  // Add credit to referrer's account
  await addCustomerCredit(
    referral.referrer_customer_id,
    referral.business_id,
    referral.referrer_reward_amount,
    'referral_reward',
    `Referral reward for ${referral.referee_name}`,
    referralId
  );

  // Update referral reward status
  await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      referrer_reward_status: 'issued',
      referrer_reward_issued_at: new Date().toISOString(),
    })
    .eq('id', referralId);
}

// Add credit to customer account
export async function addCustomerCredit(
  customerId: string,
  businessId: string,
  amount: number,
  type: string,
  description: string,
  referralId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Get or create credit record
    const { data: credit } = await supabase
      .from('customer_credits')
      .select('balance')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .single();

    const newBalance = (credit?.balance || 0) + amount;

    await supabase.from('customer_credits').upsert(
      {
        customer_id: customerId,
        business_id: businessId,
        balance: newBalance,
      },
      {
        onConflict: 'customer_id,business_id',
      }
    );

    // Record transaction
    await supabase.from('credit_transactions').insert({
      customer_id: customerId,
      business_id: businessId,
      amount,
      balance_after: newBalance,
      transaction_type: type,
      description,
      referral_id: referralId,
    });

    return { success: true, newBalance };
  } catch (error: any) {
    console.error('Error adding customer credit:', error);
    return { success: false, newBalance: 0, error: error.message };
  }
}

// Redeem customer credit on invoice
export async function redeemCredit(
  customerId: string,
  businessId: string,
  amount: number,
  invoiceId: string
): Promise<{ success: boolean; amountRedeemed: number; newBalance: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current balance
    const { data: credit } = await supabase
      .from('customer_credits')
      .select('balance')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .single();

    const currentBalance = credit?.balance || 0;
    if (currentBalance <= 0) {
      return { success: false, amountRedeemed: 0, newBalance: 0, error: 'No credit available' };
    }

    // Redeem up to available balance or requested amount
    const amountToRedeem = Math.min(amount, currentBalance);
    const newBalance = currentBalance - amountToRedeem;

    await supabase
      .from('customer_credits')
      .update({ balance: newBalance })
      .eq('customer_id', customerId)
      .eq('business_id', businessId);

    // Record transaction
    await supabase.from('credit_transactions').insert({
      customer_id: customerId,
      business_id: businessId,
      amount: -amountToRedeem,
      balance_after: newBalance,
      transaction_type: 'redemption',
      description: `Applied to invoice`,
      invoice_id: invoiceId,
    });

    return { success: true, amountRedeemed: amountToRedeem, newBalance };
  } catch (error: any) {
    console.error('Error redeeming credit:', error);
    return { success: false, amountRedeemed: 0, newBalance: 0, error: error.message };
  }
}

// Get customer's credit balance
export async function getCustomerCreditBalance(
  customerId: string,
  businessId: string
): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customer_credits')
    .select('balance')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  return data?.balance || 0;
}

// Get customer's referral stats
export async function getCustomerReferralStats(customerId: string, businessId: string) {
  const supabase = await createClient();

  const [{ data: referrals }, { data: code }, { data: credit }] = await Promise.all([
    supabase
      .from('referrals')
      .select('status, job_value')
      .eq('referrer_customer_id', customerId)
      .eq('business_id', businessId),
    supabase
      .from('referral_codes')
      .select('code, times_used, total_value_generated')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('customer_credits')
      .select('balance')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .single(),
  ]);

  const totalReferrals = referrals?.length || 0;
  const convertedReferrals =
    referrals?.filter((r) => r.status === 'converted' || r.status === 'rewarded').length || 0;
  const totalValueGenerated = referrals?.reduce((sum, r) => sum + (r.job_value || 0), 0) || 0;

  return {
    referralCode: code?.code || null,
    totalReferrals,
    convertedReferrals,
    conversionRate: totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0,
    totalValueGenerated,
    creditBalance: credit?.balance || 0,
  };
}

// Get all referrals for a business
export async function getBusinessReferrals(
  businessId: string,
  status?: string
): Promise<Referral[]> {
  const supabase = await createClient();

  let query = supabase
    .from('referrals')
    .select(
      `
      *,
      referrer:customers!referrals_referrer_customer_id_fkey(id, name, email),
      referee:customers!referrals_referee_customer_id_fkey(id, name, email)
    `
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;

  return (data || []).map(transformReferral);
}

// Get referral report
export async function getReferralReport(
  businessId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data: referrals } = await supabase
    .from('referrals')
    .select('status, job_value, referrer_reward_amount, created_at')
    .eq('business_id', businessId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const stats = {
    totalReferrals: referrals?.length || 0,
    pendingReferrals: 0,
    convertedReferrals: 0,
    totalJobValue: 0,
    totalRewardsIssued: 0,
    conversionRate: 0,
  };

  referrals?.forEach((r) => {
    if (r.status === 'pending') {
      stats.pendingReferrals++;
    } else if (r.status === 'converted' || r.status === 'rewarded') {
      stats.convertedReferrals++;
      stats.totalJobValue += r.job_value || 0;
      if (r.status === 'rewarded') {
        stats.totalRewardsIssued += r.referrer_reward_amount || 0;
      }
    }
  });

  stats.conversionRate =
    stats.totalReferrals > 0
      ? (stats.convertedReferrals / stats.totalReferrals) * 100
      : 0;

  return stats;
}

// Helper functions to transform database rows
function transformSettings(row: any): ReferralSettings {
  return {
    id: row.id,
    businessId: row.business_id,
    isEnabled: row.is_enabled,
    referrerRewardType: row.referrer_reward_type,
    referrerRewardAmount: parseFloat(row.referrer_reward_amount || 0),
    refereeRewardType: row.referee_reward_type,
    refereeRewardAmount: parseFloat(row.referee_reward_amount || 0),
    minimumJobValue: parseFloat(row.minimum_job_value || 0),
    requireJobCompletion: row.require_job_completion,
    maxReferralsPerCustomer: row.max_referrals_per_customer,
    rewardExpiryDays: row.reward_expiry_days,
  };
}

function transformReferralCode(row: any): ReferralCode {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    code: row.code,
    timesUsed: row.times_used,
    totalValueGenerated: parseFloat(row.total_value_generated || 0),
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function transformReferral(row: any): Referral {
  return {
    id: row.id,
    businessId: row.business_id,
    referrerCustomerId: row.referrer_customer_id,
    referralCodeId: row.referral_code_id,
    refereeCustomerId: row.referee_customer_id,
    refereeName: row.referee_name,
    refereeEmail: row.referee_email,
    refereePhone: row.referee_phone,
    status: row.status,
    convertedAt: row.converted_at,
    convertedJobId: row.converted_job_id,
    jobValue: row.job_value ? parseFloat(row.job_value) : null,
    referrerRewardAmount: parseFloat(row.referrer_reward_amount || 0),
    referrerRewardStatus: row.referrer_reward_status,
    referrerRewardIssuedAt: row.referrer_reward_issued_at,
    refereeRewardAmount: parseFloat(row.referee_reward_amount || 0),
    refereeRewardStatus: row.referee_reward_status,
    source: row.source,
    createdAt: row.created_at,
  };
}
