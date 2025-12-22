// =====================================================
// QUEUE HELPERS
// High-level functions to add jobs to queues
// =====================================================

import {
  emailQueue,
  smsQueue,
  notificationQueue,
  syncQueue,
  reportQueue,
  reminderQueue,
  webhookQueue,
  defaultJobOptions,
  priorityJobOptions,
  lowPriorityJobOptions,
} from './client';

// =====================================================
// EMAIL JOBS
// =====================================================

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  businessId: string;
  customerId?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

/**
 * Queue a single email
 */
export async function queueEmail(data: EmailJobData) {
  return emailQueue.add('send_email', data, defaultJobOptions);
}

/**
 * Queue a priority email (e.g., password reset)
 */
export async function queuePriorityEmail(data: EmailJobData) {
  return emailQueue.add('send_email', data, priorityJobOptions);
}

/**
 * Queue bulk emails (staggered to avoid rate limits)
 */
export async function queueBulkEmail(
  emails: EmailJobData[],
  staggerMs: number = 100
) {
  const jobs = emails.map((email, index) => ({
    name: 'send_email',
    data: email,
    opts: {
      ...defaultJobOptions,
      delay: index * staggerMs,
    },
  }));

  return emailQueue.addBulk(jobs);
}

// =====================================================
// SMS JOBS
// =====================================================

export interface SMSJobData {
  to: string;
  message: string;
  businessId: string;
  customerId?: string;
  mediaUrl?: string;
}

/**
 * Queue a single SMS
 */
export async function queueSMS(data: SMSJobData) {
  return smsQueue.add('send_sms', data, defaultJobOptions);
}

/**
 * Queue bulk SMS (staggered)
 */
export async function queueBulkSMS(
  messages: SMSJobData[],
  staggerMs: number = 100
) {
  const jobs = messages.map((msg, index) => ({
    name: 'send_sms',
    data: msg,
    opts: {
      ...defaultJobOptions,
      delay: index * staggerMs,
    },
  }));

  return smsQueue.addBulk(jobs);
}

// =====================================================
// NOTIFICATION JOBS
// =====================================================

export interface NotificationJobData {
  userId?: string;
  businessId: string;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Queue a push notification
 */
export async function queueNotification(data: NotificationJobData) {
  return notificationQueue.add('send_notification', data, defaultJobOptions);
}

/**
 * Queue notifications to all users in a business
 */
export async function queueBusinessNotification(
  businessId: string,
  title: string,
  body: string,
  url?: string
) {
  return notificationQueue.add(
    'send_business_notification',
    { businessId, title, body, url },
    defaultJobOptions
  );
}

// =====================================================
// SYNC JOBS
// =====================================================

/**
 * Queue QuickBooks sync (with deduplication)
 */
export async function queueQuickBooksSync(
  businessId: string,
  entityType: string,
  entityId: string
) {
  return syncQueue.add(
    'sync_quickbooks',
    { businessId, entityType, entityId },
    {
      ...defaultJobOptions,
      delay: 5000, // Wait 5 seconds (debounce rapid updates)
      jobId: `qb_${entityType}_${entityId}`, // Deduplicate by entity
    }
  );
}

/**
 * Queue Google Calendar sync
 */
export async function queueCalendarSync(
  businessId: string,
  userId: string,
  action: 'create' | 'update' | 'delete',
  jobId: string
) {
  return syncQueue.add(
    'sync_calendar',
    { businessId, userId, action, jobId },
    {
      ...defaultJobOptions,
      jobId: `calendar_${action}_${jobId}`,
    }
  );
}

/**
 * Queue full QuickBooks sync (for initial setup or reconciliation)
 */
export async function queueFullQuickBooksSync(businessId: string) {
  return syncQueue.add(
    'full_quickbooks_sync',
    { businessId },
    {
      ...lowPriorityJobOptions,
      jobId: `qb_full_${businessId}`,
    }
  );
}

// =====================================================
// REMINDER JOBS
// =====================================================

/**
 * Schedule an appointment reminder
 */
export async function scheduleAppointmentReminder(
  jobId: string,
  customerId: string,
  customerPhone: string,
  message: string,
  businessId: string,
  sendAt: Date
) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());

  return reminderQueue.add(
    'appointment_reminder',
    {
      to: customerPhone,
      message,
      businessId,
      customerId,
      jobId,
    },
    {
      ...defaultJobOptions,
      delay,
      jobId: `reminder_${jobId}`,
    }
  );
}

/**
 * Cancel a scheduled reminder
 */
export async function cancelAppointmentReminder(jobId: string) {
  const job = await reminderQueue.getJob(`reminder_${jobId}`);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

/**
 * Schedule a follow-up reminder for a lead
 */
export async function scheduleLeadFollowUp(
  leadId: string,
  userId: string,
  businessId: string,
  followUpAt: Date
) {
  const delay = Math.max(0, followUpAt.getTime() - Date.now());

  return reminderQueue.add(
    'lead_follow_up',
    { leadId, userId, businessId },
    {
      ...defaultJobOptions,
      delay,
      jobId: `followup_${leadId}`,
    }
  );
}

// =====================================================
// REPORT JOBS
// =====================================================

/**
 * Queue a report generation
 */
export async function queueReportGeneration(
  businessId: string,
  reportType: string,
  params: Record<string, any>,
  userId: string
) {
  return reportQueue.add(
    'generate_report',
    { businessId, reportType, params, userId },
    lowPriorityJobOptions
  );
}

/**
 * Queue scheduled report (e.g., weekly summary)
 */
export async function queueScheduledReport(
  businessId: string,
  reportType: string,
  schedule: 'daily' | 'weekly' | 'monthly'
) {
  return reportQueue.add(
    'scheduled_report',
    { businessId, reportType, schedule },
    {
      ...lowPriorityJobOptions,
      jobId: `scheduled_${reportType}_${businessId}`,
      repeat: {
        pattern: schedule === 'daily'
          ? '0 8 * * *'     // 8 AM daily
          : schedule === 'weekly'
            ? '0 8 * * 1'    // 8 AM Monday
            : '0 8 1 * *',   // 8 AM first of month
      },
    }
  );
}

// =====================================================
// WEBHOOK JOBS
// =====================================================

/**
 * Queue an outbound webhook
 */
export async function queueWebhook(
  url: string,
  event: string,
  payload: Record<string, any>,
  businessId: string
) {
  return webhookQueue.add(
    'send_webhook',
    { url, event, payload, businessId },
    defaultJobOptions
  );
}

// =====================================================
// SURVEY JOBS
// =====================================================

/**
 * Queue survey to be sent after job completion
 */
export async function queueSurveySend(
  businessId: string,
  customerId: string,
  jobId: string,
  delayHours: number = 2
) {
  const delay = delayHours * 60 * 60 * 1000;

  return smsQueue.add(
    'send_survey',
    { businessId, customerId, jobId },
    {
      ...defaultJobOptions,
      delay,
      jobId: `survey_${jobId}`,
    }
  );
}
