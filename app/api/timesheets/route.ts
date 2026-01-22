// =====================================================
// TIMESHEETS API
// GET /api/timesheets - Get time entries
// POST /api/timesheets - Add manual time entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { getTimeEntries, addTimeEntry } from '@/lib/timesheets';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(businessId, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as 'active' | 'completed' | 'edited' | null;

    // Technicians can only see their own entries
    const targetUserId =
      session.user.role === 'technician' ? session.user.id : userId || undefined;

    const entries = await getTimeEntries(businessId, {
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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Determine business ID
    let businessId = session.user.businessId;
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && body.businessId) {
      businessId = body.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(businessId, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const { userId, clockIn, clockOut, breakMinutes, jobId, notes } = body;

    // Only admins/owners can add entries for other users
    const targetUserId =
      session.user.role === 'technician' ? session.user.id : userId || session.user.id;

    if (!clockIn || !clockOut) {
      return NextResponse.json(
        { error: 'Clock in and clock out times are required' },
        { status: 400 }
      );
    }

    const entry = await addTimeEntry(targetUserId, businessId, {
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
