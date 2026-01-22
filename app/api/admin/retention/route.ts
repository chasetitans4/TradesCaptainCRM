// =====================================================
// ADMIN RETENTION TRACKING API
// GET /api/admin/retention
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRetentionTasks } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Non-management roles can only see their own retention tasks
    const agentId = ['super_admin', 'admin', 'finance'].includes(auth.user.role)
      ? undefined
      : auth.user.id;

    // Try to get retention tracking records from database
    const supabase = createAdminClient();

    try {
      let query = supabase
        .from('retention_tracking')
        .select(`
          *,
          crm_account:crm_accounts(id, business_name, created_at),
          web_customer:web_customers(id, business_name, created_at)
        `)
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data: tasks, error } = await query;

      if (error) {
        // Table might not exist, fall back to legacy function
        const legacyData = await getRetentionTasks(agentId);
        // Transform legacy data to expected format
        const allTasks = [
          ...legacyData.month3Calls.map((a: any) => ({
            id: a.id,
            crm_account_id: a.id,
            agent_id: a.agent_id || '',
            month_3_call_completed: false,
            month_3_audit_sent: false,
            month_3_bonus_paid: false,
            month_4_retained: false,
            month_4_bonus_paid: false,
            month_6_retained: false,
            month_6_bonus_paid: false,
            month_12_retained: false,
            month_12_bonus_paid: false,
            total_retention_bonus: 0,
            created_at: a.created_at,
            crm_account: { business_name: a.business_name, created_at: a.created_at },
          })),
          ...legacyData.month6Checks.map((a: any) => ({
            id: a.id,
            crm_account_id: a.id,
            agent_id: a.agent_id || '',
            month_3_call_completed: true,
            month_3_audit_sent: true,
            month_3_bonus_paid: true,
            month_4_retained: true,
            month_4_bonus_paid: true,
            month_6_retained: false,
            month_6_bonus_paid: false,
            month_12_retained: false,
            month_12_bonus_paid: false,
            total_retention_bonus: 40,
            created_at: a.created_at,
            crm_account: { business_name: a.business_name, created_at: a.created_at },
          })),
          ...legacyData.month12Checks.map((a: any) => ({
            id: a.id,
            crm_account_id: a.id,
            agent_id: a.agent_id || '',
            month_3_call_completed: true,
            month_3_audit_sent: true,
            month_3_bonus_paid: true,
            month_4_retained: true,
            month_4_bonus_paid: true,
            month_6_retained: true,
            month_6_bonus_paid: true,
            month_12_retained: false,
            month_12_bonus_paid: false,
            total_retention_bonus: 90,
            created_at: a.created_at,
            crm_account: { business_name: a.business_name, created_at: a.created_at },
          })),
        ];
        return NextResponse.json({ tasks: allTasks });
      }

      return NextResponse.json({ tasks: tasks || [] });
    } catch {
      // Tables don't exist, return empty array
      return NextResponse.json({ tasks: [] });
    }
  } catch (error) {
    apiLogger.error({ msg: 'Get retention tasks error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get retention tasks' },
      { status: 500 }
    );
  }
}
