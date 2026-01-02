// =====================================================
// QUEUE WORKERS
// Background job processors
// =====================================================

import { Worker, Job, type ConnectionOptions } from 'bullmq';

// Get connection config
const getConnection = (): ConnectionOptions => {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

// =====================================================
// EMAIL WORKER
// =====================================================
export const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    const { to, subject, html, text, businessId, customerId, replyTo, attachments } = job.data;

    // Dynamic import to avoid circular dependencies
    const { sendEmail } = await import('@/lib/email');

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    return {
      sent: result.success,
      to,
      messageId: result.success ? (result.data as any)?.id : undefined,
      error: result.success ? undefined : (result.error as any)?.message || result.error,
    };
  },
  {
    connection: getConnection(),
    concurrency: 5, // Process 5 emails at a time
  }
);

// =====================================================
// SMS WORKER
// =====================================================
export const smsWorker = new Worker(
  'sms',
  async (job: Job) => {
    const { to, message, businessId, customerId, mediaUrl } = job.data;

    // Handle different SMS job types
    if (job.name === 'send_survey') {
      const { sendSurvey } = await import('@/lib/surveys');
      await sendSurvey(businessId, customerId, job.data.jobId);
      return { sent: true, type: 'survey' };
    }

    // Regular SMS
    const { sendSMS } = await import('@/lib/twilio');

    const result = await sendSMS({ to, body: message, businessId });

    return { sent: true, twilioSid: result.twilioSid };
  },
  {
    connection: getConnection(),
    concurrency: 10,
    limiter: {
      max: 50, // Max 50 jobs
      duration: 1000, // Per second
    },
  }
);

// =====================================================
// NOTIFICATION WORKER
// =====================================================
export const notificationWorker = new Worker(
  'notification',
  async (job: Job) => {
    const { userId, businessId, title, body, url, metadata } = job.data;

    const { sendPushNotification } = await import('@/lib/notifications/push');

    if (job.name === 'send_business_notification') {
      // Send to all users in business
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('business_id', businessId);

      for (const user of users || []) {
        await sendPushNotification({
          userId: user.id,
          businessId,
          title,
          body,
          url,
          metadata,
        });
      }

      return { sent: true, userCount: users?.length || 0 };
    }

    // Single user notification
    await sendPushNotification({
      userId,
      businessId,
      title,
      body,
      url,
      metadata,
    });

    return { sent: true, userId };
  },
  {
    connection: getConnection(),
    concurrency: 20,
  }
);

// =====================================================
// SYNC WORKER
// =====================================================
export const syncWorker = new Worker(
  'sync',
  async (job: Job) => {
    const { businessId, entityType, entityId, userId, action, jobId: relatedJobId } = job.data;

    if (job.name === 'sync_quickbooks') {
      const qbSync = await import('@/lib/quickbooks/sync');
      // Sync based on entity type
      if (entityType === 'customer') {
        await qbSync.syncCustomerToQuickBooks(businessId, entityId);
      } else if (entityType === 'invoice') {
        await qbSync.syncInvoiceToQuickBooks(businessId, entityId);
      } else if (entityType === 'payment') {
        await qbSync.syncPaymentToQuickBooks(businessId, entityId);
      } else if (entityType === 'expense') {
        await qbSync.syncReceiptToQuickBooks(businessId, entityId);
      }
      return { synced: true, type: 'quickbooks', entityType, entityId };
    }

    if (job.name === 'full_quickbooks_sync') {
      const qbSync = await import('@/lib/quickbooks/sync');
      const result = await qbSync.syncAllToQuickBooks(businessId);
      return { synced: true, type: 'full_quickbooks', ...result };
    }

    if (job.name === 'sync_calendar') {
      // Calendar sync logic would go here
      return { synced: true, type: 'calendar', action };
    }

    return { synced: false, error: 'Unknown sync type' };
  },
  {
    connection: getConnection(),
    concurrency: 2, // Slower, resource-intensive
  }
);

// =====================================================
// REMINDER WORKER
// =====================================================
export const reminderWorker = new Worker(
  'reminder',
  async (job: Job) => {
    if (job.name === 'appointment_reminder') {
      const { to, message, businessId, customerId, jobId } = job.data;

      const { sendSMS } = await import('@/lib/twilio');
      const result = await sendSMS({ to, body: message, businessId });

      return { sent: true, type: 'appointment', twilioSid: result.twilioSid };
    }

    if (job.name === 'lead_follow_up') {
      const { leadId, userId, businessId } = job.data;

      // Create a notification for the user
      const { sendPushNotification } = await import('@/lib/notifications/push');
      await sendPushNotification({
        userId,
        businessId,
        title: 'Lead Follow-up Reminder',
        body: 'You have a lead that needs follow-up',
        url: `/leads/${leadId}`,
      });

      return { sent: true, type: 'lead_follow_up' };
    }

    return { sent: false };
  },
  {
    connection: getConnection(),
    concurrency: 10,
  }
);

// =====================================================
// REPORT WORKER
// =====================================================
export const reportWorker = new Worker(
  'report',
  async (job: Job) => {
    const { businessId, reportType, params, userId, schedule } = job.data;

    // Example: Generate and store report
    // const report = await generateReport(businessId, reportType, params);
    // await storeReport(businessId, reportType, report);

    if (userId) {
      // Notify user that report is ready
      const { sendPushNotification } = await import('@/lib/notifications/push');
      await sendPushNotification({
        userId,
        businessId,
        title: 'Report Ready',
        body: `Your ${reportType} report is ready to view`,
        url: `/reports/${reportType}`,
      });
    }

    return { generated: true, reportType };
  },
  {
    connection: getConnection(),
    concurrency: 2, // Reports can be heavy
  }
);

// =====================================================
// WEBHOOK WORKER
// =====================================================
export const webhookWorker = new Worker(
  'webhook',
  async (job: Job) => {
    const { url, event, payload, businessId } = job.data;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Business-ID': businessId,
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return { sent: true, status: response.status };
  },
  {
    connection: getConnection(),
    concurrency: 10,
  }
);

// =====================================================
// WORKER EVENT HANDLERS
// =====================================================
const workers = [
  emailWorker,
  smsWorker,
  notificationWorker,
  syncWorker,
  reminderWorker,
  reportWorker,
  webhookWorker,
];

workers.forEach(worker => {
  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('Worker error:', err);
  });
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
export async function closeWorkers(): Promise<void> {
  await Promise.all(workers.map(w => w.close()));
}

// Export workers for direct access if needed
export { workers };
