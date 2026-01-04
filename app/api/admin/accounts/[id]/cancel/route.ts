// =====================================================
// CANCEL ACCOUNT API
// POST /api/admin/accounts/:id/cancel
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { cancelAccount, logAdminActivity } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';

    const account = await cancelAccount(id);

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(admin.id, 'cancelled_account', 'crm_account', id, { reason }, ip);

    return NextResponse.json({ account });
  } catch (error) {
    apiLogger.error({
      msg: 'Error cancelling account',
      path: '/api/admin/accounts/[id]/cancel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel account' },
      { status: 400 }
    );
  }
}
