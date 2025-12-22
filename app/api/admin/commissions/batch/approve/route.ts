// =====================================================
// ADMIN BATCH APPROVE COMMISSIONS API
// POST /api/admin/commissions/batch/approve
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { batchApproveCommissions } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and finance can approve commissions
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { commission_ids } = body;

    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return NextResponse.json(
        { error: 'commission_ids array is required' },
        { status: 400 }
      );
    }

    const count = await batchApproveCommissions(commission_ids, auth.user.id);

    return NextResponse.json({ success: true, approved_count: count });
  } catch (error: any) {
    console.error('Batch approve commissions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve commissions' },
      { status: 500 }
    );
  }
}
