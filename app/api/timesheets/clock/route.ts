// =====================================================
// TIMESHEETS CLOCK API
// POST /api/timesheets/clock - Clock in/out
// GET /api/timesheets/clock - Get current status
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { clockIn, clockOut, getClockStatus } from '@/lib/timesheets';
import { isFeatureEnabled } from '@/lib/features';

export async function GET() {
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

    const status = await getClockStatus(profile.id);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error getting clock status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get clock status' },
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
    const { action, jobId, notes, breakMinutes, latitude, longitude } = body;

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "clock_in" or "clock_out"' },
        { status: 400 }
      );
    }

    let entry;

    if (action === 'clock_in') {
      entry = await clockIn(profile.id, profile.business_id, {
        jobId,
        notes,
        latitude,
        longitude,
      });
    } else {
      entry = await clockOut(profile.id, {
        breakMinutes,
        notes,
        latitude,
        longitude,
      });
    }

    // Get updated status
    const status = await getClockStatus(profile.id);

    return NextResponse.json({
      entry,
      status,
      message: action === 'clock_in' ? 'Clocked in successfully' : 'Clocked out successfully',
    });
  } catch (error: any) {
    console.error('Error clocking in/out:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clock in/out' },
      { status: 500 }
    );
  }
}
