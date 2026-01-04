// =====================================================
// RETENTION TRACKING CRON JOB
// Runs daily to check retention milestones and create bonuses
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createRetentionCommission } from '@/lib/admin/commissions';
import { apiLogger } from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // SECURITY: Verify authorization - require CRON_SECRET to be configured
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    apiLogger.error({ msg: 'CRON_SECRET not configured - denying cron access' });
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = {
    month4Bonuses: 0,
    month6Bonuses: 0,
    month12Bonuses: 0,
    expiredCoupons: 0,
    errors: [] as string[],
  };

  try {
    // === CHECK MONTH 4 RETENTION ===
    // Find accounts that have been active for 4+ months and haven't had month_4 checked
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    const { data: month4Accounts } = await supabase
      .from('retention_tracking')
      .select(`
        *,
        crm_account:crm_accounts(id, status, created_at, agent_id, plan_type, plan_tier, billing_interval),
        web_customer:web_customers(id, status, created_at, agent_id, plan_type, billing_interval)
      `)
      .eq('month_4_retained', false)
      .eq('month_3_call_completed', true);

    for (const tracking of month4Accounts || []) {
      const account = tracking.crm_account || tracking.web_customer;
      if (!account) continue;

      const createdAt = new Date(account.created_at);
      const monthsSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      if (monthsSinceCreation >= 4 && account.status === 'active') {
        try {
          // Customer retained at month 4!
          await supabase
            .from('retention_tracking')
            .update({
              month_4_retained: true,
              month_4_payment_date: new Date().toISOString(),
            })
            .eq('id', tracking.id);

          // Create retention bonus
          if (account.agent_id) {
            await createRetentionCommission({
              agentId: account.agent_id,
              crmAccountId: tracking.crm_account_id,
              webCustomerId: tracking.web_customer_id,
              milestone: 'month_4',
              bonusAmount: 25, // $25 month 4 bonus
              planType: account.plan_type,
              planTier: account.plan_tier,
              billingInterval: account.billing_interval,
            });
          }

          results.month4Bonuses++;
        } catch (err: any) {
          results.errors.push(`Month 4 bonus error for ${tracking.id}: ${err.message}`);
        }
      }
    }

    // === CHECK MONTH 6 RETENTION ===
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: month6Accounts } = await supabase
      .from('retention_tracking')
      .select(`
        *,
        crm_account:crm_accounts(id, status, created_at, agent_id, plan_type, plan_tier, billing_interval),
        web_customer:web_customers(id, status, created_at, agent_id, plan_type, billing_interval)
      `)
      .eq('month_6_retained', false)
      .eq('month_4_retained', true);

    for (const tracking of month6Accounts || []) {
      const account = tracking.crm_account || tracking.web_customer;
      if (!account) continue;

      const createdAt = new Date(account.created_at);
      const monthsSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      if (monthsSinceCreation >= 6 && account.status === 'active') {
        try {
          await supabase
            .from('retention_tracking')
            .update({
              month_6_retained: true,
              month_6_payment_date: new Date().toISOString(),
            })
            .eq('id', tracking.id);

          if (account.agent_id) {
            await createRetentionCommission({
              agentId: account.agent_id,
              crmAccountId: tracking.crm_account_id,
              webCustomerId: tracking.web_customer_id,
              milestone: 'month_6',
              bonusAmount: 50, // $50 month 6 bonus
              planType: account.plan_type,
              planTier: account.plan_tier,
              billingInterval: account.billing_interval,
            });
          }

          results.month6Bonuses++;
        } catch (err: any) {
          results.errors.push(`Month 6 bonus error for ${tracking.id}: ${err.message}`);
        }
      }
    }

    // === CHECK MONTH 12 RETENTION ===
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: month12Accounts } = await supabase
      .from('retention_tracking')
      .select(`
        *,
        crm_account:crm_accounts(id, status, created_at, agent_id, plan_type, plan_tier, billing_interval),
        web_customer:web_customers(id, status, created_at, agent_id, plan_type, billing_interval)
      `)
      .eq('month_12_retained', false)
      .eq('month_6_retained', true);

    for (const tracking of month12Accounts || []) {
      const account = tracking.crm_account || tracking.web_customer;
      if (!account) continue;

      const createdAt = new Date(account.created_at);
      const monthsSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      if (monthsSinceCreation >= 12 && account.status === 'active') {
        try {
          await supabase
            .from('retention_tracking')
            .update({
              month_12_retained: true,
              month_12_payment_date: new Date().toISOString(),
            })
            .eq('id', tracking.id);

          if (account.agent_id) {
            await createRetentionCommission({
              agentId: account.agent_id,
              crmAccountId: tracking.crm_account_id,
              webCustomerId: tracking.web_customer_id,
              milestone: 'month_12',
              bonusAmount: 100, // $100 month 12 bonus
              planType: account.plan_type,
              planTier: account.plan_tier,
              billingInterval: account.billing_interval,
            });
          }

          results.month12Bonuses++;
        } catch (err: any) {
          results.errors.push(`Month 12 bonus error for ${tracking.id}: ${err.message}`);
        }
      }
    }

    // === EXPIRE OLD COUPONS ===
    const now = new Date().toISOString();
    const { data: expiredCoupons } = await supabase
      .from('crm_coupons')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now)
      .select();

    if (expiredCoupons) {
      results.expiredCoupons = expiredCoupons.length;
    }

    // === EXPIRE TRIALS ===
    // Mark trials as expired and update account status
    const { data: expiredTrials } = await supabase
      .from('crm_accounts')
      .select('id')
      .eq('is_trial', true)
      .eq('status', 'trial')
      .lt('trial_ends_at', now);

    if (expiredTrials && expiredTrials.length > 0) {
      await supabase
        .from('crm_accounts')
        .update({
          status: 'cancelled',
          cancelled_at: now,
        })
        .in('id', expiredTrials.map(t => t.id));
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Retention cron error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
