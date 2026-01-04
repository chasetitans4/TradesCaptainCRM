// =====================================================
// ADMIN COMMISSION APPROVE API
// POST /api/admin/commissions/:commissionId/approve
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { approveCommission } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and finance can approve commissions
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commissionId } = await params;
    await approveCommission(commissionId, auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Approve commission error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve commission' },
      { status: 500 }
    );
  }
}
