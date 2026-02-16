'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatTime, formatAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Clock,
  MapPin,
  Navigation,
  ChevronRight,
  Map,
  ExternalLink,
} from 'lucide-react';
import type { CalendarJob } from './schedule-calendar';

/**
 * Calendar Map View - Per UI Constraints v2.0 Section 2.4
 * Jobs as numbered pins on map
 * Route line connecting stops
 * Drive time between stops (placeholder - requires routing API)
 * Job list below map
 */

interface MapViewProps {
  jobs: CalendarJob[];
  selectedDate: Date;
  className?: string;
}

// Sort jobs by start time for route order
function sortJobsByTime(jobs: CalendarJob[]): CalendarJob[] {
  return [...jobs].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// Build Google Maps URL for directions
function buildMapsUrl(jobs: CalendarJob[]): string {
  if (jobs.length === 0) return '';

  const addresses = jobs
    .filter((job) => job.address)
    .map((job) => encodeURIComponent(`${job.address}${job.city ? `, ${job.city}` : ''}`));

  if (addresses.length === 0) return '';
  if (addresses.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`;
  }

  // Multiple stops - create directions URL
  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(1, -1).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  url += '&travelmode=driving';

  return url;
}

// Build individual map URL
function buildSingleMapUrl(job: CalendarJob): string {
  if (!job.address) return '';
  const address = encodeURIComponent(`${job.address}${job.city ? `, ${job.city}` : ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${address}`;
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

export function MapView({ jobs, selectedDate, className }: MapViewProps) {
  const sortedJobs = React.useMemo(() => sortJobsByTime(jobs), [jobs]);
  const routeUrl = React.useMemo(() => buildMapsUrl(sortedJobs), [sortedJobs]);

  // Filter jobs for selected date
  const todayJobs = sortedJobs.filter((job) => {
    const jobDate = job.startTime.toISOString().split('T')[0];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return jobDate === selectedDateStr;
  });

  if (todayJobs.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <MapPin className="h-12 w-12 text-text-muted mb-4" />
        <h3 className="text-lg font-medium text-text mb-1">No jobs with addresses</h3>
        <p className="text-sm text-text-muted">
          Jobs with addresses will appear on the map
        </p>
      </div>
    );
  }

  const jobsWithAddresses = todayJobs.filter((job) => job.address);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Map placeholder - shows route visualization */}
      <div className="relative bg-surface-muted border-b border-border">
        {/* Static map placeholder */}
        <div className="h-[200px] flex flex-col items-center justify-center bg-gradient-to-b from-surface-muted to-surface p-4">
          <Map className="h-16 w-16 text-text-muted mb-3" />
          <p className="text-sm text-text-muted text-center mb-3">
            {jobsWithAddresses.length} stop{jobsWithAddresses.length !== 1 ? 's' : ''} today
          </p>

          {/* Open in Google Maps button */}
          {routeUrl && (
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => window.open(routeUrl, '_blank')}
            >
              <Navigation className="h-4 w-4" />
              Open Route in Maps
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Route info strip */}
        {jobsWithAddresses.length > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-border">
            <span className="text-sm text-text-muted">
              {jobsWithAddresses.length} stops
            </span>
            <span className="text-sm text-text-secondary font-medium">
              Open in Google Maps for directions
            </span>
          </div>
        )}
      </div>

      {/* Job list with stop numbers */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 bg-surface-muted border-b border-border">
          <span className="text-sm font-semibold text-text-muted">
            ROUTE ORDER
          </span>
        </div>

        <div className="divide-y divide-border">
          {todayJobs.map((job, index) => (
            <MapJobCard
              key={job.id}
              job={job}
              stopNumber={index + 1}
              isLast={index === todayJobs.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MapJobCard({
  job,
  stopNumber,
  isLast,
}: {
  job: CalendarJob;
  stopNumber: number;
  isLast: boolean;
}) {
  const address = job.address
    ? formatAddress(job.address, job.city || '', '', '')
    : null;
  const mapUrl = buildSingleMapUrl(job);

  return (
    <div className="flex">
      {/* Stop number indicator */}
      <div className="flex flex-col items-center px-4 py-4">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            job.status === 'completed'
              ? 'bg-tc-success text-white'
              : job.status === 'in_progress'
              ? 'bg-tc-warning text-white'
              : 'bg-tc-accent text-white'
          )}
        >
          {stopNumber}
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-2" />
        )}
      </div>

      {/* Job content */}
      <Link
        href={`/jobs/${job.job_id || job.id}`}
        className="flex-1 py-4 pr-4 hover:bg-muted/30 transition-colors"
      >
        {/* Time and status */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-text">
            {formatTime(job.startTime.toISOString())}
          </span>
          <StatusPill variant={getStatusVariant(job.status || 'scheduled')} size="sm">
            {(job.status || 'scheduled').replace('_', ' ')}
          </StatusPill>
        </div>

        {/* Title */}
        <h4 className="font-medium text-text mb-1">{job.title}</h4>

        {/* Customer */}
        {job.customerName && (
          <p className="text-sm text-text-secondary mb-1">{job.customerName}</p>
        )}

        {/* Address with navigate button */}
        {address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-muted truncate flex-1">
              {address}
            </span>
            {mapUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(mapUrl, '_blank');
                }}
              >
                <Navigation className="h-3 w-3 mr-1" />
                Navigate
              </Button>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

export type { MapViewProps };
