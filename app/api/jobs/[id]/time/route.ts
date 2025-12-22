// =====================================================
// JOB TIME ENTRIES API
// GET /api/jobs/:id/time - Get all time entries for a job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobTimeEntries, getJobTotalTime } from '@/lib/timesheets';

export async function GET(
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

    const entries = await getJobTimeEntries(id);
    const totalMinutes = await getJobTotalTime(id);

    return NextResponse.json({
      entries,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    });
  } catch (error: any) {
    console.error('Error in GET /api/jobs/[id]/time:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get job time entries' },
      { status: 500 }
    );
  }
}
