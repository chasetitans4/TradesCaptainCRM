// =====================================================
// ADMIN COUPON VALIDATION API
// POST /api/admin/coupons/validate
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/admin/coupons';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code);

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      msg: 'Validate coupon error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
