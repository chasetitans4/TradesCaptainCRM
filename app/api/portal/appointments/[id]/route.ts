// =====================================================
// PORTAL SINGLE APPOINTMENT API
// GET /api/portal/appointments/[id] - Get appointment details
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch the appointment/job with details
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        scheduled_date,
        scheduled_time,
        estimated_duration,
        status,
        job_type,
        notes,
        created_at,
        updated_at,
        started_at,
        completed_at,
        customer:customers!jobs_customer_id_fkey (
          id,
          name,
          address_line1,
          city,
          state,
          zip
        ),
        assigned_user:users!jobs_assigned_user_id_fkey (
          id,
          full_name,
          phone
        )
      `)
      .eq('id', id)
      .eq('customer_id', session.customerId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Build timestamps object for timeline
    const timestamps: Record<string, string> = {};
    if (job.created_at) timestamps.scheduled_at = job.created_at;
    if (job.started_at) timestamps.started_at = job.started_at;
    if (job.completed_at) timestamps.completed_at = job.completed_at;

    // Try to get additional timestamps from job_activities if available
    const { data: activities } = await supabase
      .from('job_activities')
      .select('activity_type, created_at')
      .eq('job_id', id)
      .in('activity_type', ['confirmed', 'on_the_way', 'arrived', 'started', 'completed'])
      .order('created_at', { ascending: true });

    if (activities) {
      activities.forEach((activity) => {
        const key = `${activity.activity_type}_at`;
        if (!timestamps[key]) {
          timestamps[key] = activity.created_at;
        }
      });
    }

    // Format the response
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    const assignedUser = Array.isArray(job.assigned_user) ? job.assigned_user[0] : job.assigned_user;

    const appointment = {
      id: job.id,
      title: job.title,
      description: job.description,
      scheduled_date: job.scheduled_date,
      scheduled_time: job.scheduled_time,
      estimated_duration: job.estimated_duration,
      status: job.status,
      job_type: job.job_type,
      notes: job.notes,
      address: customer?.address_line1,
      city: customer?.city,
      assigned_user: assignedUser ? {
        id: assignedUser.id,
        name: assignedUser.full_name || 'Technician',
        phone: assignedUser.phone,
      } : null,
      timestamps,
    };

    return NextResponse.json({ appointment });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal appointment detail error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to load appointment' },
      { status: 500 }
    );
  }
}
