// =====================================================
// JOB WRAP UP API
// POST /api/jobs/[id]/wrapup — Create wrap up record
// GET  /api/jobs/[id]/wrapup — Get wrap up record(s)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { updateTechnicianStatus } from '@/lib/dispatch/actions';
import { apiLogger } from '@/lib/logger';
import type { WrapUpCompletionStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/jobs/[id]/wrapup
 * Create a wrap up record and transition job status
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();

    const {
      completion_status,
      invoice_ready = false,
      return_reason,
      return_scheduled_for,
      callback_reason,
      wrapup_started_at,
    } = body;

    // Validate completion_status
    const validStatuses: WrapUpCompletionStatus[] = ['completed', 'return_needed', 'callback'];
    if (!completion_status || !validStatuses.includes(completion_status)) {
      return NextResponse.json(
        { error: 'Invalid completion_status. Must be: completed, return_needed, or callback' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, assigned_user_id, customer_id, business_id, arrived_at, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job is in_progress
    if (job.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Job must be in progress to wrap up' },
        { status: 400 }
      );
    }

    // Verify user is assigned to job (or admin/owner)
    const isAssigned = job.assigned_user_id === user.id;
    const isAdmin = ['owner', 'admin', 'super_admin'].includes(user.role);
    if (!isAssigned && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    // Check for duplicate wrap up in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingWrapup } = await supabase
      .from('job_wrapups')
      .select('id, technician_name, wrapup_confirmed_at')
      .eq('job_id', jobId)
      .gte('created_at', oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (existingWrapup) {
      return NextResponse.json(
        { error: `This job was already wrapped up by ${existingWrapup.technician_name || 'another technician'}` },
        { status: 409 }
      );
    }

    // Calculate job duration
    const now = new Date();
    let jobDurationMinutes: number | null = null;
    if (job.arrived_at) {
      const arrivalTime = new Date(job.arrived_at);
      jobDurationMinutes = Math.round((now.getTime() - arrivalTime.getTime()) / 60000);
    }

    // Create wrapup record
    const wrapupData = {
      business_id: job.business_id,
      job_id: jobId,
      customer_id: job.customer_id,
      technician_id: user.id,
      technician_name: user.name || user.email,
      completion_status,
      return_reason: completion_status === 'return_needed' ? return_reason : null,
      return_scheduled_for: completion_status === 'return_needed' ? return_scheduled_for : null,
      callback_reason: completion_status === 'callback' ? callback_reason : null,
      invoice_ready: completion_status === 'completed' ? invoice_ready : false,
      job_arrival_time: job.arrived_at || null,
      job_departure_time: completion_status === 'completed' ? now.toISOString() : null,
      job_duration_minutes: jobDurationMinutes,
      wrapup_started_at: wrapup_started_at || now.toISOString(),
      wrapup_confirmed_at: now.toISOString(),
    };

    const { data: wrapup, error: wrapupError } = await supabase
      .from('job_wrapups')
      .insert(wrapupData)
      .select()
      .single();

    if (wrapupError) {
      apiLogger.error({ msg: 'Error creating wrapup record', error: wrapupError });
      return NextResponse.json(
        { error: 'Failed to create wrap up record' },
        { status: 500 }
      );
    }

    // Update job status
    const jobUpdate: Record<string, any> = {
      status: completion_status,
    };

    if (completion_status === 'completed') {
      jobUpdate.completed_at = now.toISOString();
      jobUpdate.departed_at = now.toISOString();
    }

    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update(jobUpdate)
      .eq('id', jobId);

    if (jobUpdateError) {
      apiLogger.error({ msg: 'Error updating job status', error: jobUpdateError });
      // Wrapup record was created, but job update failed - still return success
      // The wrapup record serves as the source of truth
    }

    // Update technician status to available
    await updateTechnicianStatus(user.id, 'available');

    // Log dispatch history
    await supabase.from('dispatch_history').insert({
      job_id: jobId,
      action: completion_status === 'completed' ? 'completed' : `wrapup_${completion_status}`,
      to_user_id: user.id,
    });

    return NextResponse.json({
      id: wrapup.id,
      job_id: jobId,
      completion_status,
      invoice_ready: wrapup.invoice_ready,
      job_duration_minutes: jobDurationMinutes,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error processing job wrap up',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    return NextResponse.json(
      { error: 'Failed to process wrap up' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[id]/wrapup
 * Get the latest wrap up record for a job
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get latest wrapup for this job
    const { data: wrapup, error } = await supabase
      .from('job_wrapups')
      .select('*')
      .eq('job_id', jobId)
      .eq('business_id', user.business_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      apiLogger.error({ msg: 'Error fetching wrapup', error });
      return NextResponse.json({ error: 'Failed to fetch wrap up' }, { status: 500 });
    }

    if (!wrapup) {
      return NextResponse.json({ wrapup: null });
    }

    return NextResponse.json({ wrapup });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching job wrap up',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    return NextResponse.json({ error: 'Failed to fetch wrap up' }, { status: 500 });
  }
}
