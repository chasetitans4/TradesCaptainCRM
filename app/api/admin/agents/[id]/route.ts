
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch Agent Profile
    const { data: agent, error: agentError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Fetch Stats & Related Data
    const stats = {
      activeLeads: 0,
      totalDeals: 0,
      commissionsPending: 0,
      commissionsPaidYtd: 0,
    };

    // Active Leads
    try {
      const { count } = await supabase
        .from('tc_leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', id)
        .not('status', 'in', '("won","lost","unqualified")');
      stats.activeLeads = count || 0;
    } catch {}

    // Total Deals (Accounts)
    try {
      const { count } = await supabase
        .from('crm_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', id);
      stats.totalDeals = count || 0;
    } catch {}

    // Commissions
    try {
      const { data: commissions } = await supabase
        .from('agent_commissions')
        .select('commission_amount, status, paid_at')
        .eq('agent_id', id);

      if (commissions) {
        stats.commissionsPending = commissions
          .filter(c => ['pending', 'eligible', 'approved'].includes(c.status))
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

        const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
        stats.commissionsPaidYtd = commissions
          .filter(c => c.status === 'paid' && new Date(c.paid_at).getTime() >= startOfYear)
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      }
    } catch {}

    // 3. Fetch Recent Activity (Leads)
    let recentLeads = [];
    try {
      const { data } = await supabase
        .from('tc_leads')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
      recentLeads = data || [];
    } catch {}
    
    return NextResponse.json({
      agent: {
        ...agent,
        stats,
        recentLeads
      }
    });

  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching agent details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// SECURITY: Whitelist of fields that can be updated via PATCH
const ALLOWED_UPDATE_FIELDS = [
  'full_name',
  'phone',
  'role',
  'status',
  'commission_rate',
  'hire_date',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyAdminAuth(request);
  if (!auth.valid || !['super_admin', 'admin'].includes(auth.user?.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await request.json();

  // SECURITY: Only allow whitelisted fields to be updated
  // This prevents updating password_hash, email, two_factor_secret, etc.
  const sanitizedUpdates: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (body[field] !== undefined) {
      sanitizedUpdates[field] = body[field];
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  try {
    // SECURITY: Select only safe fields in response - exclude password_hash and two_factor_secret
    const { data, error } = await supabase
      .from('admin_users')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select('id, email, full_name, phone, role, status, hire_date, commission_rate, last_login_at, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
