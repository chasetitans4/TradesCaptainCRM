'use client';

/**
 * Maintenance Agreement Tracker
 *
 * Per CIL Spec Section 4.1:
 * Displays maintenance agreement status on customer detail page
 *
 * States:
 * - Active: Show agreement name, next service date, "View details" link
 * - Expiring (≤30 days): Show warning, "Renew agreement" link
 * - No Agreement (2+ jobs): Show "Set up maintenance reminder" nudge
 * - <2 jobs: Don't show section
 *
 * Dismissibility:
 * - Setup nudge: Yes (per-customer), resets after 6 months OR new job
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ClipboardList, AlertTriangle, ChevronRight, X, Bell } from 'lucide-react';
import { dismissNudge, isNudgeDismissed as isDismissed } from '@/lib/nudges';

interface Agreement {
  id: string;
  name: string;
  status: 'active' | 'expiring' | 'expired' | 'paused' | 'cancelled';
  nextServiceDate?: string;
  endDate?: string;
}

interface MaintenanceAgreementTrackerProps {
  /** Customer ID */
  customerId: string;
  /** Current user ID for dismissal tracking */
  userId: string;
  /** Number of completed jobs for this customer */
  completedJobsCount: number;
  /** Active/expiring agreement if exists */
  agreement?: Agreement | null;
  /** Custom class name */
  className?: string;
}

const EXPIRING_THRESHOLD_DAYS = 30;

/**
 * Check if agreement is expiring within threshold
 */
function isExpiringSoon(endDate: string | undefined): boolean {
  if (!endDate) return false;

  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= EXPIRING_THRESHOLD_DAYS;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Maintenance Agreement Tracker Component
 */
export function MaintenanceAgreementTracker({
  customerId,
  userId,
  completedJobsCount,
  agreement,
  className,
}: MaintenanceAgreementTrackerProps) {
  const [isSetupDismissed, setIsSetupDismissed] = useState(false);
  const [isCheckingDismissal, setIsCheckingDismissal] = useState(true);

  // Check if setup nudge was dismissed
  useEffect(() => {
    async function checkDismissal() {
      const dismissed = isDismissed('maintenance_tracker', 'customer', customerId);
      setIsSetupDismissed(dismissed);
      setIsCheckingDismissal(false);
    }
    checkDismissal();
  }, [userId, customerId]);

  // Handle dismissing the setup nudge
  const handleDismissSetup = useCallback(async () => {
    setIsSetupDismissed(true);
    try {
      // Dismiss for 6 months per spec
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      await dismissNudge(userId, 'maintenance_tracker', {
        entityType: 'customer',
        entityId: customerId,
        expiresAt: sixMonthsFromNow,
      });
    } catch (error) {
      console.error('Failed to dismiss agreement setup nudge:', error);
    }
  }, [userId, customerId]);

  // Determine what to show
  const isExpiring = useMemo(
    () => agreement && isExpiringSoon(agreement.endDate),
    [agreement]
  );

  // Per spec: Don't show section if <2 jobs
  if (completedJobsCount < 2) {
    return null;
  }

  // Loading state
  if (isCheckingDismissal) {
    return null;
  }

  // Has active or expiring agreement
  if (agreement && (agreement.status === 'active' || isExpiring)) {
    return (
      <div
        className={cn(
          'bg-background rounded-xl border border-border p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
              Maintenance Agreement
            </p>
            <p className="text-sm font-medium text-text">{agreement.name}</p>

            {/* Expiring warning */}
            {isExpiring && agreement.endDate && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Expires: {formatDate(agreement.endDate)}
              </p>
            )}

            {/* Next service date for active */}
            {!isExpiring && agreement.nextServiceDate && (
              <p className="text-xs text-text-muted mt-1">
                Next service: {formatDate(agreement.nextServiceDate)}
              </p>
            )}
          </div>

          {/* Action link */}
          <Link
            href={isExpiring ? `/agreements/${agreement.id}/renew` : `/agreements/${agreement.id}`}
            className={cn(
              'text-xs font-normal transition-colors',
              'flex items-center gap-1 min-h-[44px] px-2',
              isExpiring
                ? 'text-warning hover:text-warning/80'
                : 'text-text-muted hover:text-text'
            )}
          >
            {isExpiring ? 'Renew' : 'View details'}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // No agreement - show setup nudge (if not dismissed)
  if (!agreement && !isSetupDismissed) {
    return (
      <div
        className={cn(
          // Per spec: link-weight styling, subtle
          'flex items-center gap-2',
          'px-3 py-2 min-h-[44px]',
          'bg-transparent border border-border/50 rounded',
          'transition-none', // No animation per spec
          className
        )}
      >
        <ClipboardList className="h-4 w-4 text-text-muted shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-normal text-text-muted">
            No maintenance agreement
          </p>
        </div>

        {/* Setup link */}
        <Link
          href={`/agreements/new?customer=${customerId}`}
          className={cn(
            'text-sm font-normal text-text-muted hover:text-text',
            'transition-colors flex items-center gap-1',
            'min-h-[44px] px-2'
          )}
        >
          <Bell className="h-3.5 w-3.5" />
          Set up reminder
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>

        {/* Dismiss button */}
        <button
          onClick={handleDismissSetup}
          className={cn(
            'p-1.5 min-h-[44px] min-w-[44px]',
            'flex items-center justify-center',
            'text-text-muted/50 hover:text-text-muted',
            'transition-colors'
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Agreement setup was dismissed, show nothing
  return null;
}

/**
 * Hook to fetch agreement data for a customer
 */
export function useCustomerAgreement(customerId: string) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgreement() {
      try {
        const response = await fetch(
          `/api/customers/${customerId}/agreement`
        );

        if (response.ok) {
          const data = await response.json();
          setAgreement(data.agreement || null);
        }
      } catch (error) {
        console.error('Error fetching customer agreement:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgreement();
  }, [customerId]);

  return { agreement, isLoading };
}

/**
 * Compact badge version for list views
 */
export function MaintenanceAgreementBadge({
  hasAgreement,
  isExpiring,
  className,
}: {
  hasAgreement: boolean;
  isExpiring?: boolean;
  className?: string;
}) {
  if (!hasAgreement) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'text-xs font-normal px-2 py-0.5 rounded-full',
        isExpiring
          ? 'bg-warning/10 text-warning'
          : 'bg-success/10 text-success',
        className
      )}
    >
      <ClipboardList className="h-3 w-3" />
      {isExpiring ? 'Expiring' : 'Active'}
    </span>
  );
}
