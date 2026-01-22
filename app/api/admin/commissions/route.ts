// =====================================================
// ADMIN COMMISSIONS API
// GET/POST /api/admin/commissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCommissions, createCommission, getPendingCommissions } from '@/lib/admin/commissions';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { CommissionStatus, CommissionType } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_admin_commissions');
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const status = searchParams.get('status') as CommissionStatus | undefined;
    const type = searchParams.get('type') as CommissionType | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const pending = searchParams.get('pending') === 'true';

    // Role-based data access
    const userRole = session.user.role;
    const canViewOthers = ['super_admin', 'admin', 'finance', 'manager'].includes(userRole);
    
    // If user can view others and requested an agent ID, use it.
    // Otherwise, force their own ID.
    const effectiveAgentId = (canViewOthers && agentId) 
      ? agentId 
      : session.user.id;

    if (pending) {
      // If user is not management, they can only see their own pending commissions
      // If user is management, they can see all pending commissions, or filter by agentId
      const targetAgentId = canViewOthers ? (agentId || undefined) : session.user.id;
      const commissions = await getPendingCommissions(targetAgentId);
      return NextResponse.json({ commissions, total: commissions.length });
    }

    const result = await getCommissions({
      agentId: effectiveAgentId,
      status,
      type,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      msg: 'Get commissions error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get commissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_admin_commissions');

    const data = await request.json();
    const commission = await createCommission(data);

    return NextResponse.json({ success: true, commission });
  } catch (error) {
    apiLogger.error({
      msg: 'Create commission error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create commission' },
      { status: 500 }
    );
  }
}
