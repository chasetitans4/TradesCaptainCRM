// =====================================================
// ADMIN COMMISSIONS API
// GET/POST /api/admin/commissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCommissions, createCommission, getPendingCommissions } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { CommissionStatus, CommissionType } from '@/lib/admin/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const status = searchParams.get('status') as CommissionStatus | undefined;
    const type = searchParams.get('type') as CommissionType | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const pending = searchParams.get('pending') === 'true';

    // Non-management roles can only see their own commissions
    const effectiveAgentId = ['super_admin', 'admin', 'finance'].includes(auth.user.role)
      ? agentId
      : auth.user.id;

    if (pending) {
      const commissions = await getPendingCommissions();
      const filtered =
        effectiveAgentId ? commissions.filter((c) => c.agent_id === effectiveAgentId) : commissions;
      return NextResponse.json({ commissions: filtered, total: filtered.length });
    }

    const result = await getCommissions({
      agentId: effectiveAgentId,
      status,
      type,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get commissions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get commissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and finance can create manual commissions
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const commission = await createCommission(body);

    return NextResponse.json({ success: true, commission });
  } catch (error: any) {
    console.error('Create commission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create commission' },
      { status: 500 }
    );
  }
}
