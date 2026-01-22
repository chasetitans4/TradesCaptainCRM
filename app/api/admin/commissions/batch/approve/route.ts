// =====================================================
// ADMIN BATCH APPROVE COMMISSIONS API
// POST /api/admin/commissions/batch/approve
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { batchApproveCommissions } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';
import { checkBatchOperationRateLimit } from '@/lib/rate-limit';

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

    // Rate limit batch operations - 10 per minute per admin
    const rateLimit = await checkBatchOperationRateLimit(auth.user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many batch operations. Please wait before approving more commissions.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString(),
          },
        }
      );
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
  } catch (error) {
    apiLogger.error({
      msg: 'Batch approve commissions error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve commissions' },
      { status: 500 }
    );
  }
}
