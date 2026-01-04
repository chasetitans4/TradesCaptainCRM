// =====================================================
// START BREAK API
// POST /api/timesheets/break/start - Start a break
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startBreak, getClockStatus } from '@/lib/timesheets';
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
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current time entry
    const status = await getClockStatus(profile.id);

    if (!status.isClockedIn || !status.currentEntry) {
      return NextResponse.json(
        { error: 'Must be clocked in to start a break' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const breakType = body.break_type || 'unpaid';

    const breakEntry = await startBreak(status.currentEntry.id, breakType);

    return NextResponse.json({ break: breakEntry }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/break/start' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start break' },
      { status: 400 }
    );
  }
}
