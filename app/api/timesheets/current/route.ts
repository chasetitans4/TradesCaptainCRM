// =====================================================
// CURRENT TIMESHEET API
// GET /api/timesheets/current - Get today's active timesheet
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClockStatus, getActiveJobTimer, getActiveBreak } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
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

    const status = await getClockStatus(profile.id);
    const activeJobTimer = await getActiveJobTimer(profile.id);
    const activeBreak = status.currentEntry
      ? await getActiveBreak(status.currentEntry.id)
      : null;

    return NextResponse.json({
      ...status,
      activeJobTimer,
      activeBreak,
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in GET /api/timesheets/current' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get current status' },
      { status: 500 }
    );
  }
}
