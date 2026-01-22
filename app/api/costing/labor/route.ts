import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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
import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/costing/labor - Get labor entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activeOnly = searchParams.get('active');

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    // Get active clock-in for user
    if (activeOnly === 'true') {
      const targetUserId = userId || session.user.id;
      const activeClockIn = await getActiveClockIn(targetUserId, supabase);
      return NextResponse.json({ activeClockIn });
    }

    // Get labor for specific job
    if (jobId) {
      const labor = await getJobLabor(jobId, supabase);
      return NextResponse.json({ labor });
    }

    // Get labor summary for user/date range
    if (startDate && endDate) {
      const targetUserId = userId || session.user.id;
      const summary = await getLaborSummary(targetUserId, startDate, endDate, supabase);
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobId, ...data } = body;

    if (!jobId && action !== 'updateEntry' && action !== 'deleteEntry') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    let result;

    switch (action) {
      case 'clockIn':
        result = await clockIn(jobId, session.user.id, data.notes, supabase);
        break;

      case 'clockOut':
        result = await clockOut(jobId, session.user.id, data.breakMinutes || 0, data.notes, supabase);
        break;

      case 'addEntry':
        if (!data.clockIn || !data.clockOut) {
          return NextResponse.json(
            { error: 'Clock in and clock out times are required' },
            { status: 400 }
          );
        }
        
        // Admins can add entries for other users
        const targetUserId = (session.user.role === 'admin' || session.user.role === 'super_admin') && data.userId 
          ? data.userId 
          : session.user.id;

        result = await addLaborEntry(
          jobId,
          targetUserId,
          {
            clockIn: data.clockIn,
            clockOut: data.clockOut,
            breakMinutes: data.breakMinutes,
            notes: data.notes,
            isOvertime: data.isOvertime
          }
        );
        break;

      case 'updateEntry':
        if (!data.entryId) {
             return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }
        result = await updateLaborEntry(
            data.entryId,
            {
                clockIn: data.clockIn,
                clockOut: data.clockOut,
                breakMinutes: data.breakMinutes,
                notes: data.notes,
                isOvertime: data.isOvertime
            }
        );
        break;

      case 'deleteEntry':
        if (!data.entryId) {
             return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }
        result = await deleteLaborEntry(data.entryId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Operation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error, context: 'Error processing labor action' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
