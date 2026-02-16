'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatTime, formatAddress } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Clock,
  MapPin,
  User,
  Phone,
  ChevronRight,
} from 'lucide-react';
import type { CalendarJob } from './schedule-calendar';

/**
 * Calendar List View - Per UI Constraints v2.0 Section 2
 * Chronological job cards grouped by date
 * Sticky date headers ("TODAY", "TOMORROW", "Wed, Mar 13")
 */

interface ListViewProps {
  jobs: CalendarJob[];
  className?: string;
}

interface GroupedJobs {
  label: string;
  date: Date;
  jobs: CalendarJob[];
}

function getDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'TODAY';
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'TOMORROW';
  }

  // Format: "Wed, Mar 13"
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function groupJobsByDate(jobs: CalendarJob[]): GroupedJobs[] {
  const groups: Map<string, GroupedJobs> = new Map();

  jobs.forEach((job) => {
    const dateKey = job.startTime.toISOString().split('T')[0];

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        label: getDateLabel(job.startTime),
        date: new Date(job.startTime),
        jobs: [],
      });
    }

    groups.get(dateKey)!.jobs.push(job);
  });

  // Sort groups by date
  const sortedGroups = Array.from(groups.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Sort jobs within each group by start time
  sortedGroups.forEach((group) => {
    group.jobs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  });

  return sortedGroups;
}

function getStatusVariant(status: string): 'scheduled' | 'on_site' | 'completed' | 'paused' | 'cancelled' | 'default' {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'in_progress':
      return 'on_site';
    case 'completed':
      return 'completed';
    case 'paused':
      return 'paused';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'default';
  }
}

export function ListView({ jobs, className }: ListViewProps) {
  const groupedJobs = React.useMemo(() => groupJobsByDate(jobs), [jobs]);

  if (jobs.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Clock className="h-12 w-12 text-text-muted mb-4" />
        <h3 className="text-lg font-medium text-text mb-1">No scheduled jobs</h3>
        <p className="text-sm text-text-muted">
          Jobs will appear here when scheduled
        </p>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {groupedJobs.map((group) => (
        <div key={group.date.toISOString()}>
          {/* Sticky date header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2 z-10">
            <span className="text-sm font-semibold text-text-muted">
              {group.label}
            </span>
            <span className="text-sm text-text-muted ml-2">
              ({group.jobs.length} {group.jobs.length === 1 ? 'job' : 'jobs'})
            </span>
          </div>

          {/* Jobs for this date */}
          <div className="divide-y divide-border">
            {group.jobs.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function JobListCard({ job }: { job: CalendarJob }) {
  const address = job.address
    ? formatAddress(job.address, job.city || '', '', '')
    : null;

  return (
    <Link
      href={`/jobs/${job.job_id || job.id}`}
      className={cn(
        'block p-4 hover:bg-muted/50 active:bg-muted transition-colors',
        'border-l-4',
        job.status === 'scheduled' && 'border-l-tc-accent',
        job.status === 'in_progress' && 'border-l-tc-warning',
        job.status === 'completed' && 'border-l-tc-success',
        job.status === 'paused' && 'border-l-tc-warning',
        job.status === 'cancelled' && 'border-l-tc-danger',
        !job.status || !['scheduled', 'in_progress', 'completed', 'paused', 'cancelled'].includes(job.status) ? 'border-l-border' : ''
      )}
    >
      {/* Status pill first (top-left) */}
      <div className="flex items-center justify-between mb-2">
        <StatusPill variant={getStatusVariant(job.status || 'scheduled')} size="sm">
          {(job.status || 'scheduled').replace('_', ' ')}
        </StatusPill>
        <span className="text-sm font-semibold text-text">
          {formatTime(job.startTime.toISOString())}
        </span>
      </div>

      {/* Job title */}
      <h3 className="font-semibold text-text mb-1">{job.title}</h3>

      {/* Customer name */}
      {job.customerName && (
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-1">
          <User className="h-3.5 w-3.5 text-text-muted" />
          {job.customerName}
        </div>
      )}

      {/* Address */}
      {address && (
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-1">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{address}</span>
        </div>
      )}

      {/* Time range and technician */}
      <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(job.startTime.toISOString())} - {formatTime(job.endTime.toISOString())}
        </div>
        {job.technicianName && (
          <span className="truncate max-w-[120px]">{job.technicianName}</span>
        )}
      </div>
    </Link>
  );
}

export type { ListViewProps };
