import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDispatchTechnicians, getTechnicianSchedule, getDispatchStats } from '@/lib/dispatch/data';
import { updateTechnicianLocation, updateTechnicianStatus, setTechnicianSchedule, addTimeOff } from '@/lib/dispatch/actions';
import { findQualifiedTechnicians, getWorkloadDistribution } from '@/lib/dispatch/routing';

// GET /api/dispatch/technicians - Get technicians for dispatch
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const jobType = searchParams.get('jobType');
    const userId = searchParams.get('userId');

    // Get workload distribution
    if (view === 'workload') {
      const workload = await getWorkloadDistribution(userData.business_id, date);
      return NextResponse.json({ workload });
    }

    // Get qualified technicians for job type
    if (view === 'qualified' && jobType) {
      const result = await findQualifiedTechnicians(userData.business_id, jobType, date);
      return NextResponse.json(result);
    }

    // Get technician schedule
    if (view === 'schedule' && userId) {
      const schedule = await getTechnicianSchedule(userId, date);
      return NextResponse.json({ schedule });
    }

    // Get dispatch stats
    if (view === 'stats') {
      const stats = await getDispatchStats(userData.business_id, date);
      return NextResponse.json({ stats });
    }

    // Default: get all technicians
    const technicians = await getDispatchTechnicians(userData.business_id);

    return NextResponse.json({ technicians });
  } catch (error: any) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/dispatch/technicians - Update technician data
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
    const { action, userId, ...data } = body;

    const targetUserId = userId || user.id;

    let result;

    switch (action) {
      case 'updateLocation':
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
        if (!data.status) {
          return NextResponse.json(
            { error: 'Status is required' },
            { status: 400 }
          );
        }
        result = await updateTechnicianStatus(targetUserId, data.status, data.currentJobId);
        break;

      case 'setSchedule':
        if (!data.schedule || !Array.isArray(data.schedule)) {
          return NextResponse.json(
            { error: 'Schedule array is required' },
            { status: 400 }
          );
        }
        result = await setTechnicianSchedule(targetUserId, data.schedule);
        break;

      case 'addTimeOff':
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
  } catch (error: any) {
    console.error('Error updating technician:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
