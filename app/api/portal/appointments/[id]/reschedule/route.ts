// =====================================================
// PORTAL APPOINTMENT RESCHEDULE API
// POST /api/portal/appointments/[id]/reschedule - Request appointment reschedule
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

interface RescheduleRequest {
  businessId: string;
  preferredDate: string;
  preferredTime?: string;
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: RescheduleRequest = await request.json();
    const { businessId, preferredDate, preferredTime, reason } = body;

    if (!businessId || !preferredDate) {
      return NextResponse.json(
        { error: 'Business ID and preferred date are required' },
        { status: 400 }
      );
    }

    // Verify portal session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`portal_session_${businessId}`);

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const customerId = sessionData.customerId;
    if (!customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify the job belongs to this customer and business
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, customer_id, business_id, status, scheduled_date')
      .eq('id', id)
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Only allow reschedule for scheduled jobs
    if (!['scheduled', 'confirmed'].includes(job.status)) {
      return NextResponse.json(
        { error: 'This appointment cannot be rescheduled' },
        { status: 400 }
      );
    }

    // Get customer info for the notification
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone, email')
      .eq('id', customerId)
      .single();

    // Create a reschedule request record (activity log)
    const { error: activityError } = await supabase
      .from('activity_log')
      .insert({
        business_id: businessId,
        entity_type: 'job',
        entity_id: id,
        action: 'reschedule_requested',
        description: `Customer ${customer?.name || 'Unknown'} requested to reschedule to ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}${reason ? `. Reason: ${reason}` : ''}`,
        metadata: {
          customer_id: customerId,
          customer_name: customer?.name,
          original_date: job.scheduled_date,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          reason,
          source: 'portal',
        },
      });

    if (activityError) {
      apiLogger.error({ error: activityError, context: 'creating reschedule activity log' });
    }

    // Create a reminder/task for staff to handle reschedule
    const { error: reminderError } = await supabase
      .from('reminders')
      .insert({
        business_id: businessId,
        title: `Reschedule request: ${job.title}`,
        description: `Customer ${customer?.name || 'Unknown'} requested to reschedule to ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}${reason ? `. Reason: ${reason}` : ''}`,
        type: 'task',
        due_at: new Date().toISOString(),
        priority: 'high',
        related_entity_type: 'job',
        related_entity_id: id,
      });

    if (reminderError) {
      apiLogger.error({ error: reminderError, context: 'creating reschedule reminder' });
    }

    // Update job with reschedule flag
    await supabase
      .from('jobs')
      .update({
        metadata: {
          reschedule_requested: true,
          reschedule_preferred_date: preferredDate,
          reschedule_preferred_time: preferredTime,
          reschedule_reason: reason,
          reschedule_requested_at: new Date().toISOString(),
        },
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Reschedule request submitted. The business will contact you to confirm.',
    });
  } catch (error) {
    apiLogger.error({ error, context: 'portal appointment reschedule API' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
