/**
 * Agreement Status Evaluator
 *
 * Per CIL Spec Section 4.1:
 * - Shows maintenance agreement status on customer detail
 * - If Active: shows next service date
 * - If Expiring (within 30 days): shows expiration warning
 * - If No Agreement (2+ jobs): suggests setup
 * - If <2 jobs: do not show section
 */

import type { NudgeEvaluator, NudgeEvaluatorResult, NudgeContext } from '../types';
import { calculateContextHash } from '../dismissal-store';

const EXPIRING_THRESHOLD_DAYS = 30;
const MIN_JOBS_FOR_SUGGESTION = 2;
const DISMISSAL_RESET_MONTHS = 6;

/**
 * Agreement data structure
 */
export interface MaintenanceAgreement {
  id: string;
  name: string;
  status: 'active' | 'expiring' | 'expired' | 'cancelled';
  expiresAt?: Date;
  nextServiceDate?: Date;
  customerId: string;
}

/**
 * Calculate days until expiration
 */
function getDaysUntilExpiration(expiresAt: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expires = new Date(expiresAt);
  expires.setHours(0, 0, 0, 0);

  return Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format next service date
 */
function formatNextService(date: Date): string {
  const now = new Date();
  const service = new Date(date);

  // Same month/year
  if (
    service.getMonth() === now.getMonth() &&
    service.getFullYear() === now.getFullYear()
  ) {
    return `This month`;
  }

  // Format as "Month Year"
  return service.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format expiration date
 */
function formatExpiration(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Agreement Status Evaluator
 */
export const agreementStatusEvaluator: NudgeEvaluator = {
  id: 'agreement-status',
  source: 'maintenance_tracker',
  entityTypes: ['customer'],

  async evaluate(context: NudgeContext): Promise<NudgeEvaluatorResult> {
    const { customer } = context;

    if (!customer) {
      return { shouldShow: false };
    }

    // Get agreement data from context
    const agreement = (context.entity?.data?.agreement as MaintenanceAgreement) || null;

    // If customer has active agreement
    if (agreement && (agreement.status === 'active' || agreement.status === 'expiring')) {
      // Check if expiring soon
      if (agreement.expiresAt) {
        const daysUntil = getDaysUntilExpiration(agreement.expiresAt);

        if (daysUntil <= EXPIRING_THRESHOLD_DAYS && daysUntil >= 0) {
          // Expiring soon - show warning
          const contextHash = calculateContextHash({
            agreementId: agreement.id,
            status: 'expiring',
            expiresAt: agreement.expiresAt.toString(),
          });

          return {
            shouldShow: true,
            contextHash,
            nudge: {
              type: 'status',
              entityType: 'customer',
              entityId: customer.id,
              message: agreement.name,
              description: `Expires: ${formatExpiration(agreement.expiresAt)}`,
              actionLabel: 'Renew agreement →',
              actionRoute: `/agreements/${agreement.id}/renew`,
              priority: 6,
              source: 'maintenance_tracker',
              metadata: {
                agreementId: agreement.id,
                daysUntilExpiration: daysUntil,
                expiresAt: agreement.expiresAt,
              },
            },
          };
        }
      }

      // Active agreement - show status (this is more of an info display than a nudge)
      // Per spec, this goes in the customer detail section, not as a nudge
      return { shouldShow: false };
    }

    // No agreement - suggest setup if customer has 2+ jobs
    const totalJobs = customer.totalJobs || 0;

    if (totalJobs < MIN_JOBS_FOR_SUGGESTION) {
      // Not enough history to suggest agreement
      return { shouldShow: false };
    }

    const contextHash = calculateContextHash({
      customerId: customer.id,
      hasAgreement: false,
      totalJobs,
    });

    return {
      shouldShow: true,
      contextHash,
      nudge: {
        type: 'suggestion',
        entityType: 'customer',
        entityId: customer.id,
        message: 'No maintenance agreement',
        actionLabel: 'Set up maintenance reminder →',
        actionRoute: `/customers/${customer.id}/agreements/new`,
        priority: 3, // Lower priority than urgent items
        source: 'maintenance_tracker',
        // Dismissal expires after 6 months OR new job
        expiresAt: new Date(Date.now() + DISMISSAL_RESET_MONTHS * 30 * 24 * 60 * 60 * 1000),
        metadata: {
          customerId: customer.id,
          totalJobs,
          suggestionType: 'new_agreement',
        },
      },
    };
  },
};

/**
 * Get agreement status display data
 * Used for the customer detail section (not a nudge)
 */
export function getAgreementStatusDisplay(
  agreement: MaintenanceAgreement | null,
  totalJobs: number
): {
  show: boolean;
  status: 'active' | 'expiring' | 'none';
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionRoute?: string;
  isWarning?: boolean;
} | null {
  // If active agreement
  if (agreement && agreement.status === 'active') {
    const subtitle = agreement.nextServiceDate
      ? `Next service: ${formatNextService(agreement.nextServiceDate)}`
      : undefined;

    return {
      show: true,
      status: 'active',
      title: agreement.name,
      subtitle,
      actionLabel: 'View details →',
      actionRoute: `/agreements/${agreement.id}`,
    };
  }

  // If expiring agreement
  if (agreement && agreement.status === 'expiring' && agreement.expiresAt) {
    const daysUntil = getDaysUntilExpiration(agreement.expiresAt);

    return {
      show: true,
      status: 'expiring',
      title: agreement.name,
      subtitle: `Expires: ${formatExpiration(agreement.expiresAt)}`,
      actionLabel: 'Renew agreement →',
      actionRoute: `/agreements/${agreement.id}/renew`,
      isWarning: daysUntil <= EXPIRING_THRESHOLD_DAYS,
    };
  }

  // No agreement - only show if 2+ jobs
  if (totalJobs >= MIN_JOBS_FOR_SUGGESTION) {
    return {
      show: true,
      status: 'none',
      title: 'No maintenance agreement',
      actionLabel: 'Set up maintenance reminder →',
      actionRoute: undefined, // Opens modal
    };
  }

  return null;
}
