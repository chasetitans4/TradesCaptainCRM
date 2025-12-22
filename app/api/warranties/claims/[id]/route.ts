// =====================================================
// WARRANTY CLAIM API
// PATCH /api/warranties/claims/[id] - Update claim
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { updateWarrantyClaim } from '@/lib/warranties';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const claim = await updateWarrantyClaim(id, {
      status: body.status,
      resolution: body.resolution,
      amountApproved: body.amountApproved,
      notes: body.notes,
      claimNumber: body.claimNumber,
    });

    return NextResponse.json(claim);
  } catch (error: any) {
    console.error('Error updating warranty claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update warranty claim' },
      { status: 500 }
    );
  }
}
