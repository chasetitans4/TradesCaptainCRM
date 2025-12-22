// =====================================================
// ADMIN COUPON REDEMPTION API
// POST /api/admin/coupons/redeem
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { redeemCoupon } from '@/lib/admin/coupons';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, business_name, contact_name, email, phone } = body;

    if (!code || !business_name || !contact_name || !email) {
      return NextResponse.json(
        { error: 'code, business_name, contact_name, and email are required' },
        { status: 400 }
      );
    }

    const result = await redeemCoupon(code, {
      business_name,
      contact_name,
      email,
      phone,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Redeem coupon error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to redeem coupon' },
      { status: 500 }
    );
  }
}
