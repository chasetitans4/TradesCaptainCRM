/**
 * Promise Due Evaluator
 *
 * Per CIL Spec Section 2.2:
 * - Lightweight follow-up system for verbal commitments
 * - States: Pending, Due Today, Overdue
 * - Trust system, not task management
 */

import type { NudgeEvaluator, NudgeEvaluatorResult, NudgeContext } from '../types';
import { calculateContextHash } from '../dismissal-store';

/**
 * Promise reminder data structure
 */
export interface PromiseReminder {
  id: string;
  customerId: string;
  jobId?: string;
  description: string;
  dueDate: Date;
  dueTime?: string;
  status: 'pending' | 'due' | 'overdue' | 'completed' | 'snoozed' | 'dismissed';
  customerName?: string;
}

/**
 * Check if promise is due today or overdue
 */
function getPromiseStatus(dueDate: Date): 'pending' | 'due' | 'overdue' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due';
  return 'pending';
}

/**
 * Format due date for display
 */
function formatDueDate(dueDate: Date, status: 'pending' | 'due' | 'overdue'): string {
  if (status === 'due') return 'Due today';
  if (status === 'overdue') {
    const today = new Date();
    const due = new Date(dueDate);
    const daysDiff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) return 'Due yesterday';
    return `${daysDiff} days overdue`;
  }

  // Pending - show relative date
  const today = new Date();
  const due = new Date(dueDate);
  const daysDiff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 1) return 'Due tomorrow';
  if (daysDiff <= 7) return `Due in ${daysDiff} days`;

  return `Due ${due.toLocaleDateString()}`;
}

/**
 * Promise Due Evaluator
 */
export const promiseDueEvaluator: NudgeEvaluator = {
  id: 'promise-due',
  source: 'promise_keeper',
  entityTypes: ['customer', 'job'],

  async evaluate(context: NudgeContext): Promise<NudgeEvaluatorResult> {
    // This evaluator needs promises to be loaded into context
    // The actual promise data would come from the database via API
    const promises = (context.entity?.data?.promises as PromiseReminder[]) || [];

    // Find the most urgent promise (due today or overdue first)
    const activePromises = promises
      .filter((p) => p.status !== 'completed' && p.status !== 'dismissed')
      .map((p) => ({
        ...p,
        calculatedStatus: getPromiseStatus(p.dueDate),
      }))
      .sort((a, b) => {
        // Overdue first, then due, then pending
        const statusOrder = { overdue: 0, due: 1, pending: 2 };
        const statusDiff = statusOrder[a.calculatedStatus] - statusOrder[b.calculatedStatus];
        if (statusDiff !== 0) return statusDiff;

        // Within same status, earlier dates first
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    const urgentPromise = activePromises.find(
      (p) => p.calculatedStatus === 'overdue' || p.calculatedStatus === 'due'
    );

    if (!urgentPromise) {
      return { shouldShow: false };
    }

    const contextHash = calculateContextHash({
      promiseId: urgentPromise.id,
      dueDate: urgentPromise.dueDate.toString(),
      status: urgentPromise.calculatedStatus,
    });

    const isOverdue = urgentPromise.calculatedStatus === 'overdue';
    const dueDateText = formatDueDate(urgentPromise.dueDate, urgentPromise.calculatedStatus);

    return {
      shouldShow: true,
      contextHash,
      nudge: {
        type: 'reminder',
        entityType: context.entity?.type || 'customer',
        entityId: context.entity?.id || urgentPromise.customerId,
        message: urgentPromise.description,
        description: dueDateText,
        actionLabel: 'Mark complete →',
        actionRoute: `/promises/${urgentPromise.id}`,
        actionHandler: 'complete_promise',
        priority: isOverdue ? 9 : 7, // Higher priority for overdue
        source: 'promise_keeper',
        metadata: {
          promiseId: urgentPromise.id,
          customerId: urgentPromise.customerId,
          jobId: urgentPromise.jobId,
          dueDate: urgentPromise.dueDate,
          status: urgentPromise.calculatedStatus,
        },
      },
    };
  },
};

/**
 * Keywords that suggest a follow-up promise
 * Per spec Section 2.2
 */
export const FOLLOWUP_KEYWORDS = [
  'will send quote',
  'send quote',
  'send estimate',
  'follow up',
  'call back',
  'check on',
  'get back to',
  'tomorrow',
  'next week',
  'will call',
  'will email',
  'let you know',
];

/**
 * Detect if text contains follow-up keywords
 */
export function detectFollowupKeywords(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const keyword of FOLLOWUP_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

/**
 * Suggest due date based on keywords
 */
export function suggestDueDate(text: string): Date {
  const lowerText = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lowerText.includes('today')) {
    return today;
  }

  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  if (lowerText.includes('next week')) {
    // Next Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
    return nextMonday;
  }

  if (lowerText.includes('this week')) {
    // This Friday, or Monday if it's Fri/Sat/Sun
    const dayOfWeek = today.getDay();
    if (dayOfWeek >= 5) {
      // Friday, Saturday, or Sunday - go to Monday
      const monday = new Date(today);
      monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
      return monday;
    }
    // Otherwise, Friday
    const friday = new Date(today);
    friday.setDate(friday.getDate() + (5 - dayOfWeek));
    return friday;
  }

  // Default: Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}
