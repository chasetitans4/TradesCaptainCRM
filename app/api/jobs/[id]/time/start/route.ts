// =====================================================
// START JOB TIMER API
// POST /api/jobs/:id/time/start - Start tracking time for a job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startJobTimer, getClockStatus } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user is clocked in
    const status = await getClockStatus(profile.id);

    if (!status.isClockedIn || !status.currentEntry) {
      return NextResponse.json(
        { error: 'Must be clocked in to start a job timer' },
        { status: 400 }
      );
    }

    // Verify job exists and belongs to this business
    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // startJobTimer signature: (jobId, userId, businessId, isTravel)
    const jobTimeEntry = await startJobTimer(
      id,
      profile.id,
      profile.business_id,
      body.is_travel || false
    );

    return NextResponse.json({ jobTimeEntry }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      message: 'Error in POST /api/jobs/[id]/time/start',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start job timer' },
      { status: 400 }
    );
  }
}
