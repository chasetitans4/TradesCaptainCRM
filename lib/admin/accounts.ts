// =====================================================
// ADMIN ACCOUNTS MANAGEMENT
// CRM Accounts and Web Customers
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { CrmAccount, WebCustomer, CreateAccountInput, AccountStatus, BillingInterval } from './types';
import { generateCouponCode } from './coupons';

// Plan pricing (should match commission_rules)
export const PLAN_PRICING: Record<string, { monthly: number; annual: number; users: number }> = {
  // Blue Plans - Individuals
  blue_starter: { monthly: 49, annual: 441, users: 1 },
  blue_pro: { monthly: 99, annual: 891, users: 1 },
  blue_enterprise: { monthly: 199, annual: 1791, users: 1 },
  // Blue Plans - Teams
  blue_starter_teams: { monthly: 149, annual: 1341, users: 5 },
  blue_pro_teams: { monthly: 199, annual: 1791, users: 10 },
  blue_enterprise_teams: { monthly: 399, annual: 3591, users: 20 },
  // Web Plans
  web_starter: { monthly: 199, annual: 1791, users: 1 },
  web_pro: { monthly: 299, annual: 2691, users: 1 },
  web_enterprise: { monthly: 499, annual: 4491, users: 1 },
  // Gold Plans - Individuals
  gold_starter: { monthly: 299, annual: 2691, users: 1 },
  gold_pro: { monthly: 399, annual: 3591, users: 1 },
  gold_enterprise: { monthly: 598, annual: 5382, users: 1 },
  // Gold Plans - Teams
  gold_starter_teams: { monthly: 299, annual: 2691, users: 5 },
  gold_pro_teams: { monthly: 449, annual: 4041, users: 10 },
  gold_enterprise_teams: { monthly: 749, annual: 6741, users: 20 },
  // Add-on
  extra_location: { monthly: 199, annual: 1791, users: 0 },
};

/**
 * Get all CRM accounts with filters
 */
export async function getCrmAccounts(
  options: {
    agentId?: string;
    status?: AccountStatus;
    planType?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ accounts: CrmAccount[]; total: number }> {
  const supabase = createAdminClient();
  const { agentId, status, planType, search, page = 1, limit = 25 } = options;

  let query = supabase
    .from('crm_accounts')
    .select('*, agent:admin_users!crm_accounts_agent_id_fkey(id, full_name, email)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (planType) {
    query = query.eq('plan_type', planType);
  }
  if (search) {
    query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { accounts: data || [], total: count || 0 };
}

/**
 * Get a single CRM account
 */
export async function getCrmAccount(accountId: string): Promise<CrmAccount | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_accounts')
    .select('*, agent:admin_users!crm_accounts_agent_id_fkey(id, full_name, email)')
    .eq('id', accountId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Create a CRM account
 */
export async function createCrmAccount(
  data: CreateAccountInput,
  agentId: string,
  options: {
    isTrial?: boolean;
    promoType?: 'self_serve_trial' | 'free_with_web';
    webCustomerId?: string;
    couponId?: string;
    leadId?: string;
  } = {}
): Promise<CrmAccount> {
  const supabase = createAdminClient();

  const pricing = PLAN_PRICING[data.plan_type];
  if (!pricing && !data.custom_quote_amount) {
    throw new Error(`Unknown plan type: ${data.plan_type}`);
  }

  const monthlyAmount = data.billing_interval === 'year'
    ? (pricing?.annual || data.custom_quote_amount || 0) / 12
    : (pricing?.monthly || data.custom_quote_amount || 0);

  let status: AccountStatus = 'active';
  let trialEndsAt: string | undefined;
  let promoEndsAt: string | undefined;

  if (options.isTrial) {
    status = 'trial';
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    trialEndsAt = trialEnd.toISOString();
  }

  if (options.promoType === 'free_with_web') {
    const promoEnd = new Date();
    promoEnd.setFullYear(promoEnd.getFullYear() + 1);
    promoEndsAt = promoEnd.toISOString();
  }

  const planTier = data.plan_type.includes('teams') ? 'teams' :
    data.plan_type.includes('custom') ? 'custom' : 'individual';

  const { data: account, error } = await supabase
    .from('crm_accounts')
    .insert({
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      plan_type: data.plan_type,
      plan_tier: planTier,
      billing_interval: data.billing_interval,
      monthly_amount: monthlyAmount,
      user_limit: pricing?.users || 1,
      status,
      is_trial: options.isTrial || false,
      trial_ends_at: trialEndsAt,
      promo_type: options.promoType,
      promo_ends_at: promoEndsAt,
      web_customer_id: options.webCustomerId,
      coupon_id: options.couponId,
      agent_id: agentId,
      lead_id: options.leadId,
      signup_source: options.isTrial ? 'self_serve' : 'agent',
    })
    .select()
    .single();

  if (error) throw error;
  return account;
}

/**
 * Update a CRM account
 */
export async function updateCrmAccount(
  accountId: string,
  updates: Partial<CrmAccount>
): Promise<CrmAccount> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a CRM account
 */
export async function cancelCrmAccount(accountId: string): Promise<CrmAccount> {
  return updateCrmAccount(accountId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  });
}

/**
 * Suspend a CRM account
 */
export async function suspendCrmAccount(accountId: string): Promise<CrmAccount> {
  return updateCrmAccount(accountId, {
    status: 'suspended',
  });
}

/**
 * Reactivate a CRM account
 */
export async function reactivateCrmAccount(accountId: string): Promise<CrmAccount> {
  return updateCrmAccount(accountId, {
    status: 'active',
    cancelled_at: undefined,
  });
}

/**
 * Convert trial to paid
 */
export async function convertTrialToPaid(accountId: string): Promise<CrmAccount> {
  return updateCrmAccount(accountId, {
    status: 'active',
    is_trial: false,
    trial_ends_at: undefined,
  });
}

/**
 * Get all web customers
 */
export async function getWebCustomers(
  options: {
    agentId?: string;
    status?: AccountStatus;
    planType?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ customers: WebCustomer[]; total: number }> {
  const supabase = createAdminClient();
  const { agentId, status, planType, search, page = 1, limit = 25 } = options;

  let query = supabase
    .from('web_customers')
    .select('*, agent:admin_users!web_customers_agent_id_fkey(id, full_name, email)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (planType) {
    query = query.eq('plan_type', planType);
  }
  if (search) {
    query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { customers: data || [], total: count || 0 };
}

/**
 * Get a single web customer
 */
export async function getWebCustomer(customerId: string): Promise<WebCustomer | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('web_customers')
    .select('*, agent:admin_users!web_customers_agent_id_fkey(id, full_name, email)')
    .eq('id', customerId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Create a web customer
 */
export async function createWebCustomer(
  data: CreateAccountInput,
  agentId: string,
  options: {
    includeCrmBonus?: boolean;
    leadId?: string;
  } = {}
): Promise<{ customer: WebCustomer; couponCode?: string }> {
  const supabase = createAdminClient();

  const pricing = PLAN_PRICING[data.plan_type];
  const monthlyAmount = data.billing_interval === 'year'
    ? (pricing?.annual || data.custom_quote_amount || 0) / 12
    : (pricing?.monthly || data.custom_quote_amount || 0);

  const { data: customer, error } = await supabase
    .from('web_customers')
    .insert({
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      plan_type: data.plan_type,
      billing_interval: data.billing_interval,
      monthly_amount: monthlyAmount,
      custom_quote_amount: data.custom_quote_amount,
      custom_quote_notes: data.custom_quote_notes,
      extra_locations: data.extra_locations || 0,
      agent_id: agentId,
      lead_id: options.leadId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  let couponCode: string | undefined;

  // Create free CRM coupon if requested
  if (options.includeCrmBonus) {
    couponCode = await generateCouponCode(data.plan_type, data.business_name);

    await supabase.from('crm_coupons').insert({
      code: couponCode,
      web_customer_id: customer.id,
      web_plan_type: data.plan_type,
      crm_plan: 'blue_starter',
      free_months: 12,
      status: 'active',
      created_by_agent_id: agentId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days to redeem
    });

    await supabase
      .from('web_customers')
      .update({ crm_coupon_issued: true })
      .eq('id', customer.id);
  }

  return { customer, couponCode };
}

/**
 * Update a web customer
 */
export async function updateWebCustomer(
  customerId: string,
  updates: Partial<WebCustomer>
): Promise<WebCustomer> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('web_customers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a web customer
 */
export async function cancelWebCustomer(customerId: string): Promise<WebCustomer> {
  const supabase = createAdminClient();

  // Also cancel any linked CRM accounts with free_with_web promo
  await supabase
    .from('crm_accounts')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('web_customer_id', customerId)
    .eq('promo_type', 'free_with_web');

  // Revoke any active coupons
  await supabase
    .from('crm_coupons')
    .update({ status: 'revoked' })
    .eq('web_customer_id', customerId)
    .eq('status', 'active');

  return updateWebCustomer(customerId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  });
}

/**
 * Get dashboard stats
 */
export async function getAdminDashboardStats(): Promise<{
  mrr: number;
  mrrChange: number;
  activeCrmAccounts: number;
  activeWebCustomers: number;
  trialConversionRate: number;
  newThisMonth: number;
  churnedThisMonth: number;
  pendingCommissions: number;
  agentCount: number;
}> {
  const supabase = createAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get CRM accounts
  const { data: crmAccounts } = await supabase
    .from('crm_accounts')
    .select('status, monthly_amount, created_at, is_trial, cancelled_at')
    .is('deleted_at', null);

  // Get web customers
  const { data: webCustomers } = await supabase
    .from('web_customers')
    .select('status, monthly_amount, created_at, cancelled_at')
    .is('deleted_at', null);

  // Get pending commissions
  const { data: commissions } = await supabase
    .from('commissions')
    .select('commission_amount')
    .eq('status', 'eligible');

  // Get agent count
  const { count: agentCount } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'agent')
    .eq('status', 'active');

  const crm = crmAccounts || [];
  const web = webCustomers || [];

  // Calculate MRR
  const crmMrr = crm.filter(a => a.status === 'active').reduce((sum, a) => sum + Number(a.monthly_amount || 0), 0);
  const webMrr = web.filter(c => c.status === 'active').reduce((sum, c) => sum + Number(c.monthly_amount || 0), 0);
  const mrr = crmMrr + webMrr;

  // Calculate last month MRR (simplified)
  const lastMonthCrmActive = crm.filter(a =>
    a.status === 'active' &&
    new Date(a.created_at) < endOfLastMonth
  ).length;
  const mrrChange = lastMonthCrmActive > 0 ? ((mrr - (lastMonthCrmActive * 100)) / (lastMonthCrmActive * 100)) * 100 : 0;

  // Active counts
  const activeCrmAccounts = crm.filter(a => a.status === 'active').length;
  const activeWebCustomers = web.filter(c => c.status === 'active').length;

  // Trial conversion rate
  const totalTrials = crm.filter(a => a.is_trial).length;
  const convertedTrials = crm.filter(a => a.is_trial === false && a.status === 'active').length;
  const trialConversionRate = totalTrials > 0 ? Math.round((convertedTrials / (totalTrials + convertedTrials)) * 100) : 0;

  // New this month
  const newThisMonth = crm.filter(a => new Date(a.created_at) >= startOfMonth).length +
    web.filter(c => new Date(c.created_at) >= startOfMonth).length;

  // Churned this month
  const churnedThisMonth = crm.filter(a => a.cancelled_at && new Date(a.cancelled_at) >= startOfMonth).length +
    web.filter(c => c.cancelled_at && new Date(c.cancelled_at) >= startOfMonth).length;

  // Pending commissions
  const pendingCommissions = (commissions || []).reduce((sum, c) => sum + Number(c.commission_amount), 0);

  return {
    mrr,
    mrrChange: Math.round(mrrChange * 10) / 10,
    activeCrmAccounts,
    activeWebCustomers,
    trialConversionRate,
    newThisMonth,
    churnedThisMonth,
    pendingCommissions,
    agentCount: agentCount || 0,
  };
}

/**
 * Get agent dashboard stats
 */
export async function getAgentDashboardStats(agentId: string): Promise<{
  dealsThisMonth: number;
  revenueThisMonth: number;
  commissionsEligible: number;
  commissionsPaidYtd: number;
  activeLeads: number;
  retentionRate: number;
  dealProgress: { current: number; goal: number };
}> {
  const supabase = createAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get accounts created by agent this month
  const { data: monthlyAccounts } = await supabase
    .from('crm_accounts')
    .select('monthly_amount')
    .eq('agent_id', agentId)
    .gte('created_at', startOfMonth.toISOString());

  const { data: monthlyWeb } = await supabase
    .from('web_customers')
    .select('monthly_amount')
    .eq('agent_id', agentId)
    .gte('created_at', startOfMonth.toISOString());

  // Get commissions
  const { data: commissions } = await supabase
    .from('commissions')
    .select('commission_amount, status, paid_at')
    .eq('agent_id', agentId);

  // Get active leads
  const { count: activeLeads } = await supabase
    .from('tc_leads')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .not('status', 'in', '("won","lost","unqualified")');

  // Get retention rate
  const { data: agentAccounts } = await supabase
    .from('crm_accounts')
    .select('status')
    .eq('agent_id', agentId);

  const all = commissions || [];
  const accounts = monthlyAccounts || [];
  const webAccounts = monthlyWeb || [];
  const agentAllAccounts = agentAccounts || [];

  const dealsThisMonth = accounts.length + webAccounts.length;
  const revenueThisMonth = accounts.reduce((sum, a) => sum + Number(a.monthly_amount || 0), 0) +
    webAccounts.reduce((sum, a) => sum + Number(a.monthly_amount || 0), 0);

  const commissionsEligible = all
    .filter(c => c.status === 'eligible')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const commissionsPaidYtd = all
    .filter(c => c.status === 'paid' && c.paid_at && new Date(c.paid_at) >= startOfYear)
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalAccounts = agentAllAccounts.length;
  const activeAccounts = agentAllAccounts.filter(a => a.status === 'active').length;
  const retentionRate = totalAccounts > 0 ? Math.round((activeAccounts / totalAccounts) * 100) : 100;

  return {
    dealsThisMonth,
    revenueThisMonth,
    commissionsEligible,
    commissionsPaidYtd,
    activeLeads: activeLeads || 0,
    retentionRate,
    dealProgress: { current: dealsThisMonth, goal: 10 },
  };
}
