import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getDispatchJobs, getUnassignedJobs } from '@/lib/dispatch/data';
import { hasServerPermission } from '@/lib/permissions/check-permission';
import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/dispatch/jobs - Get jobs for dispatch board
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    
    // Check if user has permission to view jobs
    // For admin, we skip this check as they have full access, or check specific admin permission
    if (user.role !== 'admin' && user.role !== 'super_admin' && !await hasServerPermission('view_all_jobs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let businessId = user.businessId;
    const { searchParams } = new URL(request.url);
    const queryBusinessId = searchParams.get('businessId');

    // Allow admins to override business ID
    if ((user.role === 'admin' || user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      // If no business ID found (e.g. admin without override), return empty or error
      // Returning 404 to match previous behavior for "No business found"
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const start = searchParams.get('start') || searchParams.get('startDate');
    const end = searchParams.get('end') || searchParams.get('endDate');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const jobs = await getUnassignedJobs(businessId);
      return NextResponse.json({ jobs });
    }

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const jobs = await getDispatchJobs(businessId, start, end);

    return NextResponse.json({ jobs });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/dispatch/jobs' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch dispatch jobs' }, { status: 500 });
  }
}
