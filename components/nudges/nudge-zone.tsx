'use client';

/**
 * Nudge Zone Component
 *
 * Per CIL Spec Section 1.2:
 * - Max 2 nudges per screen
 * - Never block primary action
 * - Empty state = show nothing (no placeholder)
 */

import { cn } from '@/lib/utils';
import type { Nudge, NudgeContext } from '@/lib/nudges/types';
import { NudgeCard, CompactNudgeCard } from './nudge-card';
import {
  useNudges,
  useCustomerNudges,
  useJobBriefingNudges,
  useInvoiceNudges,
} from '@/hooks/useNudges';

interface NudgeZoneProps {
  /** Nudges to display (if managing externally) */
  nudges?: Nudge[];
  /** Callback when nudge is dismissed (if managing externally) */
  onDismiss?: (nudge: Nudge) => void;
  /** Callback when nudge action is clicked (if managing externally) */
  onAction?: (nudge: Nudge) => void;
  /** Whether nudges are loading */
  isLoading?: boolean;
  /** Maximum nudges to show (default: 2 per spec) */
  maxNudges?: number;
  /** Display variant */
  variant?: 'default' | 'compact' | 'stacked';
  /** Custom class name */
  className?: string;
}

/**
 * Nudge Zone - Container for displaying nudges
 *
 * Per spec: Empty state = show nothing (no placeholder)
 */
export function NudgeZone({
  nudges = [],
  onDismiss,
  onAction,
  isLoading,
  maxNudges = 2,
  variant = 'default',
  className,
}: NudgeZoneProps) {
  // Per spec: Empty state = show nothing
  if (!nudges || nudges.length === 0) {
    return null;
  }

  // Limit to max nudges per spec
  const displayNudges = nudges.slice(0, maxNudges);

  const NudgeComponent = variant === 'compact' ? CompactNudgeCard : NudgeCard;

  return (
    <div
      className={cn(
        'space-y-2',
        variant === 'stacked' && 'space-y-1',
        className
      )}
      role="region"
      aria-label="Contextual suggestions"
    >
      {displayNudges.map((nudge) => (
        <NudgeComponent
          key={nudge.id}
          nudge={nudge}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

/**
 * Connected Nudge Zone for Customer Detail
 */
interface CustomerNudgeZoneProps {
  userId: string;
  organizationId: string;
  customer: NudgeContext['customer'];
  equipment?: NudgeContext['equipment'];
  variant?: 'default' | 'compact' | 'stacked';
  className?: string;
}

export function CustomerNudgeZone({
  userId,
  organizationId,
  customer,
  equipment,
  variant = 'default',
  className,
}: CustomerNudgeZoneProps) {
  const { nudges, dismiss, executeAction, isLoading } = useCustomerNudges(
    userId,
    organizationId,
    customer,
    { equipment }
  );

  return (
    <NudgeZone
      nudges={nudges}
      onDismiss={dismiss}
      onAction={executeAction}
      isLoading={isLoading}
      variant={variant}
      className={className}
    />
  );
}

/**
 * Connected Nudge Zone for Job Briefing
 */
interface JobBriefingNudgeZoneProps {
  userId: string;
  organizationId: string;
  job: NudgeContext['job'];
  customer: NudgeContext['customer'];
  equipment?: NudgeContext['equipment'];
  variant?: 'default' | 'compact' | 'stacked';
  className?: string;
}

export function JobBriefingNudgeZone({
  userId,
  organizationId,
  job,
  customer,
  equipment,
  variant = 'default',
  className,
}: JobBriefingNudgeZoneProps) {
  const { nudges, dismiss, executeAction, isLoading } = useJobBriefingNudges(
    userId,
    organizationId,
    job,
    customer,
    { equipment }
  );

  return (
    <NudgeZone
      nudges={nudges}
      onDismiss={dismiss}
      onAction={executeAction}
      isLoading={isLoading}
      variant={variant}
      className={className}
    />
  );
}

/**
 * Connected Nudge Zone for Invoice Creation
 */
interface InvoiceNudgeZoneProps {
  userId: string;
  organizationId: string;
  job: NudgeContext['job'];
  customer: NudgeContext['customer'];
  equipment?: NudgeContext['equipment'];
  previousNotes?: Array<{ id: string; text: string; jobId: string; createdAt: Date }>;
  variant?: 'default' | 'compact' | 'stacked';
  className?: string;
}

export function InvoiceNudgeZone({
  userId,
  organizationId,
  job,
  customer,
  equipment,
  previousNotes,
  variant = 'default',
  className,
}: InvoiceNudgeZoneProps) {
  const { nudges, dismiss, executeAction, isLoading } = useInvoiceNudges(
    userId,
    organizationId,
    job,
    customer,
    { equipment, previousNotes }
  );

  return (
    <NudgeZone
      nudges={nudges}
      onDismiss={dismiss}
      onAction={executeAction}
      isLoading={isLoading}
      variant={variant}
      className={className}
    />
  );
}

/**
 * Inline nudge for single suggestion
 * Use when you only want to show one nudge inline with other content
 */
interface InlineNudgeProps {
  nudge: Nudge | null;
  onDismiss?: (nudge: Nudge) => void;
  onAction?: (nudge: Nudge) => void;
  className?: string;
}

export function InlineNudge({
  nudge,
  onDismiss,
  onAction,
  className,
}: InlineNudgeProps) {
  if (!nudge) return null;

  return (
    <CompactNudgeCard
      nudge={nudge}
      onDismiss={onDismiss}
      onAction={onAction}
      className={className}
    />
  );
}
