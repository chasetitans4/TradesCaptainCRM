// =====================================================
// CLOCK IN API
// POST /api/timesheets/clock-in - Clock in for the day
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clockIn } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json().catch(() => ({}));

    const entry = await clockIn(profile.id, profile.business_id, {
      jobId: body.job_id,
      notes: body.notes,
      latitude: body.location?.lat,
      longitude: body.location?.lng,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/clock-in' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clock in' },
      { status: 400 }
    );
  }
}
