/**
 * Quiet Customer Evaluator
 *
 * Per CIL Spec Section 3.1:
 * - Customers inactive 12+ months
 * - NOT if active maintenance agreement
 * - NOT if do-not-contact tag
 * - "Send check-in" opens SMS with template
 * - Auto-clears on new job completion
 */

import type { NudgeEvaluator, NudgeEvaluatorResult, NudgeContext } from '../types';
import { calculateContextHash } from '../dismissal-store';

const QUIET_THRESHOLD_MONTHS = 12;

/**
 * Check if a customer is "quiet" (inactive for 12+ months)
 */
function isQuietCustomer(customer: NudgeContext['customer']): boolean {
  if (!customer) return false;

  // Must have a last job date
  if (!customer.lastJobDate) return false;

  // Calculate months since last job
  const lastJob = new Date(customer.lastJobDate);
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - lastJob.getFullYear()) * 12 +
    (now.getMonth() - lastJob.getMonth());

  // Not quiet if recent job
  if (monthsDiff < QUIET_THRESHOLD_MONTHS) return false;

  // Not quiet if has active maintenance agreement
  if (customer.hasMaintenanceAgreement) return false;

  // Not quiet if marked do-not-contact
  if (customer.tags?.includes('do_not_contact')) return false;

  return true;
}

/**
 * Format months since last service
 */
function formatTimeSinceService(lastJobDate: Date): string {
  const now = new Date();
  const lastJob = new Date(lastJobDate);
  const monthsDiff =
    (now.getFullYear() - lastJob.getFullYear()) * 12 +
    (now.getMonth() - lastJob.getMonth());

  if (monthsDiff >= 24) {
    const years = Math.floor(monthsDiff / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }

  return `${monthsDiff} months ago`;
}

/**
 * Quiet Customer Evaluator
 */
export const quietCustomerEvaluator: NudgeEvaluator = {
  id: 'quiet-customer',
  source: 'quiet_customer',
  entityTypes: ['customer', 'job'],

  async evaluate(context: NudgeContext): Promise<NudgeEvaluatorResult> {
    const { customer } = context;

    if (!customer || !isQuietCustomer(customer)) {
      return { shouldShow: false };
    }

    // Calculate context hash for material change detection
    const contextHash = calculateContextHash({
      customerId: customer.id,
      lastJobDate: customer.lastJobDate?.toString(),
      hasMaintenanceAgreement: customer.hasMaintenanceAgreement,
      tags: customer.tags,
    });

    const timeSince = formatTimeSinceService(customer.lastJobDate!);

    return {
      shouldShow: true,
      contextHash,
      nudge: {
        type: 'status',
        entityType: 'customer',
        entityId: customer.id,
        message: `Last service: ${timeSince}`,
        actionLabel: 'Send check-in →',
        actionHandler: 'send_checkin_sms',
        priority: 5,
        source: 'quiet_customer',
        metadata: {
          lastJobDate: customer.lastJobDate,
          customerName: customer.name,
        },
      },
    };
  },
};

/**
 * Generate check-in SMS template
 */
export function generateCheckinTemplate(
  customerName: string,
  businessName: string,
  equipmentType?: string
): string {
  const subject = equipmentType || 'home';
  const firstName = customerName.split(' ')[0];

  return `Hi ${firstName}, this is ${businessName}. It's been a while since we last serviced your ${subject}. Just checking in — let us know if you need anything!`;
}
