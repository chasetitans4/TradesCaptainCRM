// =====================================================
// JOB SYNC LOGIC
// Automatically sync jobs to external calendar
// Feature flag: Set NYLAS_ENABLED=false to disable for cost savings
// =====================================================

import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './calendar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Check if Nylas calendar sync is enabled
 * Feature flag to disable Nylas for cost savings when not needed
 * Set NYLAS_ENABLED=false in environment to disable
 */
function isNylasSyncEnabled(): boolean {
  // Disable if NYLAS_ENABLED is explicitly set to 'false'
  if (process.env.NYLAS_ENABLED === 'false') {
    return false;
  }
  // Default to enabled if Nylas API key is configured
  return !!process.env.NYLAS_API_KEY;
}

interface JobWithCustomer {
  id: string;
  service_type: string;
  description?: string | null;
  scheduled_date: string;
  scheduled_time_start?: string | null;
  assigned_user_id?: string | null;
  external_calendar_event_id?: string | null;
  customer?: {
    name: string;
    phone?: string | null;
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  job_address_line1?: string | null;
  job_address_city?: string | null;
  job_address_state?: string | null;
  job_address_zip?: string | null;
}

/**
 * Sync a job to the assigned user's external calendar
 */
export async function syncJobToCalendar(
  job: JobWithCustomer,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  // Check feature flag - skip if Nylas is disabled
  if (!isNylasSyncEnabled()) {
    return;
  }

  if (!job.assigned_user_id) {
    return; // No user assigned, nothing to sync
  }

  const supabase = await createServerSupabaseClient();

  // Get assigned user's calendar connection
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', job.assigned_user_id)
    .single();

  // If no calendar connected or sync disabled, skip silently
  if (!connection || !connection.sync_enabled) {
    return;
  }

  // Build address from job address or customer address
  const address = job.job_address_line1
    ? [
        job.job_address_line1,
        job.job_address_city,
        job.job_address_state,
        job.job_address_zip,
      ]
        .filter(Boolean)
        .join(', ')
    : job.customer
    ? [
        job.customer.address_line1,
        job.customer.city,
        job.customer.state,
        job.customer.zip,
      ]
        .filter(Boolean)
        .join(', ')
    : undefined;

  const jobForCalendar = {
    id: job.id,
    title: job.service_type,
    description: job.description || undefined,
    scheduled_date: job.scheduled_date,
    scheduled_time_start: job.scheduled_time_start || undefined,
    estimated_duration: 1, // Default 1 hour
    customer: {
      name: job.customer?.name || 'Customer',
      phone: job.customer?.phone || undefined,
      address,
    },
  };

  switch (action) {
    case 'create':
      const eventId = await createCalendarEvent(job.assigned_user_id, jobForCalendar);

      if (eventId) {
        await supabase
          .from('jobs')
          .update({ external_calendar_event_id: eventId })
          .eq('id', job.id);
      }
      break;

    case 'update':
      if (job.external_calendar_event_id) {
        await updateCalendarEvent(
          job.assigned_user_id,
          job.external_calendar_event_id,
          jobForCalendar
        );
      } else {
        // No existing event, create one
        const newEventId = await createCalendarEvent(job.assigned_user_id, jobForCalendar);
        if (newEventId) {
          await supabase
            .from('jobs')
            .update({ external_calendar_event_id: newEventId })
            .eq('id', job.id);
        }
      }
      break;

    case 'delete':
      if (job.external_calendar_event_id) {
        await deleteCalendarEvent(job.assigned_user_id, job.external_calendar_event_id);
        await supabase
          .from('jobs')
          .update({ external_calendar_event_id: null })
          .eq('id', job.id);
      }
      break;
  }
}

/**
 * Hook: Call when a job is created
 */
export async function onJobCreated(job: JobWithCustomer): Promise<void> {
  await syncJobToCalendar(job, 'create');
}

/**
 * Hook: Call when a job is updated
 */
export async function onJobUpdated(job: JobWithCustomer): Promise<void> {
  await syncJobToCalendar(job, 'update');
}

/**
 * Hook: Call when a job is deleted or cancelled
 */
export async function onJobDeleted(job: JobWithCustomer): Promise<void> {
  await syncJobToCalendar(job, 'delete');
}
