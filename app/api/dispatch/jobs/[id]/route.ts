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
import { hasServerPermission, checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { Permission } from '@/lib/permissions/roles';

// GET /api/dispatch/jobs/[id] - Get job dispatch history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await hasServerPermission('view_all_jobs') && !await hasServerPermission('view_assigned_jobs')) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    // Determine business ID
    let businessId = user.businessId;
    
    // We don't get query params easily here for POST body usually contains data
    // But we might need business ID if admin is acting
    // Ideally the job ID implies the business, but we verify ownership usually.
    // Since we are operating on a specific job ID, the RLS/logic should handle it, 
    // but the `userData.business_id` check below needs to be updated.

    // If user is admin, they might not have businessId.
    // However, dispatch actions (assign, etc) usually require the actor to be part of the business
    // OR we need to pass `dispatchedBy` as the admin ID.
    
    // If Admin, we skip the business_id check on the USER, but we should probably ensure the job belongs to a business they can manage (all businesses for super admin).
    
    if (!businessId && user.role !== 'admin' && user.role !== 'super_admin') {
       return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // RBAC Check
    // Skip for admin/super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      let requiredPermission: Permission = 'manage_jobs';
      if (['start', 'complete'].includes(action)) {
        requiredPermission = 'update_job_status';
      } else if (['assign', 'unassign', 'reschedule', 'auto-assign'].includes(action)) {
        requiredPermission = 'assign_jobs';
      }

      if (!await hasServerPermission(requiredPermission)) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

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
        // For auto-assign, we need businessId to find technicians
        // If admin, we need to fetch the job's businessId first?
        // autoAssignJob likely takes businessId.
        
        let targetBusinessId = businessId;
        if (!targetBusinessId) {
           // Fetch job's business ID
           const supabase = await createClient();
           const { data: job } = await supabase.from('jobs').select('business_id').eq('id', jobId).single();
           if (job) targetBusinessId = job.business_id;
        }

        if (!targetBusinessId) {
           return NextResponse.json({ error: 'Business ID required for auto-assign' }, { status: 400 });
        }

        result = await autoAssignJob(jobId, targetBusinessId, {
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
