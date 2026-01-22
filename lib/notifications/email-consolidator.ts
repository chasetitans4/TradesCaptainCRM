// =====================================================
// EMAIL CONSOLIDATOR
// Consolidates related email notifications to reduce
// email volume and improve customer experience
// =====================================================

import { Cache } from '@/lib/cache';
import { queueEmail, EmailJobData } from '@/lib/queue';
import { cacheLogger } from '@/lib/logger';

const emailBatchCache = new Cache('email_batch');
const CONSOLIDATION_WINDOW_SECONDS = 60; // 1 minute window for email

// Email categories that can be consolidated
type EmailCategory =
  | 'job_update'      // Job confirmed, rescheduled, tech en route
  | 'billing'         // Invoice, quote, payment
  | 'feedback'        // Review request, survey
  | 'general';        // Other notifications

interface PendingEmail {
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
  priority: number;
  timestamp: number;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
  metadata?: Record<string, any>;
}

interface ConsolidatedBatch {
  emails: PendingEmail[];
  windowStart: number;
  timerId?: NodeJS.Timeout;
}

// In-memory consolidation state
const consolidationStates = new Map<string, ConsolidatedBatch>();

/**
 * Get batch key for email consolidation
 */
function getBatchKey(email: string, businessId: string): string {
  return `pending:${businessId}:${email.toLowerCase()}`;
}

/**
 * Categorize an email based on subject/content
 */
function categorizeEmail(subject: string): EmailCategory {
  const subjectLower = subject.toLowerCase();

  if (subjectLower.includes('confirmed') ||
      subjectLower.includes('rescheduled') ||
      subjectLower.includes('on the way') ||
      subjectLower.includes('cancelled')) {
    return 'job_update';
  }

  if (subjectLower.includes('invoice') ||
      subjectLower.includes('quote') ||
      subjectLower.includes('payment') ||
      subjectLower.includes('receipt')) {
    return 'billing';
  }

  if (subjectLower.includes('review') ||
      subjectLower.includes('feedback') ||
      subjectLower.includes('how did we do')) {
    return 'feedback';
  }

  return 'general';
}

/**
 * Queue an email with consolidation support
 */
export async function queueConsolidatedEmail(data: EmailJobData & {
  priority?: number;
  consolidate?: boolean;
}): Promise<void> {
  const { to, subject, html, text, businessId, customerId, replyTo, attachments, priority = 2, consolidate = true } = data;

  // Skip consolidation if disabled or has attachments
  if (!consolidate || attachments?.length || process.env.EMAIL_CONSOLIDATION_DISABLED === 'true') {
    await queueEmail({ to, subject, html, text, businessId, customerId, replyTo, attachments });
    return;
  }

  const batchKey = getBatchKey(to, businessId);
  const category = categorizeEmail(subject);

  const pendingEmail: PendingEmail = {
    subject,
    html,
    text,
    category,
    priority,
    timestamp: Date.now(),
    replyTo,
    metadata: { customerId },
  };

  let state = consolidationStates.get(batchKey);

  if (!state) {
    state = {
      emails: [pendingEmail],
      windowStart: Date.now(),
    };
    consolidationStates.set(batchKey, state);

    state.timerId = setTimeout(() => {
      flushEmailBatch(to, businessId, batchKey);
    }, CONSOLIDATION_WINDOW_SECONDS * 1000);

    cacheLogger.debug({
      msg: 'Email consolidation started',
      email: to.substring(0, 3) + '***',
      category,
    });
  } else {
    state.emails.push(pendingEmail);

    cacheLogger.debug({
      msg: 'Email added to consolidation batch',
      email: to.substring(0, 3) + '***',
      count: state.emails.length,
    });
  }

  await emailBatchCache.set(batchKey, {
    emails: state.emails,
    windowStart: state.windowStart,
  }, CONSOLIDATION_WINDOW_SECONDS + 10);
}

/**
 * Flush email batch and send consolidated email
 */
async function flushEmailBatch(to: string, businessId: string, batchKey: string): Promise<void> {
  const state = consolidationStates.get(batchKey);
  if (!state || state.emails.length === 0) {
    consolidationStates.delete(batchKey);
    await emailBatchCache.delete(batchKey);
    return;
  }

  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  const emails = [...state.emails];
  consolidationStates.delete(batchKey);
  await emailBatchCache.delete(batchKey);

  // If only one email, send as-is
  if (emails.length === 1) {
    const email = emails[0];
    await queueEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      businessId,
      customerId: email.metadata?.customerId,
      replyTo: email.replyTo,
    });
    return;
  }

  // Group by category
  const byCategory = groupByCategory(emails);

  // Decide consolidation strategy
  const categories = Object.keys(byCategory) as EmailCategory[];

  if (categories.length === 1 && emails.length <= 3) {
    // Same category, few emails - consolidate into one
    await sendConsolidatedEmail(to, businessId, emails, categories[0]);
  } else {
    // Mixed categories - send highest priority from each category
    for (const category of categories) {
      const categoryEmails = byCategory[category];
      if (categoryEmails.length === 1) {
        // Single email in category, send as-is
        const email = categoryEmails[0];
        await queueEmail({
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          businessId,
          customerId: email.metadata?.customerId,
          replyTo: email.replyTo,
        });
      } else {
        // Multiple emails in category, consolidate
        await sendConsolidatedEmail(to, businessId, categoryEmails, category);
      }
    }
  }

  cacheLogger.info({
    msg: 'Email batch flushed',
    email: to.substring(0, 3) + '***',
    originalCount: emails.length,
    categories: categories.length,
  });
}

/**
 * Group emails by category
 */
function groupByCategory(emails: PendingEmail[]): Record<EmailCategory, PendingEmail[]> {
  const result: Record<EmailCategory, PendingEmail[]> = {
    job_update: [],
    billing: [],
    feedback: [],
    general: [],
  };

  for (const email of emails) {
    result[email.category].push(email);
  }

  // Remove empty categories
  for (const key of Object.keys(result) as EmailCategory[]) {
    if (result[key].length === 0) {
      delete result[key];
    }
  }

  return result;
}

/**
 * Send a consolidated email combining multiple notifications
 */
async function sendConsolidatedEmail(
  to: string,
  businessId: string,
  emails: PendingEmail[],
  category: EmailCategory
): Promise<void> {
  // Sort by priority (ascending) then timestamp
  const sorted = emails.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.timestamp - b.timestamp;
  });

  const primary = sorted[0];
  const customerId = primary.metadata?.customerId;

  // Build consolidated HTML
  const consolidatedHtml = buildConsolidatedHtml(sorted, category);
  const consolidatedSubject = buildConsolidatedSubject(sorted, category);

  await queueEmail({
    to,
    subject: consolidatedSubject,
    html: consolidatedHtml,
    businessId,
    customerId,
    replyTo: primary.replyTo,
  });
}

/**
 * Build consolidated email subject
 */
function buildConsolidatedSubject(emails: PendingEmail[], category: EmailCategory): string {
  if (emails.length === 1) {
    return emails[0].subject;
  }

  // Use the primary (highest priority) subject with count indicator
  const primary = emails[0];

  const categoryLabels: Record<EmailCategory, string> = {
    job_update: 'Service Updates',
    billing: 'Billing Updates',
    feedback: 'Feedback Request',
    general: 'Updates',
  };

  return `${categoryLabels[category]} (${emails.length} notifications)`;
}

/**
 * Build consolidated email HTML
 */
function buildConsolidatedHtml(emails: PendingEmail[], category: EmailCategory): string {
  if (emails.length === 1) {
    return emails[0].html;
  }

  const sections = emails.map((email, index) => {
    // Extract body content from existing HTML (simplified extraction)
    const bodyContent = extractBodyContent(email.html);

    return `
      <div style="margin-bottom: 24px; padding-bottom: 24px; ${index < emails.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
        <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">${escapeHtml(email.subject)}</h3>
        ${bodyContent}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      You have ${emails.length} updates. Here's a summary:
    </p>
  </div>

  ${sections}

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
    <p>This is a consolidated notification to reduce email volume.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Extract body content from HTML email
 */
function extractBodyContent(html: string): string {
  // Try to extract content between body tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }

  // Return as-is if no body tags
  return html;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send an email immediately without consolidation
 */
export async function sendImmediateEmail(data: EmailJobData): Promise<void> {
  const batchKey = getBatchKey(data.to, data.businessId);
  const state = consolidationStates.get(batchKey);

  if (state) {
    // Flush existing batch first
    await flushEmailBatch(data.to, data.businessId, batchKey);
  }

  await queueEmail(data);
}

/**
 * Cancel pending consolidated emails for a recipient
 */
export async function cancelPendingEmails(email: string, businessId: string): Promise<number> {
  const batchKey = getBatchKey(email, businessId);
  const state = consolidationStates.get(batchKey);

  if (!state) return 0;

  const cancelledCount = state.emails.length;

  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  consolidationStates.delete(batchKey);
  await emailBatchCache.delete(batchKey);

  return cancelledCount;
}

// Priority constants
export const EMAIL_PRIORITY = {
  URGENT: 1,      // Password reset, payment confirmation
  NORMAL: 2,      // Job updates, quotes
  LOW: 3,         // Review requests, marketing
} as const;
