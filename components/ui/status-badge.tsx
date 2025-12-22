import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // Job statuses
        scheduled: 'bg-blue-100 text-blue-700 border border-blue-200',
        in_progress: 'bg-amber-100 text-amber-700 border border-amber-200',
        completed: 'bg-green-100 text-green-700 border border-green-200',
        cancelled: 'bg-gray-100 text-gray-700 border border-gray-200',
        no_show: 'bg-red-100 text-red-700 border border-red-200',

        // Lead statuses
        new: 'bg-purple-100 text-purple-700 border border-purple-200',
        contacted: 'bg-blue-100 text-blue-700 border border-blue-200',
        qualified: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
        proposal_sent: 'bg-amber-100 text-amber-700 border border-amber-200',
        quoted: 'bg-amber-100 text-amber-700 border border-amber-200',
        won: 'bg-green-100 text-green-700 border border-green-200',
        lost: 'bg-red-100 text-red-700 border border-red-200',

        // Invoice statuses
        draft: 'bg-gray-100 text-gray-700 border border-gray-200',
        sent: 'bg-blue-100 text-blue-700 border border-blue-200',
        viewed: 'bg-purple-100 text-purple-700 border border-purple-200',
        paid: 'bg-green-100 text-green-700 border border-green-200',
        partial: 'bg-amber-100 text-amber-700 border border-amber-200',
        overdue: 'bg-red-100 text-red-700 border border-red-200',

        // Generic
        success: 'bg-green-100 text-green-700 border border-green-200',
        warning: 'bg-amber-100 text-amber-700 border border-amber-200',
        error: 'bg-red-100 text-red-700 border border-red-200',
        info: 'bg-blue-100 text-blue-700 border border-blue-200',
        neutral: 'bg-gray-100 text-gray-700 border border-gray-200',

        // Priority
        low: 'bg-gray-100 text-gray-600 border border-gray-200',
        normal: 'bg-blue-100 text-blue-600 border border-blue-200',
        high: 'bg-amber-100 text-amber-600 border border-amber-200',
        urgent: 'bg-red-100 text-red-600 border border-red-200',
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
