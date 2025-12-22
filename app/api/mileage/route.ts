// =====================================================
// MILEAGE API
// GET /api/mileage - Get mileage entries
// POST /api/mileage - Add manual mileage entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getMileageEntries, addManualMileageEntry } from '@/lib/mileage';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const jobId = searchParams.get('jobId');

    // Technicians can only see their own mileage
    const targetUserId =
      profile.role === 'technician' ? profile.id : userId || undefined;

    const entries = await getMileageEntries(profile.business_id, {
      userId: targetUserId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      jobId: jobId || undefined,
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('Error fetching mileage entries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mileage entries' },
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

    const body = await request.json();
    const { tripDate, startAddress, endAddress, miles, jobId, notes } = body;

    if (!tripDate || !miles) {
      return NextResponse.json(
        { error: 'Trip date and miles are required' },
        { status: 400 }
      );
    }

    const entry = await addManualMileageEntry(profile.id, profile.business_id, {
      tripDate: new Date(tripDate),
      startAddress,
      endAddress,
      miles: parseFloat(miles),
      jobId,
      notes,
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Error adding mileage entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add mileage entry' },
      { status: 500 }
    );
  }
}
