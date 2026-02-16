// =====================================================
// SPOKE - CONFIRMATION TEMPLATE BUILDER
//
// Per Spoke Spec Section 8:
// Build confirmation SMS messages from parsed data.
//
// Beta Constraint:
// - Standard templates only (no adaptive personalization)
// - Must fit in 160 chars when possible (single SMS segment)
//
// Template Types:
// - Full confirmation (all fields extracted)
// - Partial confirmation (some fields missing)
// - Draft notification (needs clarification)
// =====================================================

import { smsLogger } from '@/lib/logger';
import type { SpokeParsedData } from '../types';

const templateLogger = smsLogger.child({ context: 'spoke.template-builder' });

// =====================================================
// TYPES
// =====================================================

export interface ConfirmationData {
  customerName: string;
  status?: 'complete' | 'issue' | 'delayed' | 'in_progress';
  payment?: {
    amount: number;
    method?: string;
  };
  duration?: {
    minutes: number;
  };
  notes?: string;
  serviceType?: string;
}

export interface ConfirmationTemplate {
  /** The message text */
  message: string;

  /** Whether message fits in single SMS (160 chars) */
  isSingleSegment: boolean;

  /** Number of SMS segments required */
  segmentCount: number;

  /** Template type used */
  templateType: 'full' | 'partial' | 'draft' | 'follow_up';

  /** Fields included in message */
  includedFields: string[];

  /** Fields that were omitted due to space */
  omittedFields: string[];
}

// =====================================================
// TEMPLATE BUILDERS
// =====================================================

/**
 * Build confirmation message from parsed data
 */
export function buildConfirmationMessage(
  data: ConfirmationData,
  options?: {
    includeEditPrompt?: boolean;
    maxLength?: number;
  }
): ConfirmationTemplate {
  const includeEditPrompt = options?.includeEditPrompt ?? true;
  const maxLength = options?.maxLength ?? 160;

  const includedFields: string[] = [];
  const omittedFields: string[] = [];

  // Build message parts
  const parts: string[] = [];

  // Customer name is always included
  parts.push(`✓ ${data.customerName}`);
  includedFields.push('customer');

  // Status (if not complete, mention it)
  if (data.status && data.status !== 'complete') {
    const statusText = getStatusText(data.status);
    parts.push(statusText);
    includedFields.push('status');
  } else if (data.status === 'complete') {
    includedFields.push('status');
  }

  // Payment
  if (data.payment) {
    const paymentText = formatPayment(data.payment.amount, data.payment.method);
    parts.push(paymentText);
    includedFields.push('payment');
  }

  // Duration
  if (data.duration) {
    const durationText = formatDuration(data.duration.minutes);
    parts.push(durationText);
    includedFields.push('duration');
  }

  // Notes (truncate if needed)
  if (data.notes) {
    // Notes are often too long, may need to omit
    omittedFields.push('notes'); // Track that we have notes but may not include
  }

  // Build initial message
  let message = parts.join(' | ');

  // Add edit prompt if requested
  const editPrompt = '\nReply EDIT to change.';

  // Check if we can fit edit prompt
  if (includeEditPrompt && message.length + editPrompt.length <= maxLength) {
    message += editPrompt;
  } else if (includeEditPrompt) {
    // Try shorter prompt
    const shortPrompt = '\nEDIT to fix.';
    if (message.length + shortPrompt.length <= maxLength) {
      message += shortPrompt;
    }
    // Otherwise omit edit prompt to fit content
  }

  // Calculate segments
  const segmentCount = calculateSegments(message);
  const isSingleSegment = segmentCount === 1;

  templateLogger.info({
    msg: 'Built confirmation message',
    customerName: data.customerName,
    messageLength: message.length,
    segmentCount,
    includedFields,
    omittedFields,
  });

  return {
    message,
    isSingleSegment,
    segmentCount,
    templateType: 'full',
    includedFields,
    omittedFields,
  };
}

/**
 * Build partial confirmation (missing required fields)
 */
export function buildPartialConfirmation(
  data: ConfirmationData,
  missingFields: string[]
): ConfirmationTemplate {
  const includedFields: string[] = [];
  const parts: string[] = [];

  // Start with what we have
  parts.push(`Got update for ${data.customerName}`);
  includedFields.push('customer');

  // Add available fields
  if (data.payment) {
    parts.push(`$${data.payment.amount}`);
    includedFields.push('payment');
  }

  if (data.duration) {
    parts.push(formatDuration(data.duration.minutes));
    includedFields.push('duration');
  }

  // Ask for missing fields
  const missingPrompt = formatMissingFieldsPrompt(missingFields);
  parts.push(missingPrompt);

  const message = parts.join('. ');
  const segmentCount = calculateSegments(message);

  return {
    message,
    isSingleSegment: segmentCount === 1,
    segmentCount,
    templateType: 'partial',
    includedFields,
    omittedFields: missingFields,
  };
}

/**
 * Build draft notification message
 */
export function buildDraftNotification(
  reason: 'multi_job' | 'low_confidence' | 'ambiguous',
  context?: {
    customerOptions?: string[];
    transcript?: string;
  }
): ConfirmationTemplate {
  let message: string;

  switch (reason) {
    case 'multi_job':
      message = 'Multiple jobs mentioned. Please call back with one update at a time.';
      break;

    case 'ambiguous':
      if (context?.customerOptions && context.customerOptions.length > 0) {
        const options = context.customerOptions
          .slice(0, 3)
          .map((c, i) => `${i + 1}. ${c}`)
          .join('\n');
        message = `Which job?\n${options}\nReply with number.`;
      } else {
        message = 'Update saved as draft. Reply with customer name to complete.';
      }
      break;

    case 'low_confidence':
    default:
      message = 'Update received but needs review. Check app to confirm details.';
      break;
  }

  const segmentCount = calculateSegments(message);

  return {
    message,
    isSingleSegment: segmentCount === 1,
    segmentCount,
    templateType: 'draft',
    includedFields: [],
    omittedFields: [],
  };
}

/**
 * Build follow-up message for missing payment
 */
export function buildPaymentFollowUp(
  customerName: string
): ConfirmationTemplate {
  const message = `${customerName} job logged. Did they pay? Reply with amount or SKIP.`;
  const segmentCount = calculateSegments(message);

  return {
    message,
    isSingleSegment: segmentCount === 1,
    segmentCount,
    templateType: 'follow_up',
    includedFields: ['customer'],
    omittedFields: ['payment'],
  };
}

// =====================================================
// FORMAT HELPERS
// =====================================================

/**
 * Format payment amount and method
 */
function formatPayment(amount: number, method?: string): string {
  const amountStr = `$${amount.toLocaleString()}`;

  if (method) {
    const methodShort = getMethodShort(method);
    return `${amountStr} ${methodShort}`;
  }

  return amountStr;
}

/**
 * Get short method name
 */
function getMethodShort(method: string): string {
  const shorts: Record<string, string> = {
    cash: 'cash',
    check: 'check',
    card: 'card',
    credit: 'card',
    debit: 'card',
    zelle: 'Zelle',
    venmo: 'Venmo',
    invoice: 'invoice',
  };

  return shorts[method.toLowerCase()] || method;
}

/**
 * Format duration in human-readable form
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return hours === 1 ? '1hr' : `${hours}hrs`;
  }

  return `${hours}h${mins}m`;
}

/**
 * Get status text for non-complete statuses
 */
function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    issue: '⚠️ Issue noted',
    delayed: '⏳ Delayed',
    in_progress: '🔄 In progress',
  };

  return texts[status] || status;
}

/**
 * Format prompt for missing fields
 */
function formatMissingFieldsPrompt(fields: string[]): string {
  if (fields.length === 0) return '';

  if (fields.length === 1) {
    const field = fields[0];
    switch (field) {
      case 'payment':
        return 'Did they pay? Reply with amount.';
      case 'duration':
        return 'How long did it take?';
      case 'status':
        return 'Is it complete?';
      default:
        return `Missing ${field}. Reply to add.`;
    }
  }

  // Multiple fields
  if (fields.includes('payment') && fields.includes('duration')) {
    return 'Reply with payment & time.';
  }

  return 'Reply to add missing info.';
}

/**
 * Calculate number of SMS segments needed
 * Standard SMS = 160 chars (GSM-7)
 * Unicode SMS = 70 chars per segment
 */
function calculateSegments(message: string): number {
  // Check for unicode characters
  const hasUnicode = /[^\x00-\x7F]/.test(message);

  if (hasUnicode) {
    // Unicode: 70 chars first segment, 67 subsequent
    if (message.length <= 70) return 1;
    return Math.ceil(message.length / 67);
  }

  // GSM-7: 160 chars first segment, 153 subsequent
  if (message.length <= 160) return 1;
  return Math.ceil(message.length / 153);
}

// =====================================================
// CONVERSION FROM PARSED DATA
// =====================================================

/**
 * Convert SpokeParsedData to ConfirmationData
 */
export function parsedToConfirmation(
  parsed: SpokeParsedData,
  customerName: string,
  serviceType?: string
): ConfirmationData {
  return {
    customerName,
    status: parsed.status?.value,
    payment: parsed.payment ? {
      amount: parsed.payment.amount,
      method: parsed.payment.method || undefined,
    } : undefined,
    duration: parsed.duration ? {
      minutes: parsed.duration.minutes,
    } : undefined,
    notes: parsed.notes?.value,
    serviceType,
  };
}
