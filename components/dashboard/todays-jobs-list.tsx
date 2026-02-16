'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatTime, formatAddress } from '@/lib/utils';
import { ChevronRight, MapPin, Clock } from 'lucide-react';
import type { Job, Customer } from '@/types';

/**
 * Job status for visual indicator
 */
export type JobVisualStatus = 'current' | 'upcoming' | 'complete' | 'in_progress' | 'on_way';

/**
 * Get visual status indicator
 * Per Design Constitution Section 3.8.5:
 * - Filled circle (●) for current/next
 * - Empty circle (○) for upcoming
 * - Checkmark (✓) for complete
 */
function getStatusIndicator(status: JobVisualStatus): { symbol: string; className: string } {
  switch (status) {
    case 'current':
    case 'in_progress':
    case 'on_way':
      return { symbol: '●', className: 'text-primary' };
    case 'upcoming':
      return { symbol: '○', className: 'text-text-muted' };
    case 'complete':
      return { symbol: '✓', className: 'text-success' };
    default:
      return { symbol: '○', className: 'text-text-muted' };
  }
}

/**
 * Job item for the list
 */
export interface TodayJobItem {
  id: string;
  title: string;
  scheduledTime?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'return_needed' | 'callback' | 'cancelled' | 'no_show' | 'on_way';
  customer: {
    name: string;
    address?: string;
  };
  /** Whether this is the current/next job */
  isCurrent?: boolean;
}

interface TodayJobCardProps {
  job: TodayJobItem;
  className?: string;
}

/**
 * Single Today's Job Card
 *
 * Per Design Constitution Section 3.8.5:
 * - Time (prominent)
 * - Customer name
 * - Address (truncated if needed)
 * - Job type
 * - Status indicator (Not Started / In Progress / Complete)
 * - Minimum height: 70px (tappable)
 */
export function TodayJobCard({ job, className }: TodayJobCardProps) {
  const visualStatus: JobVisualStatus =
    job.status === 'completed' ? 'complete' :
    job.status === 'in_progress' ? 'in_progress' :
    job.status === 'on_way' ? 'on_way' :
    job.isCurrent ? 'current' : 'upcoming';

  const statusIndicator = getStatusIndicator(visualStatus);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        // Minimum height per Constitution Section 3.8.5
        'min-h-[70px]',
        // Flex layout
        'flex items-center gap-3',
        // Padding and styling
        'px-4 py-3',
        // Border between items
        'border-b border-border last:border-b-0',
        // Touch feedback
        'active:bg-muted/50 transition-colors',
        // Highlight current job
        job.isCurrent && 'bg-primary/5',
        className
      )}
    >
      {/* Status Indicator */}
      <span className={cn('text-lg font-medium', statusIndicator.className)}>
        {statusIndicator.symbol}
      </span>

      {/* Time */}
      <div className="w-16 shrink-0">
        <span className="text-sm font-semibold text-text">
          {job.scheduledTime ? formatTime(job.scheduledTime) : '—'}
        </span>
      </div>

      {/* Job Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text truncate">{job.customer.name}</p>
        <p className="text-sm text-text-muted truncate">
          {job.title}
          {job.customer.address && (
            <>
              <span className="mx-1">•</span>
              {job.customer.address}
            </>
          )}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
    </Link>
  );
}

interface TodaysJobsListProps {
  /** Jobs to display */
  jobs: TodayJobItem[];
  /** Maximum jobs to show before "View All" link */
  maxVisible?: number;
  /** Title for the section */
  title?: string;
  /** Show "View All" link */
  showViewAll?: boolean;
  /** View all link href */
  viewAllHref?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Today's Jobs List
 *
 * Per Design Constitution Section 3.8.5:
 * - Shows today's scheduled jobs in chronological order
 * - Show first 3-4 jobs on dashboard
 * - "View All Jobs →" link below if more exist
 * - Current/next job highlighted or pinned to top
 * - Pull-to-refresh updates job list
 */
export function TodaysJobsList({
  jobs,
  maxVisible = 4,
  title = "Today's Jobs",
  showViewAll = true,
  viewAllHref = '/jobs?date=today',
  emptyMessage = 'No jobs scheduled today.',
  className,
}: TodaysJobsListProps) {
  // Mark the first non-completed job as current
  const jobsWithCurrent = jobs.map((job, index) => {
    const previousJobsComplete = jobs
      .slice(0, index)
      .every(j => j.status === 'completed');

    return {
      ...job,
      isCurrent: previousJobsComplete && job.status !== 'completed',
    };
  });

  // Limit visible jobs
  const visibleJobs = jobsWithCurrent.slice(0, maxVisible);
  const hasMore = jobs.length > maxVisible;

  return (
    <section className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-text">
          {title} ({jobs.length})
        </h2>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        // Empty State per Constitution Section 3.8.7
        <div className="card py-8 text-center">
          <Clock className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted mb-3">{emptyMessage}</p>
          <div className="flex justify-center gap-2">
            <Link
              href="/calendar?date=tomorrow"
              className="text-sm text-primary hover:underline"
            >
              View tomorrow
            </Link>
            <span className="text-text-muted">•</span>
            <Link
              href="/jobs"
              className="text-sm text-primary hover:underline"
            >
              View all jobs
            </Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {visibleJobs.map((job) => (
            <TodayJobCard key={job.id} job={job} />
          ))}

          {/* View All Link */}
          {showViewAll && hasMore && (
            <Link
              href={viewAllHref}
              className={cn(
                'flex items-center justify-center gap-1',
                'py-3 text-sm text-primary font-medium',
                'hover:bg-muted/50 transition-colors'
              )}
            >
              View All Jobs
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Transform raw job data to TodayJobItem format
 */
export function transformJobToTodayItem(
  job: Job & { customer: Customer }
): TodayJobItem {
  return {
    id: job.id,
    title: job.title || 'Untitled Job',
    scheduledTime: job.scheduled_time,
    status: job.status,
    customer: {
      name: job.customer.name,
      address: job.customer.city
        ? `${job.customer.city}, ${job.customer.state}`
        : undefined,
    },
  };
}
