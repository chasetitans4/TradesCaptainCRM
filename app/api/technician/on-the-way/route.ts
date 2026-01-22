import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { notifyTechnicianEnRoute } from '@/lib/notifications';
import { logger } from '@/lib/logger';

const technicianLogger = logger.child({ context: 'technician.on-the-way' });

/**
 * POST /api/technician/on-the-way
 * Tech taps "I'm On My Way" - updates job status, calculates ETA, sends customer SMS
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, latitude, longitude } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        assigned_user_id,
        customer_id,
        business_id,
        customer:customers (
          id, name, phone, address_line1, city, state, zip, latitude, longitude
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify technician is assigned
    if (job.assigned_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    // Calculate ETA (simple estimate based on distance if coordinates available)
    let estimatedMinutes = 30; // Default 30 minutes
    let etaTime = '';

    // Customer data from Supabase comes as an array for relations
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;

    if (latitude && longitude && customer?.latitude && customer?.longitude) {
      // Haversine formula for rough distance
      const R = 3959; // Earth radius in miles
      const dLat = (customer.latitude - latitude) * (Math.PI / 180);
      const dLon = (customer.longitude - longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latitude * (Math.PI / 180)) *
          Math.cos(customer.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Rough estimate: average 25 mph in urban areas
      estimatedMinutes = Math.max(5, Math.round((distance / 25) * 60));
    }

    // Calculate ETA time
    const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    etaTime = eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Update job status to on_way (custom status or just update a field)
    // Using a simpler approach: add to dispatch_history and track
    await supabase.from('dispatch_history').insert({
      job_id: jobId,
      action: 'en_route',
      to_user_id: user.id,
      notes: `ETA: ${estimatedMinutes} minutes`,
    });

    // Update technician location status
    await supabase
      .from('technician_locations')
      .upsert({
        user_id: user.id,
        status: 'en_route',
        current_job_id: jobId,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Send customer notification via existing notification system
    let smsSent = false;
    try {
      await notifyTechnicianEnRoute(jobId, estimatedMinutes);
      smsSent = true;
    } catch (notifyError) {
      technicianLogger.warn({
        msg: 'Failed to send en-route notification',
        jobId,
        error: notifyError instanceof Error ? notifyError.message : String(notifyError),
      });
    }

    technicianLogger.info({
      msg: 'Technician en route',
      userId: user.id,
      jobId,
      estimatedMinutes,
      smsSent,
    });

    return NextResponse.json({
      success: true,
      eta: `${estimatedMinutes} minutes`,
      etaTime,
      smsSent,
    });
  } catch (error) {
    technicianLogger.error({
      msg: 'Error processing on-the-way request',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
