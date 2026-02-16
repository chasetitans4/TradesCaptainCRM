'use client';

import { cn } from '@/lib/utils';

// Base skeleton component with optional stagger index for animation delay
export function Skeleton({
  className,
  index,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { index?: number }) {
  // Calculate stagger delay: 50ms increment per index, max 500ms
  const delay = index !== undefined ? Math.min(index * 50, 500) : 0;

  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
      {...props}
    />
  );
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton index={i * 3} className="h-10 w-10 rounded-lg" />
            <Skeleton index={i * 3 + 1} className="h-4 w-16" />
          </div>
          <Skeleton index={i * 3 + 2} className="h-8 w-24 mb-2" />
          <Skeleton index={i * 3 + 3} className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-3 flex gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} index={i} className="h-4 w-24" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-4 flex items-center gap-4">
            <Skeleton index={5 + rowIndex * 4} className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton index={5 + rowIndex * 4 + 1} className="h-4 w-48" />
              <Skeleton index={5 + rowIndex * 4 + 2} className="h-3 w-32" />
            </div>
            <Skeleton index={5 + rowIndex * 4 + 3} className="h-6 w-20 rounded-full" />
            <Skeleton index={5 + rowIndex * 4 + 4} className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Card list skeleton
export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, cardIndex) => (
        <div
          key={cardIndex}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton index={cardIndex * 6} className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton index={cardIndex * 6 + 1} className="h-4 w-32" />
                <Skeleton index={cardIndex * 6 + 2} className="h-3 w-24" />
              </div>
            </div>
            <Skeleton index={cardIndex * 6 + 3} className="h-6 w-6 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton index={cardIndex * 6 + 4} className="h-3 w-full" />
            <Skeleton index={cardIndex * 6 + 5} className="h-3 w-3/4" />
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between">
            <Skeleton index={cardIndex * 6 + 6} className="h-4 w-20" />
            <Skeleton index={cardIndex * 6 + 7} className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton index={0} className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton index={1} className="h-8 w-8 rounded" />
          <Skeleton index={2} className="h-8 w-8 rounded" />
        </div>
      </div>
      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} index={3 + i} className="h-8 w-full rounded" />
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} index={10 + i} className="h-20 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton index={i * 2} className="h-4 w-24" />
          <Skeleton index={i * 2 + 1} className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton index={fields * 2} className="h-10 w-24 rounded-lg" />
        <Skeleton index={fields * 2 + 1} className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// Chat/Messages skeleton
export function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-3',
            i % 2 === 0 ? '' : 'flex-row-reverse'
          )}
        >
          <Skeleton index={i * 3} className="h-8 w-8 rounded-full flex-shrink-0" />
          <div
            className={cn(
              'space-y-2',
              i % 2 === 0 ? '' : 'items-end flex flex-col'
            )}
          >
            <Skeleton
              index={i * 3 + 1}
              className={cn(
                'h-16 rounded-lg',
                i % 2 === 0 ? 'w-64' : 'w-48'
              )}
            />
            <Skeleton index={i * 3 + 2} className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Skeleton index={0} className="h-8 w-48" />
        <Skeleton index={1} className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton index={2} className="h-10 w-24 rounded-lg" />
        <Skeleton index={3} className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton({ type = 'table' }: { type?: 'table' | 'cards' | 'form' | 'calendar' }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {type === 'table' && <TableSkeleton />}
      {type === 'cards' && <CardListSkeleton />}
      {type === 'form' && <FormSkeleton />}
      {type === 'calendar' && <CalendarSkeleton />}
    </div>
  );
}

// =====================================================
// CONSTITUTION-COMPLIANT SKELETONS
// Per Design Constitution Section 3.13
// =====================================================

/**
 * Job detail skeleton per Constitution Section 3.13.2
 * Load order: header first, then content
 */
export function JobDetailSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      {/* Header - loads first */}
      <div className="flex items-center gap-3">
        <Skeleton index={0} className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1">
          <Skeleton index={1} className="h-6 w-48" />
          <Skeleton index={2} className="h-5 w-24 rounded-full" />
        </div>
      </div>

      {/* Progress stepper */}
      <Skeleton index={3} className="h-12 w-full rounded-xl" />

      {/* Quick contact - 3 buttons */}
      <div className="grid grid-cols-3 gap-3">
        {[4, 5, 6].map((i) => (
          <Skeleton key={i} index={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Job details card */}
      <div className="rounded-xl border bg-background p-4 space-y-3">
        <Skeleton index={7} className="h-5 w-24" />
        <div className="space-y-2">
          <Skeleton index={8} className="h-4 w-full" />
          <Skeleton index={9} className="h-4 w-3/4" />
          <Skeleton index={10} className="h-4 w-1/2" />
        </div>
      </div>

      {/* Customer card */}
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center gap-3">
          <Skeleton index={11} className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton index={12} className="h-4 w-32" />
            <Skeleton index={13} className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div className="space-y-3">
        <Skeleton index={14} className="h-5 w-20" />
        <div className="grid grid-cols-3 gap-2">
          {[15, 16, 17].map((i) => (
            <Skeleton key={i} index={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Action Bar skeleton per Constitution Section 3.7.4
 * 70px height, 5 action buttons
 */
export function QuickActionBarSkeleton() {
  return (
    <div className="fixed bottom-16 inset-x-0 z-40 bg-background border-t border-border md:hidden">
      <div className="h-[70px] px-3 flex items-center justify-around gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton index={i} className="h-6 w-6 rounded" />
            <Skeleton index={i + 5} className="h-2 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Actionable indicators skeleton per Constitution Section 3.8.3
 */
export function ActionableIndicatorsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <Skeleton
          key={i}
          index={i}
          className="min-w-[100px] h-[80px] rounded-xl shrink-0"
        />
      ))}
    </div>
  );
}

/**
 * Today's jobs list skeleton per Constitution Section 3.8.5
 */
export function TodaysJobsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 min-h-[70px]"
        >
          {/* Status indicator */}
          <Skeleton index={i * 4} className="h-4 w-4 rounded-full" />
          {/* Time */}
          <Skeleton index={i * 4 + 1} className="h-4 w-14" />
          {/* Details */}
          <div className="flex-1 space-y-1">
            <Skeleton index={i * 4 + 2} className="h-4 w-32" />
            <Skeleton index={i * 4 + 3} className="h-3 w-48" />
          </div>
          {/* Chevron */}
          <Skeleton index={i * 4 + 4} className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton with Constitution layout
 * Actionable indicators + Today's jobs
 */
export function ConstitutionDashboardSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      {/* Greeting */}
      <div className="space-y-1">
        <Skeleton index={0} className="h-6 w-48" />
        <Skeleton index={1} className="h-4 w-32" />
      </div>

      {/* Actionable indicators */}
      <ActionableIndicatorsSkeleton />

      {/* Today's jobs header */}
      <div className="flex items-center justify-between">
        <Skeleton index={10} className="h-5 w-32" />
      </div>

      {/* Today's jobs list */}
      <TodaysJobsListSkeleton />
    </div>
  );
}

/**
 * Mobile form skeleton per Constitution Section 3.9.4
 * 50px minimum input height
 */
export function MobileFormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 px-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton index={i * 2} className="h-4 w-20" />
          <Skeleton index={i * 2 + 1} className="h-[50px] w-full rounded-xl" />
        </div>
      ))}
      {/* Submit button - 50px per Constitution */}
      <Skeleton index={fields * 2} className="h-[50px] w-full rounded-xl" />
    </div>
  );
}
