import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { sendUrgentSMS } from '@/lib/notifications/sms-batcher';
import { logger } from '@/lib/logger';

const technicianLogger = logger.child({ context: 'technician.running-late' });

/**
 * POST /api/technician/running-late
 * Sends a "running late" notification to the customer with updated ETA.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, delayMinutes, reason } = body;

    if (!jobId || !delayMinutes) {
      return NextResponse.json({ error: 'Job ID and delay minutes required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get job details with customer info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        assigned_user_id,
        business_id,
        scheduled_time,
        customer:customers (
          id, name, phone
        ),
        business:businesses (
          id, name, twilio_phone_number
        ),
        assigned_user:users!jobs_assigned_user_id_fkey (
          id, name
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

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    const business = Array.isArray(job.business) ? job.business[0] : job.business;
    const tech = Array.isArray(job.assigned_user) ? job.assigned_user[0] : job.assigned_user;

    if (!customer?.phone) {
      return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 });
    }

    // Calculate new ETA
    const newEta = new Date(Date.now() + delayMinutes * 60 * 1000);
    const etaStr = newEta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Send SMS
    const techName = tech?.name || 'Your technician';
    const bizName = business?.name || 'our team';
    const message = `Hi ${customer.name}! ${techName} from ${bizName} is running about ${delayMinutes} minutes late. New ETA: ${etaStr}. We apologize for the inconvenience!`;

    let smsSent = false;
    try {
      await sendUrgentSMS({
        to: customer.phone,
        message,
        businessId: job.business_id,
        customerId: customer.id,
      });
      smsSent = true;
    } catch (smsError) {
      technicianLogger.warn({
        msg: 'Failed to send running-late SMS',
        jobId,
        error: smsError instanceof Error ? smsError.message : String(smsError),
      });
    }

    // Log to dispatch history
    await supabase.from('dispatch_history').insert({
      job_id: jobId,
      action: 'running_late',
      to_user_id: user.id,
      notes: `Running ${delayMinutes} min late${reason ? ` - ${reason}` : ''}. New ETA: ${etaStr}`,
    });

    technicianLogger.info({
      msg: 'Running late notification sent',
      userId: user.id,
      jobId,
      delayMinutes,
      smsSent,
    });

    return NextResponse.json({
      success: true,
      newEta: etaStr,
      delayMinutes,
      smsSent,
    });
  } catch (error) {
    technicianLogger.error({
      msg: 'Error processing running-late request',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
