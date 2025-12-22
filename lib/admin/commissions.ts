// =====================================================
// ADMIN COMMISSIONS MANAGEMENT
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { Commission, CommissionRule, CommissionStatus, CommissionType, RetentionTracking } from './types';

/**
 * Get commission rules for a plan
 */
export async function getCommissionRules(
  planType: string,
  billingInterval: string
): Promise<CommissionRule | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('plan_type', planType)
    .eq('billing_interval', billingInterval)
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all commissions with filters
 */
export async function getCommissions(
  options: {
    agentId?: string;
    status?: CommissionStatus;
    type?: CommissionType;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ commissions: Commission[]; total: number }> {
  const supabase = createAdminClient();
  const { agentId, status, type, page = 1, limit = 25 } = options;

  let query = supabase
    .from('commissions')
    .select(`
      *,
      agent:admin_users!commissions_agent_id_fkey(id, full_name, email),
      crm_account:crm_accounts(id, business_name, email),
      web_customer:web_customers(id, business_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (type) {
    query = query.eq('commission_type', type);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { commissions: data || [], total: count || 0 };
}

/**
 * Get pending commissions ready for approval
 */
export async function getPendingCommissions(): Promise<Commission[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('commissions')
    .select(`
      *,
      agent:admin_users!commissions_agent_id_fkey(id, full_name, email),
      crm_account:crm_accounts(id, business_name),
      web_customer:web_customers(id, business_name)
    `)
    .eq('status', 'eligible')
    .order('eligible_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get commission summary for an agent
 */
export async function getAgentCommissionSummary(agentId: string): Promise<{
  pending: number;
  eligible: number;
  paidThisMonth: number;
  paidYtd: number;
  totalEarned: number;
}> {
  const supabase = createAdminClient();

  const { data: commissions } = await supabase
    .from('commissions')
    .select('status, commission_amount, paid_at')
    .eq('agent_id', agentId);

  const all = commissions || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return {
    pending: all.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    eligible: all.filter(c => c.status === 'eligible').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    paidThisMonth: all
      .filter(c => c.status === 'paid' && c.paid_at && new Date(c.paid_at) >= startOfMonth)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0),
    paidYtd: all
      .filter(c => c.status === 'paid' && c.paid_at && new Date(c.paid_at) >= startOfYear)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0),
    totalEarned: all
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0),
  };
}

/**
 * Create a commission record
 */
export async function createCommission(data: {
  agentId: string;
  crmAccountId?: string;
  webCustomerId?: string;
  stripeSubscriptionId?: string;
  saleType: string;
  planType: string;
  planTier?: string;
  billingInterval: string;
  saleAmount: number;
  commissionType: CommissionType;
  commissionRate?: number;
  commissionAmount: number;
  paymentNumber?: number;
  retentionMilestone?: string;
  saleDate: Date;
}): Promise<Commission> {
  const supabase = createAdminClient();

  const { data: commission, error } = await supabase
    .from('commissions')
    .insert({
      agent_id: data.agentId,
      crm_account_id: data.crmAccountId,
      web_customer_id: data.webCustomerId,
      stripe_subscription_id: data.stripeSubscriptionId,
      sale_type: data.saleType,
      plan_type: data.planType,
      plan_tier: data.planTier,
      billing_interval: data.billingInterval,
      sale_amount: data.saleAmount,
      commission_type: data.commissionType,
      commission_rate: data.commissionRate,
      commission_amount: data.commissionAmount,
      payment_number: data.paymentNumber,
      retention_milestone: data.retentionMilestone,
      status: 'pending',
      sale_date: data.saleDate.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return commission;
}

/**
 * Create upfront commission (pending until 2nd payment)
 */
export async function createUpfrontCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  saleDate: Date
): Promise<Commission> {
  if (!rules.upfront_amount) {
    throw new Error('No upfront amount defined for this plan');
  }

  return createCommission({
    agentId,
    crmAccountId: accountType === 'crm' ? accountId : undefined,
    webCustomerId: accountType === 'web' ? accountId : undefined,
    stripeSubscriptionId,
    saleType: rules.plan_type.split('_')[0],
    planType: rules.plan_type,
    planTier: rules.plan_tier,
    billingInterval: 'month',
    saleAmount,
    commissionType: 'upfront',
    commissionAmount: rules.upfront_amount,
    saleDate,
  });
}

/**
 * Create recurring commission
 */
export async function createRecurringCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  paymentNumber: number,
  firstPaymentDate: Date
): Promise<Commission> {
  const commissionAmount = saleAmount * Number(rules.recurring_rate);

  const commission = await createCommission({
    agentId,
    crmAccountId: accountType === 'crm' ? accountId : undefined,
    webCustomerId: accountType === 'web' ? accountId : undefined,
    stripeSubscriptionId,
    saleType: rules.plan_type.split('_')[0],
    planType: rules.plan_type,
    planTier: rules.plan_tier,
    billingInterval: 'month',
    saleAmount,
    commissionType: 'recurring',
    commissionRate: Number(rules.recurring_rate),
    commissionAmount,
    paymentNumber,
    saleDate: firstPaymentDate,
  });

  // Recurring commissions are immediately eligible
  await markCommissionEligible(commission.id);

  return commission;
}

/**
 * Create annual commission (35% one-time)
 */
export async function createAnnualCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  saleDate: Date
): Promise<Commission> {
  const commissionAmount = saleAmount * Number(rules.annual_rate);

  const commission = await createCommission({
    agentId,
    crmAccountId: accountType === 'crm' ? accountId : undefined,
    webCustomerId: accountType === 'web' ? accountId : undefined,
    stripeSubscriptionId,
    saleType: rules.plan_type.split('_')[0],
    planType: rules.plan_type,
    planTier: rules.plan_tier,
    billingInterval: 'year',
    saleAmount,
    commissionType: 'annual_onetime',
    commissionRate: Number(rules.annual_rate),
    commissionAmount,
    saleDate,
  });

  // Annual commissions are immediately eligible
  await markCommissionEligible(commission.id);

  return commission;
}

/**
 * Create retention bonus commission
 */
export async function createRetentionCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  milestone: string,
  bonusAmount: number,
  firstPaymentDate: Date
): Promise<Commission> {
  const commission = await createCommission({
    agentId,
    crmAccountId: accountType === 'crm' ? accountId : undefined,
    webCustomerId: accountType === 'web' ? accountId : undefined,
    stripeSubscriptionId,
    saleType: 'retention',
    planType: 'retention',
    billingInterval: 'month',
    saleAmount: 0,
    commissionType: 'retention',
    commissionAmount: bonusAmount,
    retentionMilestone: milestone,
    saleDate: firstPaymentDate,
  });

  // Retention commissions are immediately eligible
  await markCommissionEligible(commission.id);

  return commission;
}

/**
 * Mark commission as eligible for payment
 */
export async function markCommissionEligible(commissionId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('commissions')
    .update({
      status: 'eligible',
      eligible_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId);
}

/**
 * Approve a commission
 */
export async function approveCommission(
  commissionId: string,
  approvedBy: string
): Promise<Commission> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('commissions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .eq('status', 'eligible')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch approve commissions
 */
export async function batchApproveCommissions(
  commissionIds: string[],
  approvedBy: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of commissionIds) {
    try {
      await approveCommission(id, approvedBy);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Mark commission as paid
 */
export async function markCommissionPaid(
  commissionId: string,
  paidVia: string,
  paymentReference?: string
): Promise<Commission> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('commissions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_via: paidVia,
      payment_reference: paymentReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .eq('status', 'approved')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch pay commissions
 */
export async function batchPayCommissions(
  commissionIds: string[],
  paidVia: string,
  paymentReference?: string
): Promise<{ success: number; failed: number; totalAmount: number }> {
  const supabase = createAdminClient();
  let success = 0;
  let failed = 0;
  let totalAmount = 0;

  for (const id of commissionIds) {
    try {
      const commission = await markCommissionPaid(id, paidVia, paymentReference);
      totalAmount += Number(commission.commission_amount);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed, totalAmount };
}

/**
 * Forfeit a commission
 */
export async function forfeitCommission(
  commissionId: string,
  reason: 'customer_cancelled' | 'refunded' | 'chargeback' | 'clawback'
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('commissions')
    .update({
      status: 'forfeited',
      forfeited_at: new Date().toISOString(),
      forfeiture_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .in('status', ['pending', 'eligible']);
}

/**
 * Forfeit all commissions for a subscription
 */
export async function forfeitSubscriptionCommissions(
  stripeSubscriptionId: string,
  reason: 'customer_cancelled' | 'refunded' | 'chargeback' | 'clawback'
): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('commissions')
    .update({
      status: 'forfeited',
      forfeited_at: new Date().toISOString(),
      forfeiture_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .in('status', ['pending', 'eligible'])
    .select();

  return data?.length || 0;
}

/**
 * Get retention tracking for an account
 */
export async function getRetentionTracking(
  accountId: string,
  accountType: 'crm' | 'web'
): Promise<RetentionTracking | null> {
  const supabase = createAdminClient();

  const field = accountType === 'crm' ? 'crm_account_id' : 'web_customer_id';
  const { data, error } = await supabase
    .from('retention_tracking')
    .select('*')
    .eq(field, accountId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Create or update retention tracking
 */
export async function upsertRetentionTracking(
  accountId: string,
  accountType: 'crm' | 'web',
  agentId: string,
  updates: Partial<RetentionTracking>
): Promise<RetentionTracking> {
  const supabase = createAdminClient();

  const field = accountType === 'crm' ? 'crm_account_id' : 'web_customer_id';

  const { data, error } = await supabase
    .from('retention_tracking')
    .upsert({
      [field]: accountId,
      agent_id: agentId,
      ...updates,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: field,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark Month 3 call completed
 */
export async function completeMonth3Call(
  accountId: string,
  accountType: 'crm' | 'web',
  agentId: string,
  notes: string
): Promise<void> {
  const supabase = createAdminClient();

  await upsertRetentionTracking(accountId, accountType, agentId, {
    month_3_call_completed: true,
    month_3_call_date: new Date().toISOString(),
    month_3_call_notes: notes,
  });
}

/**
 * Mark Month 3 audit sent
 */
export async function sendMonth3Audit(
  accountId: string,
  accountType: 'crm' | 'web',
  agentId: string
): Promise<void> {
  const supabase = createAdminClient();

  const tracking = await getRetentionTracking(accountId, accountType);

  if (!tracking?.month_3_call_completed) {
    throw new Error('Must complete Month 3 call before sending audit');
  }

  await upsertRetentionTracking(accountId, accountType, agentId, {
    month_3_audit_sent: true,
  });

  // Get commission rules
  const { data: account } = await supabase
    .from(accountType === 'crm' ? 'crm_accounts' : 'web_customers')
    .select('plan_type, stripe_subscription_id')
    .eq('id', accountId)
    .single();

  if (account) {
    const rules = await getCommissionRules(account.plan_type, 'month');
    if (rules?.month_3_call_bonus) {
      // Create the Month 3 call bonus
      await createRetentionCommission(
        agentId,
        accountId,
        accountType,
        account.stripe_subscription_id,
        'month_3_call',
        rules.month_3_call_bonus,
        new Date()
      );

      // Mark as paid
      await upsertRetentionTracking(accountId, accountType, agentId, {
        month_3_bonus_paid: true,
      });
    }
  }
}

/**
 * Get retention tasks due for an agent
 */
export async function getRetentionTasks(agentId?: string): Promise<{
  month3Calls: any[];
  month6Checks: any[];
  month12Checks: any[];
}> {
  const supabase = createAdminClient();

  // Get accounts that are approaching milestones
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());

  let query = supabase
    .from('crm_accounts')
    .select('*, retention:retention_tracking(*)')
    .eq('status', 'active')
    .eq('billing_interval', 'month');

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: accounts } = await query;

  const month3Calls: any[] = [];
  const month6Checks: any[] = [];
  const month12Checks: any[] = [];

  for (const account of accounts || []) {
    const createdAt = new Date(account.created_at);
    const retention = Array.isArray(account.retention) ? account.retention[0] : account.retention;

    // Month 3 calls (accounts created ~3 months ago, call not completed)
    if (createdAt <= threeMonthsAgo && (!retention || !retention.month_3_call_completed)) {
      month3Calls.push({
        ...account,
        dueDate: new Date(createdAt.getFullYear(), createdAt.getMonth() + 3, createdAt.getDate()),
      });
    }

    // Month 6 checks
    if (createdAt <= sixMonthsAgo && (!retention || !retention.month_6_retained)) {
      month6Checks.push({
        ...account,
        dueDate: new Date(createdAt.getFullYear(), createdAt.getMonth() + 6, createdAt.getDate()),
      });
    }

    // Month 12 checks
    if (createdAt <= twelveMonthsAgo && (!retention || !retention.month_12_retained)) {
      month12Checks.push({
        ...account,
        dueDate: new Date(createdAt.getFullYear(), createdAt.getMonth() + 12, createdAt.getDate()),
      });
    }
  }

  return { month3Calls, month6Checks, month12Checks };
}

/**
 * Calculate performance bonus (10+ deals)
 */
export async function calculatePerformanceBonus(
  agentId: string,
  year: number,
  month: number
): Promise<{ eligible: boolean; dealCount: number; revenueGenerated: number; bonusAmount: number }> {
  const supabase = createAdminClient();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  // Count deals closed this month
  const { data: commissions } = await supabase
    .from('commissions')
    .select('sale_amount')
    .eq('agent_id', agentId)
    .in('commission_type', ['upfront', 'annual_onetime'])
    .gte('sale_date', startOfMonth.toISOString())
    .lte('sale_date', endOfMonth.toISOString());

  const dealCount = commissions?.length || 0;
  const revenueGenerated = (commissions || []).reduce((sum, c) => sum + Number(c.sale_amount), 0);

  // 10+ deals = 10% bonus on revenue
  const eligible = dealCount >= 10;
  const bonusAmount = eligible ? revenueGenerated * 0.10 : 0;

  return { eligible, dealCount, revenueGenerated, bonusAmount };
}
