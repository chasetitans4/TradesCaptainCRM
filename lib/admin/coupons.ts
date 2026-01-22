// =====================================================
// ADMIN COUPON MANAGEMENT
// Free CRM with Web Plan coupons
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { CrmCoupon, CouponStatus } from './types';

/**
 * Generate a unique coupon code
 * Format: WEBPRO-SMITHP-2024-X7K2
 */
export async function generateCouponCode(
  planType: string,
  businessName: string
): Promise<string> {
  const crypto = require('crypto');

  // Plan prefix
  const planPrefix = planType.toUpperCase().replace('_', '').slice(0, 6);

  // Business name prefix (first 6 chars, alphanumeric only)
  const bizPrefix = businessName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);

  // Year
  const year = new Date().getFullYear();

  // Random suffix
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

  return `${planPrefix}-${bizPrefix}-${year}-${randomSuffix}`;
}

/**
 * Get all coupons
 */
export async function getCoupons(
  options: {
    status?: CouponStatus;
    agentId?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ coupons: CrmCoupon[]; total: number }> {
  const supabase = createAdminClient();
  const { status, agentId, page = 1, limit = 25 } = options;

  let query = supabase
    .from('crm_coupons')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (agentId) {
    query = query.eq('created_by_agent_id', agentId);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    // Table might not exist yet, return empty
    return { coupons: [], total: 0 };
  }

  return { coupons: data || [], total: count || 0 };
}

/**
 * Get coupon by code
 */
export async function getCouponByCode(code: string): Promise<CrmCoupon | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) return null;
  return data;
}

/**
 * Validate a coupon code
 */
export async function validateCoupon(code: string): Promise<{
  valid: boolean;
  coupon?: CrmCoupon;
  error?: string;
}> {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }

  if (coupon.status !== 'active') {
    if (coupon.status === 'redeemed') {
      return { valid: false, error: 'This coupon has already been redeemed' };
    }
    if (coupon.status === 'expired') {
      return { valid: false, error: 'This coupon has expired' };
    }
    if (coupon.status === 'revoked') {
      return { valid: false, error: 'This coupon is no longer valid' };
    }
    return { valid: false, error: 'Invalid coupon status' };
  }

  // Check expiration
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    // Update status to expired
    await updateCouponStatus(coupon.id, 'expired');
    return { valid: false, error: 'This coupon has expired' };
  }

  // Check if web plan is still active
  const supabase = createAdminClient();
  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('status')
    .eq('id', coupon.web_customer_id)
    .single();

  if (!webCustomer || webCustomer.status !== 'active') {
    return { valid: false, error: 'The associated web plan is no longer active' };
  }

  return { valid: true, coupon };
}

/**
 * Redeem a coupon (create free CRM account)
 */
export async function redeemCoupon(
  code: string,
  accountData: {
    business_name: string;
    contact_name: string;
    email: string;
    phone?: string;
  }
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const validation = await validateCoupon(code);

  if (!validation.valid || !validation.coupon) {
    return { success: false, error: validation.error };
  }

  const coupon = validation.coupon;
  const supabase = createAdminClient();

  try {
    // Calculate promo end date (12 months free)
    const promoEndsAt = new Date();
    promoEndsAt.setMonth(promoEndsAt.getMonth() + coupon.free_months);

    // Create CRM account with free_with_web promo
    const { data: account, error: accountError } = await supabase
      .from('crm_accounts')
      .insert({
        business_name: accountData.business_name,
        contact_name: accountData.contact_name,
        email: accountData.email.toLowerCase(),
        phone: accountData.phone,
        plan_type: coupon.crm_plan,
        plan_tier: 'individual',
        billing_interval: 'month',
        monthly_amount: 0, // Free during promo
        user_limit: 1,
        status: 'active',
        is_trial: false,
        promo_type: 'free_with_web',
        promo_ends_at: promoEndsAt.toISOString(),
        web_customer_id: coupon.web_customer_id,
        coupon_id: coupon.id,
        signup_source: 'agent',
      })
      .select()
      .single();

    if (accountError) throw accountError;

    // Update coupon status
    await supabase
      .from('crm_coupons')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_by_account_id: account.id,
      })
      .eq('id', coupon.id);

    // Update web customer
    await supabase
      .from('web_customers')
      .update({ crm_coupon_id: coupon.id })
      .eq('id', coupon.web_customer_id);

    return { success: true, accountId: account.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to redeem coupon' };
  }
}

/**
 * Update coupon status
 */
export async function updateCouponStatus(
  couponId: string,
  status: CouponStatus
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('crm_coupons')
    .update({ status })
    .eq('id', couponId);
}

/**
 * Revoke a coupon
 */
export async function revokeCoupon(couponId: string): Promise<void> {
  await updateCouponStatus(couponId, 'revoked');
}

/**
 * Create a new coupon manually
 */
export async function createCoupon(data: {
  webCustomerId: string;
  webPlanType: string;
  crmPlan?: string;
  freeMonths?: number;
  agentId?: string;
}): Promise<CrmCoupon> {
  const supabase = createAdminClient();

  // Get web customer for business name
  const { data: webCustomer } = await supabase
    .from('web_customers')
    .select('business_name')
    .eq('id', data.webCustomerId)
    .single();

  const code = await generateCouponCode(
    data.webPlanType,
    webCustomer?.business_name || 'CUSTOM'
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days to redeem

  const { data: coupon, error } = await supabase
    .from('crm_coupons')
    .insert({
      code,
      web_customer_id: data.webCustomerId,
      web_plan_type: data.webPlanType,
      crm_plan: data.crmPlan || 'blue_starter',
      free_months: data.freeMonths || 12,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_by_agent_id: data.agentId,
    })
    .select()
    .single();

  if (error) throw error;
  return coupon;
}

/**
 * Get coupons expiring soon
 */
export async function getExpiringCoupons(daysAhead: number = 7): Promise<CrmCoupon[]> {
  const supabase = createAdminClient();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('crm_coupons')
    .select('*')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lte('expires_at', futureDate.toISOString())
    .order('expires_at', { ascending: true });

  if (error) {
    // Table might not exist yet, return empty
    return [];
  }
  return data || [];
}
