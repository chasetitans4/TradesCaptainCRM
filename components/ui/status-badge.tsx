import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // Job statuses - using theme-compatible colors
        scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        completed: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        cancelled: 'bg-muted text-muted-foreground border border-border',
        no_show: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',

        // Lead statuses
        new: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
        contacted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        qualified: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
        proposal_sent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        quoted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        won: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        lost: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',

        // Invoice statuses
        draft: 'bg-muted text-muted-foreground border border-border',
        sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        viewed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
        paid: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',

        // Generic
        success: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        error: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        neutral: 'bg-muted text-muted-foreground border border-border',

        // Priority
        low: 'bg-muted text-muted-foreground border border-border',
        normal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'in_progress' && 'bg-amber-500 animate-pulse',
            variant === 'scheduled' && 'bg-blue-500',
            variant === 'completed' && 'bg-green-500',
            variant === 'cancelled' && 'bg-gray-500',
            variant === 'overdue' && 'bg-red-500 animate-pulse',
            variant === 'new' && 'bg-purple-500',
            variant === 'paid' && 'bg-green-500',
            variant === 'sent' && 'bg-blue-500',
            variant === 'urgent' && 'bg-red-500 animate-pulse',
            variant === 'high' && 'bg-amber-500',
            variant === 'success' && 'bg-green-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'error' && 'bg-red-500',
            variant === 'info' && 'bg-blue-500',
            variant === 'neutral' && 'bg-gray-500'
          )}
        />
      )}
      {children}
    </span>
  );
}

// Helper function to get status label
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal_sent: 'Proposal Sent',
    quoted: 'Quoted',
    won: 'Won',
    lost: 'Lost',
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    paid: 'Paid',
    partial: 'Partial',
    overdue: 'Overdue',
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

// Shorthand component for common status types
export function JobStatus({ status }: { status: string }) {
  return (
    <StatusBadge variant={status as any} dot>
      {getStatusLabel(status)}
    </StatusBadge>
  );
}

export function LeadStatus({ status }: { status: string }) {
  return (
    <StatusBadge variant={status as any} dot>
      {getStatusLabel(status)}
    </StatusBadge>
  );
}

export function InvoiceStatus({ status }: { status: string }) {
  return (
    <StatusBadge variant={status as any} dot>
      {getStatusLabel(status)}
    </StatusBadge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <StatusBadge variant={priority as any} size="sm">
      {getStatusLabel(priority)}
    </StatusBadge>
  );
}
