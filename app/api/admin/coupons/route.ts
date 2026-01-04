// =====================================================
// ADMIN COUPONS API
// GET/POST /api/admin/coupons
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCoupons, createCoupon } from '@/lib/admin/coupons';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { CouponStatus } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const status = searchParams.get('status') as CouponStatus | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Non-management roles can only see their own coupons
    const effectiveAgentId = ['super_admin', 'admin', 'finance'].includes(auth.user.role)
      ? agentId
      : auth.user.id;

    const result = await getCoupons({
      agentId: effectiveAgentId,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      msg: 'Get coupons error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get coupons' },
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

    // Only agents and admins can create coupons
    if (!['agent', 'admin', 'super_admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { webCustomerId, webPlanType, crmPlan, freeMonths } = body;

    if (!webCustomerId || !webPlanType) {
      return NextResponse.json(
        { error: 'webCustomerId and webPlanType are required' },
        { status: 400 }
      );
    }

    const coupon = await createCoupon({
      webCustomerId,
      webPlanType,
      crmPlan,
      freeMonths,
      agentId: auth.user.id,
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    apiLogger.error({
      msg: 'Create coupon error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
