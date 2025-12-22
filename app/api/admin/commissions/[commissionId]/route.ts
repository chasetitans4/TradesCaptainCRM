// =====================================================
// ADMIN COMMISSION DETAIL API
// GET /api/admin/commissions/:commissionId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commissionId } = await params;
    const supabase = createAdminClient();

    const { data: commission, error } = await supabase
      .from('commissions')
      .select(`
        *,
        agent:admin_users!commissions_agent_id_fkey(id, full_name, email),
        crm_account:crm_accounts(id, business_name),
        web_customer:web_customers(id, business_name)
      `)
      .eq('id', commissionId)
      .single();

    if (error || !commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Non-management roles can only see their own commissions
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      if (commission.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ commission });
  } catch (error: any) {
    console.error('Get commission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get commission' },
      { status: 500 }
    );
  }
}
