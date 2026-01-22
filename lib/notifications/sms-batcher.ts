// =====================================================
// SMS BATCHER
// Batches SMS notifications within 30-second windows
// to reduce Twilio API calls and costs
// =====================================================

import { Cache } from '@/lib/cache';
import { queueSMS, SMSJobData } from '@/lib/queue';
import { cacheLogger } from '@/lib/logger';

const smsBatchCache = new Cache('sms_batch');
const BATCH_WINDOW_SECONDS = 30;
const MAX_MESSAGE_LENGTH = 1600; // Twilio max for concatenated SMS

interface PendingMessage {
  message: string;
  priority: number; // Lower = higher priority
  timestamp: number;
  businessId: string;
  customerId?: string;
  mediaUrl?: string;
}

interface BatchState {
  messages: PendingMessage[];
  windowStart: number;
  timerId?: NodeJS.Timeout;
}

// In-memory batch state (per-instance, coordinated via cache)
const batchStates = new Map<string, BatchState>();

/**
 * Get batch key for a phone number
 */
function getBatchKey(phoneNumber: string): string {
  return `pending:${phoneNumber.replace(/\D/g, '')}`;
}

/**
 * Queue an SMS with batching support
 * Messages to the same phone number within 30 seconds are combined
 */
export async function queueBatchedSMS(data: {
  to: string;
  message: string;
  businessId: string;
  customerId?: string;
  mediaUrl?: string;
  priority?: number; // 1 = urgent (confirmation), 2 = normal, 3 = low (review request)
}): Promise<void> {
  const { to, message, businessId, customerId, mediaUrl, priority = 2 } = data;
  const batchKey = getBatchKey(to);

  // If there's media, send immediately (can't batch MMS)
  if (mediaUrl) {
    await queueSMS({ to, message, businessId, customerId, mediaUrl });
    return;
  }

  // Check if batching is disabled via env
  if (process.env.SMS_BATCHING_DISABLED === 'true') {
    await queueSMS({ to, message, businessId, customerId });
    return;
  }

  const newMessage: PendingMessage = {
    message,
    priority,
    timestamp: Date.now(),
    businessId,
    customerId,
  };

  // Get or create batch state
  let state = batchStates.get(batchKey);

  if (!state) {
    // Start new batch window
    state = {
      messages: [newMessage],
      windowStart: Date.now(),
    };
    batchStates.set(batchKey, state);

    // Schedule flush after batch window
    state.timerId = setTimeout(() => {
      flushBatch(to, batchKey);
    }, BATCH_WINDOW_SECONDS * 1000);

    cacheLogger.debug({
      msg: 'SMS batch started',
      phone: to.slice(-4),
      windowSeconds: BATCH_WINDOW_SECONDS,
    });
  } else {
    // Add to existing batch
    state.messages.push(newMessage);

    cacheLogger.debug({
      msg: 'SMS added to batch',
      phone: to.slice(-4),
      messageCount: state.messages.length,
    });
  }

  // Also store in cache for coordination between instances
  await smsBatchCache.set(batchKey, {
    messages: state.messages,
    windowStart: state.windowStart,
  }, BATCH_WINDOW_SECONDS + 5);
}

/**
 * Flush a batch and send consolidated SMS
 */
async function flushBatch(phoneNumber: string, batchKey: string): Promise<void> {
  const state = batchStates.get(batchKey);
  if (!state || state.messages.length === 0) {
    batchStates.delete(batchKey);
    await smsBatchCache.delete(batchKey);
    return;
  }

  // Clear the timer
  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  // Sort by priority (lower = higher priority), then by timestamp
  const sortedMessages = [...state.messages].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.timestamp - b.timestamp;
  });

  // Get the primary business and customer IDs from highest priority message
  const primaryMessage = sortedMessages[0];
  const businessId = primaryMessage.businessId;
  const customerId = primaryMessage.customerId;

  // Combine messages intelligently
  const combinedMessage = combineMessages(sortedMessages);

  // Clean up state
  batchStates.delete(batchKey);
  await smsBatchCache.delete(batchKey);

  // Queue the combined SMS
  await queueSMS({
    to: phoneNumber,
    message: combinedMessage,
    businessId,
    customerId,
  });

  cacheLogger.info({
    msg: 'SMS batch flushed',
    phone: phoneNumber.slice(-4),
    originalCount: sortedMessages.length,
    combinedLength: combinedMessage.length,
    saved: sortedMessages.length - 1,
  });
}

/**
 * Combine multiple messages into a single SMS
 */
function combineMessages(messages: PendingMessage[]): string {
  if (messages.length === 1) {
    return messages[0].message;
  }

  // Deduplicate similar messages
  const uniqueMessages = deduplicateMessages(messages);

  if (uniqueMessages.length === 1) {
    return uniqueMessages[0].message;
  }

  // Combine messages with separator
  let combined = '';
  const separator = '\n---\n';

  for (const msg of uniqueMessages) {
    const toAdd = combined ? separator + msg.message : msg.message;

    // Check if adding would exceed max length
    if (combined.length + toAdd.length > MAX_MESSAGE_LENGTH) {
      // Truncate and add indicator
      const remaining = MAX_MESSAGE_LENGTH - combined.length - 30;
      if (remaining > 50) {
        combined += separator + msg.message.substring(0, remaining) + '... (more updates sent)';
      }
      break;
    }

    combined += toAdd;
  }

  return combined;
}

/**
 * Deduplicate similar messages
 */
function deduplicateMessages(messages: PendingMessage[]): PendingMessage[] {
  const seen = new Map<string, PendingMessage>();

  for (const msg of messages) {
    // Create a normalized key for deduplication
    const key = normalizeForDedup(msg.message);

    // Keep highest priority (lowest number) version
    const existing = seen.get(key);
    if (!existing || msg.priority < existing.priority) {
      seen.set(key, msg);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize a message for deduplication
 */
function normalizeForDedup(message: string): string {
  // Remove timestamps, dates, and common variable parts
  return message
    .toLowerCase()
    .replace(/\d{1,2}:\d{2}\s*(am|pm)?/gi, 'TIME') // Times
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, 'DATE') // Dates
    .replace(/\$[\d,]+\.?\d*/g, 'AMOUNT') // Dollar amounts
    .replace(/https?:\/\/\S+/gi, 'URL') // URLs
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Immediately send urgent SMS without batching
 */
export async function sendUrgentSMS(data: SMSJobData): Promise<void> {
  // Check if there's a pending batch for this number
  const batchKey = getBatchKey(data.to);
  const state = batchStates.get(batchKey);

  if (state) {
    // Flush existing batch first, then send urgent
    await flushBatch(data.to, batchKey);
  }

  // Send immediately
  await queueSMS(data);
}

/**
 * Cancel pending batched messages for a phone number
 */
export async function cancelPendingBatch(phoneNumber: string): Promise<number> {
  const batchKey = getBatchKey(phoneNumber);
  const state = batchStates.get(batchKey);

  if (!state) return 0;

  const cancelledCount = state.messages.length;

  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  batchStates.delete(batchKey);
  await smsBatchCache.delete(batchKey);

  cacheLogger.info({
    msg: 'SMS batch cancelled',
    phone: phoneNumber.slice(-4),
    cancelled: cancelledCount,
  });

  return cancelledCount;
}

// Message priority constants for consistent usage
export const SMS_PRIORITY = {
  URGENT: 1,      // Confirmations, en-route, time-sensitive
  NORMAL: 2,      // Standard notifications
  LOW: 3,         // Review requests, marketing
} as const;
