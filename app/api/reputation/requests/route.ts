import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createReputationRequest,
  getBusinessRequests,
} from '@/lib/reputation';

/**
 * GET /api/reputation/requests
 * Get reputation requests for the current business
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as string | undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { requests, total } = await getBusinessRequests(userData.business_id, {
      status: status as any,
      limit,
      offset,
    });

    return NextResponse.json({
      requests,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Reputation Requests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reputation/requests
 * Create a new reputation request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can create requests
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { job_id, delivery_channel, delay_minutes, schedule_at } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    const result = await createReputationRequest(userData.business_id, {
      job_id,
      delivery_channel,
      delay_minutes,
      schedule_at,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create request. Check that the job exists and is completed.' },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[Reputation Requests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
