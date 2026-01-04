// =====================================================
// JOB REMINDER SCHEDULING
// Auto-schedule SMS reminders when jobs are created/updated
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const remindersLogger = logger.child({ context: 'reminders.jobs' });

interface ScheduleRemindersOptions {
  jobId: string;
  businessId: string;
  customerId: string;
  customerPhone: string;
  scheduledDate: string;
  scheduledTime?: string;
  serviceTitle: string;
}

// Default reminder templates
const REMINDER_24H_TEMPLATE = `Hi {{customer_name}}! This is a reminder that {{business_name}} has you scheduled for {{service}} tomorrow at {{job_time}}.

Reply CONFIRM to confirm or RESCHEDULE if you need to change. Questions? Call us at {{business_phone}}.`;

const REMINDER_2H_TEMPLATE = `Reminder: {{business_name}} will be arriving for your {{service}} in about 2 hours. See you soon!`;

/**
 * Schedule SMS reminders for a job
 * Call this when a job is created or updated with a scheduled date
 */
export async function scheduleJobReminders(options: ScheduleRemindersOptions) {
  const {
    jobId,
    businessId,
    customerId,
    customerPhone,
    scheduledDate,
    scheduledTime,
  } = options;

  if (!customerPhone || !scheduledDate) {
    return { success: false, error: 'Missing phone or scheduled date' };
  }

  const supabase = await createServerSupabaseClient();

  // First, cancel any existing pending reminders for this job
  await supabase
    .from('scheduled_messages')
    .update({ status: 'cancelled' })
    .eq('job_id', jobId)
    .eq('status', 'pending');

  // Parse the scheduled date and time
  const jobDateTime = new Date(`${scheduledDate}T${scheduledTime || '09:00'}:00`);

  // Don't schedule if job is in the past
  if (jobDateTime < new Date()) {
    return { success: false, error: 'Job is in the past' };
  }

  const reminders: Array<{
    scheduled_for: string;
    content: string;
  }> = [];

  // 24-hour reminder (1 day before)
  const reminder24h = new Date(jobDateTime);
  reminder24h.setDate(reminder24h.getDate() - 1);

  // Only schedule if it's still in the future
  if (reminder24h > new Date()) {
    reminders.push({
      scheduled_for: reminder24h.toISOString(),
      content: REMINDER_24H_TEMPLATE,
    });
  }

  // 2-hour reminder
  const reminder2h = new Date(jobDateTime);
  reminder2h.setHours(reminder2h.getHours() - 2);

  // Only schedule if it's still in the future and job is tomorrow or later
  if (reminder2h > new Date()) {
    reminders.push({
      scheduled_for: reminder2h.toISOString(),
      content: REMINDER_2H_TEMPLATE,
    });
  }

  if (reminders.length === 0) {
    return { success: false, error: 'No reminders to schedule (job too soon)' };
  }

  // Insert reminders
  const { error } = await supabase.from('scheduled_messages').insert(
    reminders.map((reminder) => ({
      business_id: businessId,
      customer_id: customerId,
      job_id: jobId,
      phone_number: customerPhone,
      content: reminder.content,
      scheduled_for: reminder.scheduled_for,
      status: 'pending',
    }))
  );

  if (error) {
    remindersLogger.error({
      msg: 'Error scheduling reminders',
      jobId,
      businessId,
      customerId,
      phone: customerPhone.slice(-4),
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: 'Failed to schedule reminders' };
  }

  return { success: true, count: reminders.length };
}

/**
 * Cancel all pending reminders for a job
 * Call this when a job is cancelled or deleted
 */
export async function cancelJobReminders(jobId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('scheduled_messages')
    .update({ status: 'cancelled' })
    .eq('job_id', jobId)
    .eq('status', 'pending');

  if (error) {
    remindersLogger.error({
      msg: 'Error cancelling reminders',
      jobId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: 'Failed to cancel reminders' };
  }

  return { success: true };
}

/**
 * Get pending reminders for a job
 */
export async function getJobReminders(jobId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('job_id', jobId)
    .in('status', ['pending', 'sent'])
    .order('scheduled_for', { ascending: true });

  if (error) {
    remindersLogger.error({
      msg: 'Error fetching reminders',
      jobId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: 'Failed to fetch reminders' };
  }

  return { success: true, reminders: data };
}
