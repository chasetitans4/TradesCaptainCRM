// =====================================================
// PER-USER BILLING API
// GET /api/billing/users - Get user pricing info
// POST /api/billing/users - Update user count
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getUserPricingInfo,
  updateBillableUserCount,
  getBillingPreview,
  canAddUser,
} from '@/lib/billing/per-user';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can view billing info
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includePreview = searchParams.get('preview') === 'true';

    const pricingInfo = await getUserPricingInfo(profile.business_id);
    const addUserCheck = await canAddUser(profile.business_id);

    const response: any = {
      pricing: pricingInfo,
      canAddUser: addUserCheck,
    };

    if (includePreview) {
      response.billingPreview = await getBillingPreview(profile.business_id);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching user pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user pricing' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can update billing
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Recalculate and update user count
    const newCount = await updateBillableUserCount(profile.business_id);
    const pricingInfo = await getUserPricingInfo(profile.business_id);

    return NextResponse.json({
      success: true,
      userCount: newCount,
      pricing: pricingInfo,
    });
  } catch (error: any) {
    console.error('Error updating user count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user count' },
      { status: 500 }
    );
  }
}
