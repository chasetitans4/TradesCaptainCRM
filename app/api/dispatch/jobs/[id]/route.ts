import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  assignJob,
  unassignJob,
  rescheduleJob,
  startJob,
  completeJob,
  getJobDispatchHistory,
} from '@/lib/dispatch/actions';
import { autoAssignJob } from '@/lib/dispatch/routing';

// GET /api/dispatch/jobs/[id] - Get job dispatch history
export async function GET(
  _request: NextRequest,
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

    const history = await getJobDispatchHistory(id);

    return NextResponse.json({ history });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/dispatch/jobs/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch dispatch history' }, { status: 500 });
  }
}

// POST /api/dispatch/jobs/[id] - Dispatch actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    let result;

    switch (action) {
      case 'assign':
        if (!data.technicianId) {
          return NextResponse.json(
            { error: 'Technician ID is required' },
            { status: 400 }
          );
        }
        result = await assignJob(jobId, data.technicianId, {
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          notifyTechnician: data.notifyTechnician,
          notifyCustomer: data.notifyCustomer,
          dispatchedBy: user.id,
        });
        break;

      case 'unassign':
        result = await unassignJob(jobId, data.reason, user.id);
        break;

      case 'reschedule':
        if (!data.newDate) {
          return NextResponse.json(
            { error: 'New date is required' },
            { status: 400 }
          );
        }
        result = await rescheduleJob(jobId, data.newDate, data.newTime, {
          notifyCustomer: data.notifyCustomer,
          notifyTechnician: data.notifyTechnician,
          rescheduledBy: user.id,
          reason: data.reason,
        });
        break;

      case 'start':
        result = await startJob(jobId, user.id);
        break;

      case 'complete':
        result = await completeJob(jobId, user.id, data.notes);
        break;

      case 'auto-assign':
        result = await autoAssignJob(jobId, userData.business_id, {
          preferClosest: data.preferClosest,
          preferLeastBusy: data.preferLeastBusy,
          excludeTechnicianIds: data.excludeTechnicianIds,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      const errorMessage = 'error' in result
        ? result.error
        : 'reason' in result
          ? (result as any).reason
          : 'Dispatch action failed';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/dispatch/jobs/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dispatch action failed' }, { status: 500 });
  }
}
