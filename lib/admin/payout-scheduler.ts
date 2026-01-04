// =====================================================
// COMMISSION PAYOUT SCHEDULER - v5.9
// Implements 1st/15th payout schedule with same-day rule
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Commission } from './types';

const adminLogger = logger.child({ context: 'admin.payouts' });

/**
 * Payout dates are fixed to 1st and 15th of every month.
 * Same-day rule: Commission cannot be paid on the same day as the triggering payment.
 */

// =====================================================
// DATE CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate the next payout date based on when a payment was made.
 * Applies the same-day rule automatically.
 *
 * Rules:
 * - Payment on 1st → Payout on 15th (same-day rule)
 * - Payment between 2nd-14th → Payout on 15th
 * - Payment on 15th → Payout on 1st of next month (same-day rule)
 * - Payment between 16th-31st → Payout on 1st of next month
 */
export function getNextPayoutDate(paymentDate: Date): Date {
  const day = paymentDate.getDate();
  const month = paymentDate.getMonth();
  const year = paymentDate.getFullYear();

  let payoutDate: Date;

  if (day <= 1) {
    // Payment on 1st → payout on 15th (same-day rule applies)
    payoutDate = new Date(year, month, 15);
  } else if (day < 15) {
    // Payment between 2nd-14th → payout on 15th
    payoutDate = new Date(year, month, 15);
  } else if (day === 15) {
    // Payment on 15th → payout on 1st of next month (same-day rule applies)
    payoutDate = new Date(year, month + 1, 1);
  } else {
    // Payment between 16th-31st → payout on 1st of next month
    payoutDate = new Date(year, month + 1, 1);
  }

  return payoutDate;
}

/**
 * Get the next available payout date from a given date.
 * Used when needing to find the following payout date.
 */
export function getFollowingPayoutDate(fromDate: Date): Date {
  const day = fromDate.getDate();
  const month = fromDate.getMonth();
  const year = fromDate.getFullYear();

  if (day < 15) {
    return new Date(year, month, 15);
  } else {
    return new Date(year, month + 1, 1);
  }
}

/**
 * Check if a given date is a valid payout date (1st or 15th)
 */
export function isPayoutDate(date: Date): boolean {
  const day = date.getDate();
  return day === 1 || day === 15;
}

/**
 * Apply the same-day rule: if the calculated payout date
 * is the same as the payment date, push to next payout date.
 */
export function applyPayoutDateRule(
  paymentDate: Date,
  calculatedPayoutDate: Date
): Date {
  // Compare dates ignoring time
  const paymentDay = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
  const payoutDay = new Date(calculatedPayoutDate.getFullYear(), calculatedPayoutDate.getMonth(), calculatedPayoutDate.getDate());

  if (paymentDay.getTime() === payoutDay.getTime()) {
    // Same day - push to next payout date
    return getFollowingPayoutDate(calculatedPayoutDate);
  }

  return calculatedPayoutDate;
}

/**
 * Format a payout date for display (e.g., "January 15, 2025")
 */
export function formatPayoutDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get the payout date as ISO string for database storage
 */
export function getPayoutDateISO(date: Date): string {
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================

export interface PayoutResult {
  processed: number;
  failed: number;
  totalAmountCents: number;
  commissionIds: string[];
  errors: Array<{ commissionId: string; error: string }>;
}

/**
 * Get all commissions scheduled for a specific payout date
 * that are eligible to be processed.
 */
export async function getScheduledCommissions(
  payoutDate: Date,
  status: 'eligible' | 'approved' = 'eligible'
): Promise<Commission[]> {
  const supabase = createAdminClient();
  const dateStr = getPayoutDateISO(payoutDate);

  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .eq('scheduled_payout_date', dateStr)
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) {
    adminLogger.error({
      msg: 'Error fetching scheduled commissions',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    throw error;
  }

  return data || [];
}

/**
 * Get commission summary for a payout date (for admin dashboard)
 */
export async function getPayoutSummary(payoutDate: Date): Promise<{
  totalCommissions: number;
  totalAmountCents: number;
  byAgent: Array<{ agentId: string; count: number; amountCents: number }>;
  byType: Array<{ type: string; count: number; amountCents: number }>;
}> {
  const supabase = createAdminClient();
  const dateStr = getPayoutDateISO(payoutDate);

  const { data, error } = await supabase
    .from('commissions')
    .select('id, agent_id, commission_type, commission_amount')
    .eq('scheduled_payout_date', dateStr)
    .in('status', ['eligible', 'approved']);

  if (error) {
    adminLogger.error({
      msg: 'Error fetching payout summary',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    throw error;
  }

  const commissions = data || [];

  // Aggregate by agent
  const agentMap = new Map<string, { count: number; amountCents: number }>();
  const typeMap = new Map<string, { count: number; amountCents: number }>();

  let totalAmountCents = 0;

  for (const c of commissions) {
    const amountCents = Math.round((c.commission_amount || 0) * 100);
    totalAmountCents += amountCents;

    // By agent
    const agentKey = c.agent_id || 'unknown';
    const agentData = agentMap.get(agentKey) || { count: 0, amountCents: 0 };
    agentData.count += 1;
    agentData.amountCents += amountCents;
    agentMap.set(agentKey, agentData);

    // By type
    const typeKey = c.commission_type || 'unknown';
    const typeData = typeMap.get(typeKey) || { count: 0, amountCents: 0 };
    typeData.count += 1;
    typeData.amountCents += amountCents;
    typeMap.set(typeKey, typeData);
  }

  return {
    totalCommissions: commissions.length,
    totalAmountCents,
    byAgent: Array.from(agentMap.entries()).map(([agentId, data]) => ({
      agentId,
      ...data,
    })),
    byType: Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      ...data,
    })),
  };
}

/**
 * Process all eligible commissions for a payout date.
 * Marks them as approved and ready for payment.
 *
 * This is called by the admin UI or cron job on 1st/15th.
 */
export async function processScheduledPayouts(
  payoutDate: Date,
  processedBy?: string
): Promise<PayoutResult> {
  const supabase = createAdminClient();

  const result: PayoutResult = {
    processed: 0,
    failed: 0,
    totalAmountCents: 0,
    commissionIds: [],
    errors: [],
  };

  // Get all eligible commissions for this date
  const commissions = await getScheduledCommissions(payoutDate, 'eligible');

  if (commissions.length === 0) {
    return result;
  }

  // Process each commission
  for (const commission of commissions) {
    try {
      const amountCents = Math.round((commission.commission_amount || 0) * 100);

      // Update to approved status
      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: processedBy || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commission.id);

      if (error) {
        result.failed += 1;
        result.errors.push({
          commissionId: commission.id,
          error: error.message,
        });
      } else {
        result.processed += 1;
        result.totalAmountCents += amountCents;
        result.commissionIds.push(commission.id);
      }
    } catch (err) {
      result.failed += 1;
      result.errors.push({
        commissionId: commission.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Get upcoming payout dates (next 3 payout dates from today)
 */
export function getUpcomingPayoutDates(fromDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(fromDate);

  // Find first upcoming payout date
  let nextPayout = getFollowingPayoutDate(currentDate);

  // If today is a payout date and it's after cutoff, include it
  if (isPayoutDate(currentDate)) {
    dates.push(new Date(currentDate));
    nextPayout = getFollowingPayoutDate(currentDate);
  }

  // Add next 3 payout dates
  while (dates.length < 3) {
    dates.push(new Date(nextPayout));
    nextPayout = getFollowingPayoutDate(nextPayout);
  }

  return dates;
}

/**
 * Schedule a commission for payout.
 * Used when creating a new commission to set its payout date.
 */
export function scheduleCommissionPayout(
  triggerPaymentDate: Date
): { scheduledPayoutDate: Date; triggerPaymentDate: Date } {
  const payoutDate = getNextPayoutDate(triggerPaymentDate);

  return {
    scheduledPayoutDate: payoutDate,
    triggerPaymentDate,
  };
}
