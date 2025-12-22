// =====================================================
// BULLMQ QUEUE CLIENT
// Background job processing with Redis
// =====================================================

import { Queue, QueueEvents } from 'bullmq';

// Connection config (reuse Redis connection settings)
const getConnection = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

// Create queues for different job types
export const emailQueue = new Queue('email', { connection: getConnection() });
export const smsQueue = new Queue('sms', { connection: getConnection() });
export const notificationQueue = new Queue('notification', { connection: getConnection() });
export const syncQueue = new Queue('sync', { connection: getConnection() }); // QuickBooks, calendar
export const reportQueue = new Queue('report', { connection: getConnection() }); // Report generation
export const reminderQueue = new Queue('reminder', { connection: getConnection() }); // Scheduled reminders
export const webhookQueue = new Queue('webhook', { connection: getConnection() }); // Outbound webhooks

// Default job options with retry logic
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
    age: 24 * 60 * 60, // Keep for 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs
    age: 7 * 24 * 60 * 60, // Keep for 7 days
  },
};

// Priority job options (process faster)
export const priorityJobOptions = {
  ...defaultJobOptions,
  priority: 1, // Lower = higher priority
};

// Low priority job options (can wait)
export const lowPriorityJobOptions = {
  ...defaultJobOptions,
  priority: 10,
};

// Queue events for monitoring
export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, { connection: getConnection() });
}

// Get all queues for health checks
export const allQueues = [
  emailQueue,
  smsQueue,
  notificationQueue,
  syncQueue,
  reportQueue,
  reminderQueue,
  webhookQueue,
];

/**
 * Get queue health status
 */
export async function getQueueHealth(): Promise<Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}>> {
  const health: Record<string, any> = {};

  for (const queue of allQueues) {
    const counts = await queue.getJobCounts();
    health[queue.name] = counts;
  }

  return health;
}

/**
 * Pause all queues (for maintenance)
 */
export async function pauseAllQueues(): Promise<void> {
  await Promise.all(allQueues.map(q => q.pause()));
  console.log('All queues paused');
}

/**
 * Resume all queues
 */
export async function resumeAllQueues(): Promise<void> {
  await Promise.all(allQueues.map(q => q.resume()));
  console.log('All queues resumed');
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all(allQueues.map(q => q.close()));
  console.log('All queues closed');
}
