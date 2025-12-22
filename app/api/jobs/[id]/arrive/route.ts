// =====================================================
// JOB ARRIVE API
// POST /api/jobs/[id]/arrive - Record technician arrival
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { arriveAtJob } from '@/lib/mileage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const result = await arriveAtJob({
      jobId,
      userId: profile.id,
      currentLatitude: latitude,
      currentLongitude: longitude,
    });

    return NextResponse.json({
      success: true,
      confirmedMiles: result.confirmedMiles,
      mileageEntryId: result.mileageEntryId,
      message: `Arrival recorded - ${result.confirmedMiles} miles traveled`,
    });
  } catch (error: any) {
    console.error('Error recording arrival:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record arrival' },
      { status: 500 }
    );
  }
}
