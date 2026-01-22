// =====================================================
// ARRIVAL PING API
// POST /api/routes/arrival - Record "I'm Here" arrival
// GET /api/routes/arrival - Get arrival history
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { recordArrivalPing, logMileage } from '@/lib/routes/arrival';
import { apiLogger } from '@/lib/logger';
import { isFeatureEnabled } from '@/lib/features';

// POST - Record arrival ping ("I'm Here" button)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Check if route optimization is enabled
    const routeEnabled = await isFeatureEnabled(userData.business_id, 'route_optimization_enabled');
    if (!routeEnabled) {
      return NextResponse.json(
        { error: 'Route optimization is not enabled for your business' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, latitude, longitude, previousLocation } = body;

    if (!jobId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'jobId, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Record the arrival ping
    const result = await recordArrivalPing(user.id, userData.business_id, {
      jobId,
      latitude,
      longitude,
    });

    // If previous location provided, log mileage
    let mileageResult = null;
    if (previousLocation?.latitude && previousLocation?.longitude) {
      try {
        mileageResult = await logMileage(user.id, userData.business_id, {
          fromLatitude: previousLocation.latitude,
          fromLongitude: previousLocation.longitude,
          fromAddress: previousLocation.address,
          fromJobId: previousLocation.jobId,
          toLatitude: latitude,
          toLongitude: longitude,
          toJobId: jobId,
          purpose: 'job_travel',
        });
      } catch (mileageError) {
        apiLogger.warn({
          msg: 'Failed to log mileage on arrival',
          error: mileageError instanceof Error ? mileageError.message : 'Unknown error',
        });
      }
    }

    apiLogger.info({
      msg: 'Arrival ping recorded',
      userId: user.id,
      jobId,
      pingId: result.id,
    });

    return NextResponse.json({
      success: true,
      pingId: result.id,
      address: result.address,
      smsSent: result.smsSent,
      smsError: result.smsError,
      mileage: mileageResult,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Arrival ping error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to record arrival' }, { status: 500 });
  }
}

// GET - Get arrival history for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const jobId = searchParams.get('jobId');

    let query = supabase
      .from('arrival_pings')
      .select(`
        id,
        job_id,
        latitude,
        longitude,
        address,
        arrived_at,
        sms_sent,
        jobs(title, address, city)
      `)
      .eq('user_id', user.id)
      .gte('arrived_at', `${date}T00:00:00`)
      .lt('arrived_at', `${date}T23:59:59`)
      .order('arrived_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: arrivals, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      arrivals: arrivals || [],
      date,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get arrivals error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get arrivals' }, { status: 500 });
  }
}
