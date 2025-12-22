// =====================================================
// ADMIN RETENTION MONTH 3 AUDIT API
// POST /api/admin/retention/:trackingId/send-audit
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendMonth3Audit, getRetentionTracking } from '@/lib/admin/commissions';
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

    // Agents can only send audits for their own accounts
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      if (tracking.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await sendMonth3Audit(trackingId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send month 3 audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send month 3 audit' },
      { status: 500 }
    );
  }
}
