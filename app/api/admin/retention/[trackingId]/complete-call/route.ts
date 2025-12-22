// =====================================================
// ADMIN RETENTION MONTH 3 CALL COMPLETION API
// POST /api/admin/retention/:trackingId/complete-call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { completeMonth3Call, getRetentionTracking } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trackingId } = await params;
    const tracking = await getRetentionTracking(trackingId);

    if (!tracking) {
      return NextResponse.json({ error: 'Retention tracking not found' }, { status: 404 });
    }

    // Agents can only complete calls for their own accounts
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      if (tracking.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { notes } = body;

    await completeMonth3Call(trackingId, notes);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Complete month 3 call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete month 3 call' },
      { status: 500 }
    );
  }
}
