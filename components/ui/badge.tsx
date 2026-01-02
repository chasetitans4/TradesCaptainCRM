import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        primary: 'bg-primary/10 text-primary', // alias for default
        secondary: 'bg-muted text-text-muted',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        destructive: 'bg-danger/10 text-danger', // alias for danger
        info: 'bg-info/10 text-info',
        outline: 'border border-border text-text',
        // Status-specific badges
        new: 'bg-info/10 text-info',
        contacted: 'bg-primary/10 text-primary',
        quoted: 'bg-warning/10 text-warning',
        scheduled: 'bg-primary/10 text-primary',
        won: 'bg-success/10 text-success',
        lost: 'bg-danger/10 text-danger',
        in_progress: 'bg-warning/10 text-warning',
        completed: 'bg-success/10 text-success',
        cancelled: 'bg-danger/10 text-danger',
        no_show: 'bg-danger/10 text-danger',
        draft: 'bg-muted text-text-muted',
        sent: 'bg-primary/10 text-primary',
        viewed: 'bg-info/10 text-info',
        accepted: 'bg-success/10 text-success',
        declined: 'bg-danger/10 text-danger',
        expired: 'bg-danger/10 text-danger',
        paid: 'bg-success/10 text-success',
        overdue: 'bg-danger/10 text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
