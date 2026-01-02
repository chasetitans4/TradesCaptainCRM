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
  billingInterval: string,
  planTier?: string
): Promise<CommissionRule | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from('commission_rules')
    .select('*')
    .eq('plan_type', planType)
    .eq('billing_interval', billingInterval)
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
  
  if (planTier) {
    query = query.eq('plan_tier', planTier);
  }
  
  const { data, error } = await query.single();

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
 * v5.9: Added scheduled_payout_date and trigger_payment_date for 1st/15th payout scheduling
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
  triggerPaymentDate?: Date;
  scheduledPayoutDate?: Date;
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
      trigger_payment_date: data.triggerPaymentDate?.toISOString(),
      scheduled_payout_date: data.scheduledPayoutDate?.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;
  return commission;
}

/**
 * Create upfront commission (pending until 2nd payment)
 * v5.9: Added triggerPaymentDate and scheduledPayoutDate for 1st/15th payout
 */
export async function createUpfrontCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  saleDate: Date,
  triggerPaymentDate?: Date,
  scheduledPayoutDate?: Date
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
    triggerPaymentDate,
    scheduledPayoutDate,
  });
}

/**
 * Create recurring commission
 * v5.9: Added triggerPaymentDate and scheduledPayoutDate for 1st/15th payout
 */
export async function createRecurringCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  paymentNumber: number,
  firstPaymentDate: Date,
  triggerPaymentDate?: Date,
  scheduledPayoutDate?: Date
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
    triggerPaymentDate,
    scheduledPayoutDate,
  });

  // Recurring commissions are immediately eligible
  await markCommissionEligible(commission.id);

  return commission;
}

/**
 * Create annual commission (35% one-time)
 * v5.9: Added triggerPaymentDate and scheduledPayoutDate for 1st/15th payout
 */
export async function createAnnualCommission(
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web',
  stripeSubscriptionId: string,
  rules: CommissionRule,
  saleAmount: number,
  saleDate: Date,
  triggerPaymentDate?: Date,
  scheduledPayoutDate?: Date
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
    triggerPaymentDate,
    scheduledPayoutDate,
  });

  // Annual commissions are immediately eligible
  await markCommissionEligible(commission.id);

  return commission;
}

/**
 * Create retention bonus commission
 * Supports both positional arguments (legacy) and options object
 */
export async function createRetentionCommission(
  agentIdOrOptions: string | {
    agentId: string;
    crmAccountId?: string;
    webCustomerId?: string;
    milestone: string;
    bonusAmount: number;
    planType?: string;
    planTier?: string;
    billingInterval?: string;
  },
  accountId?: string,
  accountType?: 'crm' | 'web',
  stripeSubscriptionId?: string,
  milestone?: string,
  bonusAmount?: number,
  firstPaymentDate?: Date
): Promise<Commission> {
  // Support options object format
  if (typeof agentIdOrOptions === 'object') {
    const opts = agentIdOrOptions;
    const commission = await createCommission({
      agentId: opts.agentId,
      crmAccountId: opts.crmAccountId,
      webCustomerId: opts.webCustomerId,
      saleType: 'retention',
      planType: opts.planType || 'retention',
      planTier: opts.planTier,
      billingInterval: opts.billingInterval || 'month',
      saleAmount: 0,
      commissionType: 'retention',
      commissionAmount: opts.bonusAmount,
      retentionMilestone: opts.milestone,
      saleDate: new Date(),
    });

    // Retention commissions are immediately eligible
    await markCommissionEligible(commission.id);
    return commission;
  }

  // Legacy positional arguments format
  const agentId = agentIdOrOptions;
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
    commissionAmount: bonusAmount!,
    retentionMilestone: milestone,
    saleDate: firstPaymentDate!,
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
      const amt = Number((commission as any).commission_amount ?? 0);
      totalAmount += isNaN(amt) ? 0 : amt;
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

  const result = await supabase
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

  const rows = Array.isArray(result) ? result : (result as any)?.data;
  return Array.isArray(rows) ? rows.length : 0;
}

/**
 * Get retention tracking for an account
 * Can be called with (accountId, accountType) or just (trackingId)
 */
export async function getRetentionTracking(
  accountIdOrTrackingId: string,
  accountType?: 'crm' | 'web'
): Promise<RetentionTracking | null> {
  const supabase = createAdminClient();

  // If accountType is provided, search by account ID
  if (accountType) {
    const field = accountType === 'crm' ? 'crm_account_id' : 'web_customer_id';
    const { data, error } = await supabase
      .from('retention_tracking')
      .select('*')
      .eq(field, accountIdOrTrackingId)
      .single();

    if (error) return null;
    return data;
  }

  // Otherwise, treat as tracking ID
  const { data, error } = await supabase
    .from('retention_tracking')
    .select('*')
    .eq('id', accountIdOrTrackingId)
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
 * Can be called with (trackingId, notes) or (accountId, accountType, agentId, notes)
 */
export async function completeMonth3Call(
  trackingIdOrAccountId: string,
  notesOrAccountType: string | 'crm' | 'web',
  agentId?: string,
  notes?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Check if called with tracking ID (2 args) or account ID (4 args)
  if (agentId === undefined) {
    // Called with (trackingId, notes) format
    const tracking = await getRetentionTracking(trackingIdOrAccountId);
    if (!tracking) {
      throw new Error('Retention tracking not found');
    }

    await supabase
      .from('retention_tracking')
      .update({
        month_3_call_completed: true,
        month_3_call_date: new Date().toISOString(),
        month_3_call_notes: notesOrAccountType as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trackingIdOrAccountId);
  } else {
    // Called with (accountId, accountType, agentId, notes) format
    await upsertRetentionTracking(trackingIdOrAccountId, notesOrAccountType as 'crm' | 'web', agentId, {
      month_3_call_completed: true,
      month_3_call_date: new Date().toISOString(),
      month_3_call_notes: notes || '',
    });
  }
}

/**
 * Mark Month 3 audit sent
 * Can be called with just (trackingId) or (accountId, accountType, agentId)
 */
export async function sendMonth3Audit(
  trackingIdOrAccountId: string,
  accountType?: 'crm' | 'web',
  agentId?: string
): Promise<void> {
  const supabase = createAdminClient();

  // If called with just trackingId (1 arg)
  if (accountType === undefined) {
    const tracking = await getRetentionTracking(trackingIdOrAccountId);
    if (!tracking) {
      throw new Error('Retention tracking not found');
    }

    if (!tracking.month_3_call_completed) {
      throw new Error('Must complete Month 3 call before sending audit');
    }

    await supabase
      .from('retention_tracking')
      .update({
        month_3_audit_sent: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trackingIdOrAccountId);

    // Handle commission if there's an agent
    if (tracking.agent_id) {
      const accountId = tracking.crm_account_id || tracking.web_customer_id;
      const acctType = tracking.crm_account_id ? 'crm' : 'web';
      if (accountId) {
        const { data: account } = await supabase
          .from(acctType === 'crm' ? 'crm_accounts' : 'web_customers')
          .select('plan_type, stripe_subscription_id')
          .eq('id', accountId)
          .single();

        if (account) {
          const rules = await getCommissionRules(account.plan_type, 'month');
          if (rules?.month_3_call_bonus) {
            await createRetentionCommission(
              tracking.agent_id,
              accountId,
              acctType,
              account.stripe_subscription_id,
              'month_3_call',
              rules.month_3_call_bonus,
              new Date()
            );

            await supabase
              .from('retention_tracking')
              .update({ month_3_bonus_paid: true })
              .eq('id', trackingIdOrAccountId);
          }
        }
      }
    }
    return;
  }

  // Called with (accountId, accountType, agentId) format
  const tracking = await getRetentionTracking(trackingIdOrAccountId, accountType);

  if (!tracking?.month_3_call_completed) {
    throw new Error('Must complete Month 3 call before sending audit');
  }

  await upsertRetentionTracking(trackingIdOrAccountId, accountType, agentId!, {
    month_3_audit_sent: true,
  });

  // Get commission rules
  const { data: account } = await supabase
    .from(accountType === 'crm' ? 'crm_accounts' : 'web_customers')
    .select('plan_type, stripe_subscription_id')
    .eq('id', trackingIdOrAccountId)
    .single();

  if (account) {
    const rules = await getCommissionRules(account.plan_type, 'month');
    if (rules?.month_3_call_bonus) {
      // Create the Month 3 call bonus
      await createRetentionCommission(
        agentId!,
        trackingIdOrAccountId,
        accountType,
        account.stripe_subscription_id,
        'month_3_call',
        rules.month_3_call_bonus,
        new Date()
      );

      // Mark as paid
      await upsertRetentionTracking(trackingIdOrAccountId, accountType, agentId!, {
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

export async function setSaleAttribution(
  accountType: 'crm' | 'web',
  accountId: string,
  attributedTo: 'company' | string,
  createdBy: string,
  saleAmount?: number,
  planType?: string,
  notes?: string
): Promise<void> {
  const supabase = createAdminClient();
  const table = accountType === 'crm' ? 'crm_accounts' : 'web_customers';
  const updates: Record<string, any> =
    attributedTo === 'company'
      ? { agent_id: null, company_sale: true, updated_at: new Date().toISOString() }
      : { agent_id: attributedTo, company_sale: false, updated_at: new Date().toISOString() };
  await supabase.from(table).update(updates).eq('id', accountId);
  const logData: Record<string, any> = {
    attributed_to: attributedTo === 'company' ? 'company' : 'agent',
    agent_id: attributedTo === 'company' ? null : attributedTo,
    created_by: createdBy,
    sale_amount: saleAmount,
    plan_type: planType,
    notes,
  };
  if (accountType === 'crm') {
    logData.crm_account_id = accountId;
  } else {
    logData.web_customer_id = accountId;
  }
  await supabase.from('sales_attribution_log').insert(logData);
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
