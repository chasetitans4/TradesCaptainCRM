// =====================================================
// JOB DEPART API
// POST /api/jobs/[id]/depart - Record technician departure
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { departForJob } from '@/lib/mileage';

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

    await departForJob(jobId, profile.id);

    return NextResponse.json({
      success: true,
      message: 'Departure recorded',
    });
  } catch (error: any) {
    console.error('Error recording departure:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record departure' },
      { status: 500 }
    );
  }
}
