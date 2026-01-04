// =====================================================
// END BREAK API
// POST /api/timesheets/break/end - End a break
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { endBreak, getClockStatus, getActiveBreak } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
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

    // Get current time entry and active break
    const status = await getClockStatus(profile.id);

    if (!status.currentEntry) {
      return NextResponse.json(
        { error: 'No active time entry' },
        { status: 400 }
      );
    }

    const activeBreak = await getActiveBreak(status.currentEntry.id);

    if (!activeBreak) {
      return NextResponse.json(
        { error: 'No active break to end' },
        { status: 400 }
      );
    }

    const breakEntry = await endBreak(activeBreak.id);

    return NextResponse.json({ break: breakEntry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/break/end' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end break' },
      { status: 400 }
    );
  }
}
