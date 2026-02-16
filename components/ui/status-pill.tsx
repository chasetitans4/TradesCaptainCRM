'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * StatusPill - Enhanced status badge with dot indicator
 * Per UI Constraints v2.0 Section 10.3
 * - Caption size text
 * - Rounded-full shape
 * - Dot indicator for active/live states
 * - Semantic color tokens
 */

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // Default/neutral states
        default: 'bg-surface-muted text-text-secondary',
        muted: 'bg-surface-muted text-text-muted',

        // Accent/active states
        accent: 'bg-tc-accent-muted text-tc-accent',
        active: 'bg-tc-accent-muted text-tc-accent',

        // Status states
        success: 'bg-tc-success-muted text-tc-success',
        warning: 'bg-tc-warning-muted text-tc-warning',
        danger: 'bg-tc-danger-muted text-tc-danger',
        info: 'bg-tc-info-muted text-tc-info',

        // Job status specific
        scheduled: 'bg-tc-accent-muted text-tc-accent',
        on_my_way: 'bg-tc-info-muted text-tc-info',
        on_site: 'bg-tc-warning-muted text-tc-warning',
        completed: 'bg-tc-success-muted text-tc-success',
        paid: 'bg-tc-success-muted text-tc-success',
        paused: 'bg-tc-warning-muted text-tc-warning',
        cancelled: 'bg-tc-danger-muted text-tc-danger',

        // Lead status specific
        new: 'bg-tc-info-muted text-tc-info',
        contacted: 'bg-tc-accent-muted text-tc-accent',
        qualified: 'bg-tc-success-muted text-tc-success',
        quoted: 'bg-tc-warning-muted text-tc-warning',
        won: 'bg-tc-success-muted text-tc-success',
        lost: 'bg-surface-muted text-text-muted',

        // Invoice status specific
        draft: 'bg-surface-muted text-text-muted',
        sent: 'bg-tc-accent-muted text-tc-accent',
        viewed: 'bg-tc-info-muted text-tc-info',
        overdue: 'bg-tc-danger-muted text-tc-danger',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-1 text-xs',
        lg: 'px-2.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Dot color mapping - matches the text color for each variant
const dotColorMap: Record<string, string> = {
  default: 'bg-text-secondary',
  muted: 'bg-text-muted',
  accent: 'bg-tc-accent',
  active: 'bg-tc-accent',
  success: 'bg-tc-success',
  warning: 'bg-tc-warning',
  danger: 'bg-tc-danger',
  info: 'bg-tc-info',
  scheduled: 'bg-tc-accent',
  on_my_way: 'bg-tc-info',
  on_site: 'bg-tc-warning',
  completed: 'bg-tc-success',
  paid: 'bg-tc-success',
  paused: 'bg-tc-warning',
  cancelled: 'bg-tc-danger',
  new: 'bg-tc-info',
  contacted: 'bg-tc-accent',
  qualified: 'bg-tc-success',
  quoted: 'bg-tc-warning',
  won: 'bg-tc-success',
  lost: 'bg-text-muted',
  draft: 'bg-text-muted',
  sent: 'bg-tc-accent',
  viewed: 'bg-tc-info',
  overdue: 'bg-tc-danger',
};

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Show animated dot indicator (for active/live states) */
  showDot?: boolean;
  /** Animate the dot with a pulse effect */
  pulseDot?: boolean;
  /** Icon to show before the text */
  icon?: React.ReactNode;
}

export function StatusPill({
  className,
  variant = 'default',
  size,
  showDot = false,
  pulseDot = false,
  icon,
  children,
  ...props
}: StatusPillProps) {
  const variantKey = variant || 'default';
  const dotColor = dotColorMap[variantKey] || 'bg-text-secondary';

  return (
    <span
      className={cn(statusPillVariants({ variant, size }), className)}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {pulseDot && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                dotColor
              )}
            />
          )}
          <span
            className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)}
          />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export { statusPillVariants };
