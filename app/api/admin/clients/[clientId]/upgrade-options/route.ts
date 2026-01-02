// =====================================================
// ADMIN CLIENT UPGRADE OPTIONS API
// GET /api/admin/clients/:clientId/upgrade-options
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientUpgradeOptions } from '@/lib/admin/plans';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const supabase = createAdminClient();

    // Get client's current plan
    const { data: account, error } = await supabase
      .from('crm_accounts')
      .select('id, plan_type, business_name, created_at')
      .eq('id', clientId)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const upgradeOptions = await getClientUpgradeOptions(clientId, account.plan_type);

    if (!upgradeOptions) {
      return NextResponse.json({ error: 'Could not determine upgrade options' }, { status: 500 });
    }

    // Calculate months as customer
    const createdAt = new Date(account.created_at);
    const now = new Date();
    const monthsAsCustomer = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return NextResponse.json({
      client: {
        id: account.id,
        business_name: account.business_name,
        months_as_customer: monthsAsCustomer,
      },
      ...upgradeOptions,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/clients/:clientId/upgrade-options:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get upgrade options' },
      { status: 500 }
    );
  }
}
