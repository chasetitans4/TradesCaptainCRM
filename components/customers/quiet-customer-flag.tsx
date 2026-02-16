'use client';

/**
 * Quiet Customer Flag
 *
 * Per CIL Spec Section 3.1:
 * - Subtle indicator for customers inactive 12+ months
 * - NOT if active maintenance agreement
 * - NOT if do-not-contact tag
 * - "Send check-in" opens SMS with template
 * - Auto-clears on new job completion
 *
 * Display:
 * 🕐 Last service: 14 months ago
 *    Send check-in →
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Clock, MessageSquare, X } from 'lucide-react';
import { generateCheckinTemplate } from '@/lib/nudges/evaluators/quiet-customer';
import { dismissNudge } from '@/lib/nudges';

interface QuietCustomerFlagProps {
  /** Customer ID */
  customerId: string;
  /** Customer's first name */
  customerFirstName: string;
  /** Business name for template */
  businessName: string;
  /** Date of last completed job */
  lastJobDate?: Date | string | null;
  /** Whether customer has active maintenance agreement */
  hasMaintenanceAgreement?: boolean;
  /** Customer tags */
  tags?: string[];
  /** Equipment type for template (optional) */
  equipmentType?: string;
  /** Customer's phone number */
  phone?: string;
  /** Current user ID for dismissal */
  userId: string;
  /** Called when check-in is sent */
  onSendCheckin?: () => void;
  /** Custom class name */
  className?: string;
}

const QUIET_THRESHOLD_MONTHS = 12;

/**
 * Calculate months since a date
 */
function monthsSince(date: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

/**
 * Format time since last service
 */
function formatTimeSince(months: number): string {
  if (months >= 24) {
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
  return `${months} months ago`;
}

/**
 * Check if customer qualifies as "quiet"
 */
function isQuietCustomer(
  lastJobDate: Date | string | null | undefined,
  hasMaintenanceAgreement: boolean | undefined,
  tags: string[] | undefined
): boolean {
  // Must have a last job date
  if (!lastJobDate) return false;

  const lastJob = new Date(lastJobDate);
  const months = monthsSince(lastJob);

  // Not quiet if recent job
  if (months < QUIET_THRESHOLD_MONTHS) return false;

  // Not quiet if has active maintenance agreement
  if (hasMaintenanceAgreement) return false;

  // Not quiet if marked do-not-contact
  if (tags?.includes('do_not_contact')) return false;

  return true;
}

/**
 * Quiet Customer Flag Component
 */
export function QuietCustomerFlag({
  customerId,
  customerFirstName,
  businessName,
  lastJobDate,
  hasMaintenanceAgreement,
  tags,
  equipmentType,
  phone,
  userId,
  onSendCheckin,
  className,
}: QuietCustomerFlagProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if this customer is quiet
  const isQuiet = useMemo(
    () => isQuietCustomer(lastJobDate, hasMaintenanceAgreement, tags),
    [lastJobDate, hasMaintenanceAgreement, tags]
  );

  // Calculate months since last service
  const months = useMemo(() => {
    if (!lastJobDate) return 0;
    return monthsSince(new Date(lastJobDate));
  }, [lastJobDate]);

  // Generate SMS template
  const smsTemplate = useMemo(
    () => generateCheckinTemplate(customerFirstName, businessName, equipmentType),
    [customerFirstName, businessName, equipmentType]
  );

  // Handle send check-in
  const handleSendCheckin = useCallback(() => {
    if (phone) {
      // Open SMS with pre-filled template
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(smsTemplate)}`;
      window.location.href = smsUrl;
    }
    onSendCheckin?.();
  }, [phone, smsTemplate, onSendCheckin]);

  // Handle dismiss
  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    try {
      await dismissNudge(userId, 'quiet_customer', {
        entityType: 'customer',
        entityId: customerId,
      });
    } catch (error) {
      console.error('Failed to dismiss quiet customer flag:', error);
    }
  }, [userId, customerId]);

  // Don't render if not quiet or dismissed
  if (!isQuiet || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        // Per spec: link-weight styling, subtle
        'flex items-start gap-2',
        'px-3 py-2 min-h-[44px]',
        'bg-transparent border border-border/50 rounded',
        'transition-none', // No animation per spec
        className
      )}
    >
      {/* Icon */}
      <Clock className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Message - font-weight 400 per spec */}
        <p className="text-sm font-normal text-text-muted">
          Last service: {formatTimeSince(months)}
        </p>

        {/* Action link */}
        {phone && (
          <button
            onClick={handleSendCheckin}
            className={cn(
              'text-sm font-normal text-text-muted hover:text-text',
              'transition-colors mt-0.5',
              'inline-flex items-center gap-1'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Send check-in →
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={cn(
          'p-1.5 -mr-1.5 min-h-[44px] min-w-[44px]',
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

/**
 * Compact inline version for tight spaces
 */
export function QuietCustomerBadge({
  lastJobDate,
  hasMaintenanceAgreement,
  tags,
  className,
}: {
  lastJobDate?: Date | string | null;
  hasMaintenanceAgreement?: boolean;
  tags?: string[];
  className?: string;
}) {
  const isQuiet = useMemo(
    () => isQuietCustomer(lastJobDate, hasMaintenanceAgreement, tags),
    [lastJobDate, hasMaintenanceAgreement, tags]
  );

  const months = useMemo(() => {
    if (!lastJobDate) return 0;
    return monthsSince(new Date(lastJobDate));
  }, [lastJobDate]);

  if (!isQuiet) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'text-xs font-normal text-text-muted',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {formatTimeSince(months)}
    </span>
  );
}

/**
 * Hook to check quiet customer status
 */
export function useQuietCustomerStatus(
  lastJobDate?: Date | string | null,
  hasMaintenanceAgreement?: boolean,
  tags?: string[]
): {
  isQuiet: boolean;
  monthsSinceLastJob: number;
} {
  const isQuiet = useMemo(
    () => isQuietCustomer(lastJobDate, hasMaintenanceAgreement, tags),
    [lastJobDate, hasMaintenanceAgreement, tags]
  );

  const monthsSinceLastJob = useMemo(() => {
    if (!lastJobDate) return 0;
    return monthsSince(new Date(lastJobDate));
  }, [lastJobDate]);

  return { isQuiet, monthsSinceLastJob };
}
