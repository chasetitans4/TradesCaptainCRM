import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDispatchJobs, getUnassignedJobs } from '@/lib/dispatch/data';

// GET /api/dispatch/jobs - Get jobs for dispatch board
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
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const jobs = await getUnassignedJobs(userData.business_id);
      return NextResponse.json({ jobs });
    }

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const jobs = await getDispatchJobs(userData.business_id, start, end);

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Error fetching dispatch jobs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
