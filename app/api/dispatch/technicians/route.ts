import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getDispatchTechnicians, getTechnicianSchedule, getDispatchStats } from '@/lib/dispatch/data';
import { updateTechnicianLocation, updateTechnicianStatus, setTechnicianSchedule, addTimeOff } from '@/lib/dispatch/actions';
import { findQualifiedTechnicians, getWorkloadDistribution } from '@/lib/dispatch/routing';
import { hasServerPermission } from '@/lib/permissions/check-permission';
import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/dispatch/technicians - Get technicians for dispatch
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    let businessId = user.businessId;

    const { searchParams } = new URL(request.url);
    const queryBusinessId = searchParams.get('businessId');

    // Allow admins to override business ID
    if ((user.role === 'admin' || user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const view = searchParams.get('view');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const jobType = searchParams.get('jobType');
    const userId = searchParams.get('userId');

    // Get technician schedule - Allow own schedule or view_team permission
    if (view === 'schedule' && userId) {
      const isOwnSchedule = userId === user.id;
      // Admins can view anyone's schedule
      if (!isOwnSchedule && user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('view_team')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const schedule = await getTechnicianSchedule(userId, date, businessId);
      return NextResponse.json({ schedule });
    }

    // All other views require view_team permission
    if (user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('view_team')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get workload distribution
    if (view === 'workload') {
      const workload = await getWorkloadDistribution(businessId, date);
      return NextResponse.json({ workload });
    }

    // Get qualified technicians for job type
    if (view === 'qualified' && jobType) {
      const result = await findQualifiedTechnicians(businessId, jobType, date);
      return NextResponse.json(result);
    }

    // Get dispatch stats
    if (view === 'stats') {
      const stats = await getDispatchStats(businessId, date);
      return NextResponse.json({ stats });
    }

    // Default: get all technicians
    const technicians = await getDispatchTechnicians(businessId);

    return NextResponse.json({ technicians });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/dispatch/technicians' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch technicians' }, { status: 500 });
  }
}

// POST /api/dispatch/technicians - Update technician data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const { action, userId, ...data } = body;

    const targetUserId = userId || user.id;
    const isOwnAction = targetUserId === user.id;

    let result;

    switch (action) {
      case 'updateLocation':
        if (!isOwnAction && user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('manage_team')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!data.latitude || !data.longitude) {
          return NextResponse.json(
            { error: 'Latitude and longitude are required' },
            { status: 400 }
          );
        }
        result = await updateTechnicianLocation(targetUserId, {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          city: data.city,
          status: data.status,
        });
        break;

      case 'updateStatus':
        if (!isOwnAction && user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('manage_team')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!data.status) {
          return NextResponse.json(
            { error: 'Status is required' },
            { status: 400 }
          );
        }
        result = await updateTechnicianStatus(targetUserId, data.status, data.currentJobId);
        break;

      case 'setSchedule':
        if (user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('manage_team')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!data.schedule || !Array.isArray(data.schedule)) {
          return NextResponse.json(
            { error: 'Schedule array is required' },
            { status: 400 }
          );
        }
        result = await setTechnicianSchedule(targetUserId, data.schedule);
        break;

      case 'addTimeOff':
        if (user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('manage_team')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!data.startDate || !data.endDate) {
          return NextResponse.json(
            { error: 'Start and end dates are required' },
            { status: 400 }
          );
        }
        result = await addTimeOff(targetUserId, {
          startDate: data.startDate,
          endDate: data.endDate,
          title: data.title,
          notes: data.notes,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/dispatch/technicians' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update technician' }, { status: 500 });
  }
}
