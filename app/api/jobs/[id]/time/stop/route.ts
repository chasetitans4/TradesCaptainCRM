// =====================================================
// STOP JOB TIMER API
// POST /api/jobs/:id/time/stop - Stop tracking time for a job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stopJobTimer, getActiveJobTimer } from '@/lib/timesheets';

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

    // Get active job timer for this user
    const activeTimer = await getActiveJobTimer(profile.id);

    if (!activeTimer) {
      return NextResponse.json(
        { error: 'No active job timer' },
        { status: 400 }
      );
    }

    if (activeTimer.job_id !== id) {
      return NextResponse.json(
        { error: 'Active timer is for a different job' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const jobTimeEntry = await stopJobTimer(activeTimer.id, body.notes);

    return NextResponse.json({ jobTimeEntry });
  } catch (error: any) {
    console.error('Error in POST /api/jobs/[id]/time/stop:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop job timer' },
      { status: 400 }
    );
  }
}
