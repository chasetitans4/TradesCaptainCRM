// =====================================================
// SMS NOTIFICATION SERVICE
// Direct SMS sending using Twilio
// Use sendUrgentSMS from sms-batcher.ts for batched/queued SMS
// =====================================================

import { logger } from '@/lib/logger';
import { queueSMS, type SMSJobData } from '@/lib/queue';

const smsLogger = logger.child({ context: 'sms' });

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via the queue system
 * For direct Twilio integration, use the queue worker
 */
export async function sendSMS(
  to: string,
  message: string,
  businessId: string,
  customerId?: string
): Promise<SendSMSResult> {
  try {
    // Validate phone number format
    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format',
      };
    }

    // Queue the SMS for sending
    const job = await queueSMS({
      to: normalizedPhone,
      message,
      businessId,
      customerId,
    });

    smsLogger.info({
      msg: 'SMS queued',
      to: normalizedPhone.slice(-4),
      businessId,
      jobId: job?.id,
    });

    return {
      success: true,
      messageId: job?.id?.toString(),
    };
  } catch (error) {
    smsLogger.error({
      msg: 'Failed to queue SMS',
      error: error instanceof Error ? error.message : String(error),
      to: to.slice(-4),
      businessId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // US number handling
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already has country code
  if (digits.length > 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Check if SMS is configured
 */
export function isSMSConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

// Re-export types
export type { SMSJobData };
