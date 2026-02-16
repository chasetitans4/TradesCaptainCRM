'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  MessageSquare,
  Target,
  DollarSign,
  PhoneIncoming,
  FileText,
  Wrench,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react';

/**
 * Alert states for indicator styling
 * Per Design Constitution Section 3.8.4
 */
export type IndicatorAlertState = 'normal' | 'urgent' | 'critical' | 'empty';

/**
 * Single actionable indicator
 */
export interface ActionableIndicator {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Current count */
  count: number;
  /** Icon component */
  icon: LucideIcon;
  /** Navigation target when tapped */
  href: string;
  /** Alert state for styling */
  alertState?: IndicatorAlertState;
  /** Optional: monetary value instead of count */
  monetaryValue?: number;
}

/**
 * Determine alert state based on count and thresholds
 * Per Design Constitution Section 3.8.4
 */
export function getAlertState(
  count: number,
  thresholds?: { urgent?: number; critical?: number }
): IndicatorAlertState {
  if (count === 0) return 'empty';
  if (thresholds?.critical && count >= thresholds.critical) return 'critical';
  if (thresholds?.urgent && count >= thresholds.urgent) return 'urgent';
  return 'normal';
}

/**
 * Alert state styling
 */
const ALERT_STATE_STYLES: Record<IndicatorAlertState, string> = {
  normal: 'bg-background border-border',
  urgent: 'bg-warning/10 border-warning/30',
  critical: 'bg-danger/10 border-danger/30',
  empty: 'bg-muted/50 border-border opacity-60',
};

const ALERT_STATE_ICON_STYLES: Record<IndicatorAlertState, string> = {
  normal: 'text-primary',
  urgent: 'text-warning',
  critical: 'text-danger',
  empty: 'text-text-muted',
};

const ALERT_STATE_COUNT_STYLES: Record<IndicatorAlertState, string> = {
  normal: 'text-text',
  urgent: 'text-warning',
  critical: 'text-danger',
  empty: 'text-text-muted',
};

interface ActionableIndicatorCardProps {
  indicator: ActionableIndicator;
  className?: string;
}

/**
 * Single Actionable Indicator Card
 *
 * Per Design Constitution Section 3.8.2 & 3.8.4:
 * - Show work waiting for attention
 * - Tap through directly to that work
 * - Indicator card: Minimum 100x80px (tappable area)
 * - Count number: 24-32px font, bold
 * - Label: 12-14px, below count
 */
export function ActionableIndicatorCard({
  indicator,
  className,
}: ActionableIndicatorCardProps) {
  const { label, count, icon: Icon, href, alertState = 'normal', monetaryValue } = indicator;

  // Don't render prominent empty states per Constitution
  // "Never show a zero count prominently. Either dim the indicator or hide it entirely."
  const displayValue = monetaryValue !== undefined
    ? `$${monetaryValue.toLocaleString()}`
    : count.toString();

  return (
    <Link
      href={href}
      className={cn(
        // Minimum dimensions per Constitution Section 3.8.4
        'min-w-[100px] min-h-[80px]',
        // Flex layout
        'flex flex-col items-center justify-center gap-1',
        // Padding and styling
        'px-3 py-3 rounded-xl border',
        // Touch feedback
        'active:scale-95 transition-all duration-150',
        // Alert state styling
        ALERT_STATE_STYLES[alertState],
        className
      )}
    >
      {/* Icon */}
      <Icon
        className={cn('h-5 w-5', ALERT_STATE_ICON_STYLES[alertState])}
        strokeWidth={1.5}
      />

      {/* Count - 24-32px per Constitution */}
      <span
        className={cn(
          'text-2xl font-bold leading-none',
          ALERT_STATE_COUNT_STYLES[alertState]
        )}
      >
        {alertState === 'empty' ? '—' : displayValue}
      </span>

      {/* Label - 12-14px per Constitution */}
      <span className="text-xs text-text-muted leading-tight text-center">
        {label}
      </span>
    </Link>
  );
}

interface ActionableIndicatorsRowProps {
  indicators: ActionableIndicator[];
  className?: string;
}

/**
 * Row of Actionable Indicators
 *
 * Per Design Constitution Section 3.8.3:
 * Horizontal row of indicator cards that can scroll on narrow screens
 */
export function ActionableIndicatorsRow({
  indicators,
  className,
}: ActionableIndicatorsRowProps) {
  // Filter out empty indicators if desired (optional)
  const visibleIndicators = indicators.filter(i => i.count > 0 || i.alertState !== 'empty');

  if (visibleIndicators.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1',
        // Hide scrollbar on mobile
        'scrollbar-hide',
        className
      )}
    >
      {visibleIndicators.map((indicator) => (
        <ActionableIndicatorCard key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}

/**
 * Default actionable indicators configuration
 * Per Design Constitution Section 3.8.2 - Required indicators
 */
export function createDefaultIndicators(data: {
  unreadMessages?: number;
  newLeads?: number;
  uninvoicedJobs?: number;
  uninvoicedValue?: number;
  pendingCallbacks?: number;
  pendingQuotes?: number;
  partsNeeded?: number;
  overdueJobs?: number;
}): ActionableIndicator[] {
  const indicators: ActionableIndicator[] = [];

  // Messages - always show
  indicators.push({
    id: 'messages',
    label: 'Messages',
    count: data.unreadMessages ?? 0,
    icon: MessageSquare,
    href: '/messages',
    alertState: getAlertState(data.unreadMessages ?? 0, { urgent: 5 }),
  });

  // New Leads
  indicators.push({
    id: 'leads',
    label: 'New Leads',
    count: data.newLeads ?? 0,
    icon: Target,
    href: '/leads?status=new',
    alertState: getAlertState(data.newLeads ?? 0, { urgent: 5 }),
  });

  // Uninvoiced Jobs
  indicators.push({
    id: 'uninvoiced',
    label: 'Uninvoiced',
    count: data.uninvoicedJobs ?? 0,
    icon: DollarSign,
    href: '/jobs?status=completed&invoiced=false',
    alertState: getAlertState(data.uninvoicedJobs ?? 0, { urgent: 3 }),
    monetaryValue: data.uninvoicedValue,
  });

  // Callbacks
  if (data.pendingCallbacks !== undefined && data.pendingCallbacks > 0) {
    indicators.push({
      id: 'callbacks',
      label: 'Callbacks',
      count: data.pendingCallbacks,
      icon: PhoneIncoming,
      href: '/reminders?type=callback',
      alertState: getAlertState(data.pendingCallbacks, { urgent: 3 }),
    });
  }

  // Optional: Pending Quotes (role-dependent)
  if (data.pendingQuotes !== undefined && data.pendingQuotes > 0) {
    indicators.push({
      id: 'quotes',
      label: 'Pending Quotes',
      count: data.pendingQuotes,
      icon: FileText,
      href: '/quotes?status=pending',
      alertState: getAlertState(data.pendingQuotes, { urgent: 5 }),
    });
  }

  // Optional: Parts Needed (if inventory tracking enabled)
  if (data.partsNeeded !== undefined && data.partsNeeded > 0) {
    indicators.push({
      id: 'parts',
      label: 'Parts Needed',
      count: data.partsNeeded,
      icon: Wrench,
      href: '/jobs?parts_needed=true',
      alertState: getAlertState(data.partsNeeded, { urgent: 3 }),
    });
  }

  // Overdue Jobs - Critical alert
  if (data.overdueJobs !== undefined && data.overdueJobs > 0) {
    indicators.push({
      id: 'overdue',
      label: 'Overdue',
      count: data.overdueJobs,
      icon: AlertTriangle,
      href: '/jobs?overdue=true',
      alertState: 'critical',
    });
  }

  return indicators;
}

/**
 * Hook to fetch indicator data (placeholder - implement with actual data fetching)
 */
export function useActionableIndicators(businessId: string) {
  // TODO: Implement with actual data fetching using TanStack Query or similar
  // This is a placeholder that returns mock data

  return {
    isLoading: false,
    indicators: createDefaultIndicators({
      unreadMessages: 3,
      newLeads: 2,
      uninvoicedJobs: 5,
      uninvoicedValue: 2450,
      pendingCallbacks: 1,
    }),
  };
}
