// =====================================================
// ADMIN COUPON REVOKE API
// POST /api/admin/coupons/:couponId/revoke
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { revokeCoupon } from '@/lib/admin/coupons';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can revoke coupons
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { couponId } = await params;
    await revokeCoupon(couponId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Revoke coupon error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke coupon' },
      { status: 500 }
    );
  }
}
