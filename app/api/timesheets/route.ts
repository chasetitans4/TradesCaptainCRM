// =====================================================
// TIMESHEETS API
// GET /api/timesheets - Get time entries
// POST /api/timesheets - Add manual time entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getTimeEntries, addTimeEntry } from '@/lib/timesheets';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as 'active' | 'completed' | 'edited' | null;

    // Technicians can only see their own entries
    const targetUserId =
      profile.role === 'technician' ? profile.id : userId || undefined;

    const entries = await getTimeEntries(profile.business_id, {
      userId: targetUserId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status || undefined,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching time entries' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch time entries' },
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

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, clockIn, clockOut, breakMinutes, jobId, notes } = body;

    // Only admins/owners can add entries for other users
    const targetUserId =
      profile.role === 'technician' ? profile.id : userId || profile.id;

    if (!clockIn || !clockOut) {
      return NextResponse.json(
        { error: 'Clock in and clock out times are required' },
        { status: 400 }
      );
    }

    const entry = await addTimeEntry(targetUserId, profile.business_id, {
      clockIn: new Date(clockIn),
      clockOut: new Date(clockOut),
      breakMinutes: breakMinutes || 0,
      jobId,
      notes,
    });

    return NextResponse.json({ entry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error adding time entry' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add time entry' },
      { status: 500 }
    );
  }
}
