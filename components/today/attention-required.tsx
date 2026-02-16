'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Phone,
  ChevronRight,
} from 'lucide-react';

/**
 * Attention Required - Priority alerts section
 * Per Product Constitution v2.0 Section 6.1:
 * - Max 3 blockers
 * - Disappears if empty
 * - Shows critical items that need immediate attention
 */

export interface AttentionItem {
  id: string;
  type: 'urgent' | 'overdue' | 'pending' | 'missed';
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  href: string;
  timestamp?: string;
}

interface AttentionRequiredProps {
  items: AttentionItem[];
  className?: string;
}

const typeStyles = {
  urgent: {
    bg: 'bg-tc-danger-muted',
    border: 'border-tc-danger/20',
    icon: 'text-tc-danger',
    dot: 'bg-tc-danger',
  },
  overdue: {
    bg: 'bg-tc-warning-muted',
    border: 'border-tc-warning/20',
    icon: 'text-tc-warning',
    dot: 'bg-tc-warning',
  },
  pending: {
    bg: 'bg-tc-accent-muted',
    border: 'border-tc-accent/20',
    icon: 'text-tc-accent',
    dot: 'bg-tc-accent',
  },
  missed: {
    bg: 'bg-tc-danger-muted',
    border: 'border-tc-danger/20',
    icon: 'text-tc-danger',
    dot: 'bg-tc-danger animate-pulse',
  },
};

const defaultIcons = {
  urgent: <AlertCircle className="h-5 w-5" />,
  overdue: <Clock className="h-5 w-5" />,
  pending: <FileText className="h-5 w-5" />,
  missed: <Phone className="h-5 w-5" />,
};

export function AttentionRequired({ items, className }: AttentionRequiredProps) {
  // Don't render if no items
  if (items.length === 0) return null;

  // Limit to max 3 items
  const displayItems = items.slice(0, 3);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 px-1">
        <div className="h-2 w-2 rounded-full bg-tc-danger animate-pulse" />
        <h2 className="text-sm font-semibold text-text-primary">
          Attention Required
        </h2>
        <span className="text-xs text-text-muted">
          ({items.length} item{items.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="space-y-2">
        {displayItems.map((item) => {
          const styles = typeStyles[item.type];
          const icon = item.icon || defaultIcons[item.type];

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border',
                'transition-all active:scale-[0.99]',
                styles.bg,
                styles.border
              )}
            >
              {/* Status dot */}
              <div className={cn('h-2 w-2 rounded-full flex-shrink-0', styles.dot)} />

              {/* Icon */}
              <div className={cn('flex-shrink-0', styles.icon)}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-text-secondary truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {/* Timestamp or chevron */}
              {item.timestamp ? (
                <span className="text-xs text-text-muted flex-shrink-0">
                  {item.timestamp}
                </span>
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Show more if there are more than 3 */}
      {items.length > 3 && (
        <Link
          href="/notifications"
          className="block text-center text-sm text-tc-accent font-medium py-2"
        >
          View all {items.length} items
        </Link>
      )}
    </div>
  );
}

/**
 * Helper to generate attention items from business data
 */
export function generateAttentionItems(data: {
  missedCalls?: Array<{ id: string; customerName: string; time: string }>;
  overdueInvoices?: Array<{ id: string; customerName: string; amount: number; daysOverdue: number }>;
  pendingApprovals?: Array<{ id: string; type: string; title: string }>;
  urgentJobs?: Array<{ id: string; title: string; reason: string }>;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Missed calls (highest priority)
  data.missedCalls?.forEach((call) => {
    items.push({
      id: `missed-call-${call.id}`,
      type: 'missed',
      title: `Missed call from ${call.customerName}`,
      subtitle: 'Tap to call back',
      href: `/customers/${call.id}`,
      timestamp: call.time,
    });
  });

  // Urgent jobs
  data.urgentJobs?.forEach((job) => {
    items.push({
      id: `urgent-job-${job.id}`,
      type: 'urgent',
      title: job.title,
      subtitle: job.reason,
      href: `/jobs/${job.id}`,
    });
  });

  // Overdue invoices
  data.overdueInvoices?.forEach((invoice) => {
    items.push({
      id: `overdue-invoice-${invoice.id}`,
      type: 'overdue',
      icon: <DollarSign className="h-5 w-5" />,
      title: `$${invoice.amount.toLocaleString()} overdue`,
      subtitle: `${invoice.customerName} • ${invoice.daysOverdue} days`,
      href: `/invoices/${invoice.id}`,
    });
  });

  // Pending approvals
  data.pendingApprovals?.forEach((approval) => {
    items.push({
      id: `pending-${approval.id}`,
      type: 'pending',
      title: approval.title,
      subtitle: `${approval.type} needs approval`,
      href: `/approvals/${approval.id}`,
    });
  });

  return items;
}
