import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  clockIn,
  clockOut,
  addLaborEntry,
  updateLaborEntry,
  deleteLaborEntry,
  getJobLabor,
  getActiveClockIn,
  getLaborSummary,
} from '@/lib/costing/labor';
import { apiLogger } from '@/lib/logger';

// GET /api/costing/labor - Get labor entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activeOnly = searchParams.get('active');

    // Get active clock-in for user
    if (activeOnly === 'true') {
      const targetUserId = userId || user.id;
      const activeClockIn = await getActiveClockIn(targetUserId);
      return NextResponse.json({ activeClockIn });
    }

    // Get labor for specific job
    if (jobId) {
      const labor = await getJobLabor(jobId);
      return NextResponse.json({ labor });
    }

    // Get labor summary for user/date range
    if (startDate && endDate) {
      const targetUserId = userId || user.id;
      const summary = await getLaborSummary(targetUserId, startDate, endDate);
      return NextResponse.json(summary);
    }

    return NextResponse.json(
      { error: 'Job ID or date range is required' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching labor' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch labor' }, { status: 500 });
  }
}

// POST /api/costing/labor - Labor actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobId, ...data } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'clockIn':
        result = await clockIn(jobId, user.id, data.notes);
        break;

      case 'clockOut':
        result = await clockOut(jobId, user.id, data.breakMinutes || 0, data.notes);
        break;

      case 'addEntry':
        if (!data.clockIn || !data.clockOut) {
          return NextResponse.json(
            { error: 'Clock in and clock out times are required' },
            { status: 400 }
          );
        }
        result = await addLaborEntry(jobId, data.userId || user.id, {
          clockIn: new Date(data.clockIn),
          clockOut: new Date(data.clockOut),
          breakMinutes: data.breakMinutes,
          notes: data.notes,
          isOvertime: data.isOvertime,
        });
        break;

      case 'updateEntry':
        if (!data.entryId) {
          return NextResponse.json(
            { error: 'Entry ID is required' },
            { status: 400 }
          );
        }
        result = await updateLaborEntry(data.entryId, {
          clockIn: data.clockIn ? new Date(data.clockIn) : undefined,
          clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
          breakMinutes: data.breakMinutes,
          notes: data.notes,
          isOvertime: data.isOvertime,
        });
        break;

      case 'deleteEntry':
        if (!data.entryId) {
          return NextResponse.json(
            { error: 'Entry ID is required' },
            { status: 400 }
          );
        }
        result = await deleteLaborEntry(data.entryId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ msg: 'Error with labor action', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process labor action' }, { status: 500 });
  }
}
