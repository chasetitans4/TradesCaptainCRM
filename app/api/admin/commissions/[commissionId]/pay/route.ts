// =====================================================
// ADMIN COMMISSION PAY API
// POST /api/admin/commissions/:commissionId/pay
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { markCommissionPaid } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only finance can mark commissions as paid
    if (!['super_admin', 'finance'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commissionId } = await params;
    const body = await request.json();
    const { payment_method, payment_reference } = body;

    await markCommissionPaid(commissionId, payment_method, payment_reference);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pay commission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark commission as paid' },
      { status: 500 }
    );
  }
}
