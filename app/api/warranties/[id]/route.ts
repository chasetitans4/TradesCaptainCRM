// =====================================================
// WARRANTY BY ID API
// GET /api/warranties/[id] - Get warranty details
// PATCH /api/warranties/[id] - Update warranty status
// POST /api/warranties/[id]/claim - Create warranty claim
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getWarranty,
  updateWarrantyStatus,
  createWarrantyClaim,
  getWarrantyClaims,
  getWarrantyCoverage,
} from '@/lib/warranties';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeClaims = searchParams.get('includeClaims') === 'true';

    const warranty = await getWarranty(id);

    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    const coverage = getWarrantyCoverage(warranty);

    if (includeClaims) {
      const claims = await getWarrantyClaims(id);
      return NextResponse.json({ ...warranty, coverage, claims });
    }

    return NextResponse.json({ ...warranty, coverage });
  } catch (error: any) {
    console.error('Error fetching warranty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warranty' },
      { status: 500 }
    );
  }
}

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
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const warranty = await updateWarrantyStatus(id, status);

    return NextResponse.json(warranty);
  } catch (error: any) {
    console.error('Error updating warranty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update warranty' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { issueDescription, amountClaimed } = body;

    if (!issueDescription) {
      return NextResponse.json(
        { error: 'issueDescription is required' },
        { status: 400 }
      );
    }

    const claim = await createWarrantyClaim(id, issueDescription, profile.id, amountClaimed);

    return NextResponse.json(claim);
  } catch (error: any) {
    console.error('Error creating warranty claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create warranty claim' },
      { status: 500 }
    );
  }
}
