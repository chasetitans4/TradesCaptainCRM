// =====================================================
// DISPATCH ACTIONS
// Job assignment and scheduling operations
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio/sms';

/**
 * Assign job to technician
 */
export async function assignJob(
  jobId: string,
  technicianId: string,
  options?: {
    scheduledDate?: string;
    scheduledTime?: string;
    notifyTechnician?: boolean;
    notifyCustomer?: boolean;
    dispatchedBy?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current assignment for history
  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_user_id, scheduled_date, scheduled_time, customer_id, business_id, title')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  // Update job
  const updates: Record<string, any> = {
    assigned_user_id: technicianId,
    status: 'scheduled',
  };

  if (options?.scheduledDate) updates.scheduled_date = options.scheduledDate;
  if (options?.scheduledTime) updates.scheduled_time = options.scheduledTime;

  const { error } = await supabase.from('jobs').update(updates).eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log dispatch history
  await supabase.from('dispatch_history').insert({
    job_id: jobId,
    action: job.assigned_user_id ? 'reassigned' : 'assigned',
    from_user_id: job.assigned_user_id,
    to_user_id: technicianId,
    dispatched_by: options?.dispatchedBy,
    scheduled_date: options?.scheduledDate || job.scheduled_date,
    scheduled_time: options?.scheduledTime || job.scheduled_time,
  });

  // Send notifications if requested
  if (options?.notifyTechnician !== false) {
    try {
      const { data: tech } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', technicianId)
        .single();

      if (tech?.phone) {
        const scheduleInfo = options?.scheduledDate
          ? ` for ${new Date(options.scheduledDate).toLocaleDateString()}${options?.scheduledTime ? ` at ${options.scheduledTime}` : ''}`
          : '';

        await sendSMS({
          to: tech.phone,
          body: `New job assigned: ${job.title}${scheduleInfo}. Check your dashboard for details.`,
          businessId: job.business_id,
        });
      }
    } catch (e) {
      // Log but don't fail the assignment
      console.error('Failed to notify technician:', e);
    }
  }

  if (options?.notifyCustomer && job.customer_id) {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone, name, email')
        .eq('id', job.customer_id)
        .single();

      const { data: tech } = await supabase
        .from('users')
        .select('name')
        .eq('id', technicianId)
        .single();

      if (customer?.phone) {
        const scheduleInfo = options?.scheduledDate
          ? ` on ${new Date(options.scheduledDate).toLocaleDateString()}${options?.scheduledTime ? ` at ${options.scheduledTime}` : ''}`
          : ' soon';

        await sendSMS({
          to: customer.phone,
          body: `Hi ${customer.name?.split(' ')[0] || 'there'}, your service has been scheduled${scheduleInfo}. ${tech?.name || 'Your technician'} will be assisting you.`,
          businessId: job.business_id,
        });
      }
    } catch (e) {
      // Log but don't fail the assignment
      console.error('Failed to notify customer:', e);
    }
  }

  return { success: true };
}

/**
 * Unassign job from technician
 */
export async function unassignJob(
  jobId: string,
  reason?: string,
  unassignedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_user_id, scheduled_date, scheduled_time')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (!job.assigned_user_id) {
    return { success: false, error: 'Job is not assigned' };
  }

  const { error } = await supabase
    .from('jobs')
    .update({ assigned_user_id: null })
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('dispatch_history').insert({
    job_id: jobId,
    action: 'unassigned',
    from_user_id: job.assigned_user_id,
    reason,
    dispatched_by: unassignedBy,
    scheduled_date: job.scheduled_date,
    scheduled_time: job.scheduled_time,
  });

  return { success: true };
}

/**
 * Bulk assign jobs
 */
export async function bulkAssignJobs(
  assignments: Array<{ jobId: string; technicianId: string }>,
  options?: {
    dispatchedBy?: string;
    notifyTechnicians?: boolean;
  }
): Promise<{
  success: boolean;
  assigned: number;
  failed: number;
  errors: string[];
}> {
  const results = await Promise.all(
    assignments.map((a) =>
      assignJob(a.jobId, a.technicianId, {
        notifyTechnician: options?.notifyTechnicians,
        dispatchedBy: options?.dispatchedBy,
      })
    )
  );

  const assigned = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const errors = results.filter((r) => !r.success).map((r) => r.error || 'Unknown error');

  return { success: failed === 0, assigned, failed, errors };
}

/**
 * Reschedule job
 */
export async function rescheduleJob(
  jobId: string,
  newDate: string,
  newTime?: string,
  options?: {
    notifyCustomer?: boolean;
    notifyTechnician?: boolean;
    rescheduledBy?: string;
    reason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('scheduled_date, scheduled_time, assigned_user_id, customer_id, business_id')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      scheduled_date: newDate,
      scheduled_time: newTime || job.scheduled_time,
    })
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log history
  await supabase.from('dispatch_history').insert({
    job_id: jobId,
    action: 'reassigned',
    to_user_id: job.assigned_user_id,
    reason: options?.reason || 'Rescheduled',
    dispatched_by: options?.rescheduledBy,
    scheduled_date: newDate,
    scheduled_time: newTime || job.scheduled_time,
  });

  // Send reschedule notifications
  const formattedDate = new Date(newDate).toLocaleDateString();
  const timeInfo = newTime || job.scheduled_time;
  const scheduleText = timeInfo ? `${formattedDate} at ${timeInfo}` : formattedDate;

  if (options?.notifyTechnician && job.assigned_user_id) {
    try {
      const { data: tech } = await supabase
        .from('users')
        .select('phone')
        .eq('id', job.assigned_user_id)
        .single();

      if (tech?.phone) {
        await sendSMS({
          to: tech.phone,
          body: `Job rescheduled to ${scheduleText}. Check your dashboard for details.`,
          businessId: job.business_id,
        });
      }
    } catch (e) {
      console.error('Failed to notify technician of reschedule:', e);
    }
  }

  if (options?.notifyCustomer && job.customer_id) {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone, name')
        .eq('id', job.customer_id)
        .single();

      if (customer?.phone) {
        await sendSMS({
          to: customer.phone,
          body: `Hi ${customer.name?.split(' ')[0] || 'there'}, your service has been rescheduled to ${scheduleText}. We apologize for any inconvenience.`,
          businessId: job.business_id,
        });
      }
    } catch (e) {
      console.error('Failed to notify customer of reschedule:', e);
    }
  }

  return { success: true };
}

/**
 * Update technician location
 */
export async function updateTechnicianLocation(
  userId: string,
  data: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    status?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('technician_locations').upsert(
    {
      user_id: userId,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || null,
      city: data.city || null,
      status: data.status || 'available',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update technician status
 */
export async function updateTechnicianStatus(
  userId: string,
  status: 'available' | 'en_route' | 'on_job' | 'break' | 'offline',
  currentJobId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('technician_locations').upsert(
    {
      user_id: userId,
      status,
      current_job_id: currentJobId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Start job (technician action)
 */
export async function startJob(
  jobId: string,
  technicianId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify technician is assigned
  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_user_id, status')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.assigned_user_id !== technicianId) {
    return { success: false, error: 'You are not assigned to this job' };
  }

  if (job.status === 'in_progress') {
    return { success: false, error: 'Job is already in progress' };
  }

  // Update job status
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update technician status
  await updateTechnicianStatus(technicianId, 'on_job', jobId);

  // Log history
  await supabase.from('dispatch_history').insert({
    job_id: jobId,
    action: 'started',
    to_user_id: technicianId,
  });

  return { success: true };
}

/**
 * Complete job (technician action)
 */
export async function completeJob(
  jobId: string,
  technicianId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_user_id, status')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.assigned_user_id !== technicianId) {
    return { success: false, error: 'You are not assigned to this job' };
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_notes: notes,
    })
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update technician status
  await updateTechnicianStatus(technicianId, 'available');

  // Log history
  await supabase.from('dispatch_history').insert({
    job_id: jobId,
    action: 'completed',
    to_user_id: technicianId,
  });

  return { success: true };
}

/**
 * Get dispatch history for a job
 */
export async function getJobDispatchHistory(
  jobId: string
): Promise<
  Array<{
    id: string;
    action: string;
    fromUser: string | null;
    toUser: string | null;
    dispatchedBy: string | null;
    reason: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    createdAt: string;
  }>
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('dispatch_history')
    .select(`
      id,
      action,
      from_user:users!dispatch_history_from_user_id_fkey(name),
      to_user:users!dispatch_history_to_user_id_fkey(name),
      dispatched_by_user:users!dispatch_history_dispatched_by_fkey(name),
      reason,
      scheduled_date,
      scheduled_time,
      created_at
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  return (data || []).map((h) => ({
    id: h.id,
    action: h.action,
    fromUser: (h.from_user as any)?.name || null,
    toUser: (h.to_user as any)?.name || null,
    dispatchedBy: (h.dispatched_by_user as any)?.name || null,
    reason: h.reason,
    scheduledDate: h.scheduled_date,
    scheduledTime: h.scheduled_time,
    createdAt: h.created_at,
  }));
}

/**
 * Set technician schedule
 */
export async function setTechnicianSchedule(
  userId: string,
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Delete existing regular schedules
  await supabase
    .from('technician_schedules')
    .delete()
    .eq('user_id', userId)
    .eq('schedule_type', 'regular');

  // Insert new schedules
  const schedules = schedule.map((s) => ({
    user_id: userId,
    schedule_type: 'regular',
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    is_active: true,
  }));

  const { error } = await supabase.from('technician_schedules').insert(schedules);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add time off for technician
 */
export async function addTimeOff(
  userId: string,
  data: {
    startDate: string;
    endDate: string;
    title?: string;
    notes?: string;
  }
): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: schedule, error } = await supabase
    .from('technician_schedules')
    .insert({
      user_id: userId,
      schedule_type: 'time_off',
      start_date: data.startDate,
      end_date: data.endDate,
      title: data.title || 'Time Off',
      notes: data.notes,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, scheduleId: schedule.id };
}

/**
 * Remove time off
 */
export async function removeTimeOff(scheduleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('technician_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('schedule_type', 'time_off');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
