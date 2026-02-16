'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SwipeActions } from '@/components/mobile/swipe-actions';
import type { TechJob } from './active-job-card';
import {
  Clock,
  MapPin,
  DollarSign,
  ArrowUpCircle,
  Phone,
} from 'lucide-react';

interface JobQueueListProps {
  jobs: TechJob[];
  onMakeCurrent: (job: TechJob) => void;
}

export function JobQueueList({ jobs, onMakeCurrent }: JobQueueListProps) {
  if (jobs.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Up Next
          <Badge variant="secondary" className="text-xs">
            {jobs.length}
          </Badge>
        </h3>
      </div>

      <div className="space-y-2">
        {jobs.map((job, index) => (
          <div
            key={job.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
          >
            <JobQueueItem
              job={job}
              position={index + 1}
              onMakeCurrent={() => onMakeCurrent(job)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

interface JobQueueItemProps {
  job: TechJob;
  position: number;
  onMakeCurrent: () => void;
}

function JobQueueItem({ job, position, onMakeCurrent }: JobQueueItemProps) {
  return (
    <SwipeActions
      rightActions={job.customer.phone ? [{
        icon: Phone,
        label: 'Call',
        color: 'success',
        onClick: () => window.open(`tel:${job.customer.phone}`),
      }] : []}
      leftActions={[{
        icon: ArrowUpCircle,
        label: 'Make Current',
        color: 'info',
        onClick: onMakeCurrent,
      }]}
    >
      <div className="card p-5 flex items-center gap-4">
        {/* Position indicator */}
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-base font-medium text-muted-foreground">
            {position}
          </span>
        </div>

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-lg text-text truncate">
              {job.title || 'Service Call'}
            </p>
            {job.price && (
              <Badge variant="outline" className="shrink-0 text-sm py-0.5">
                <DollarSign className="h-3.5 w-3.5 mr-0.5" />
                {job.price.toLocaleString()}
              </Badge>
            )}
          </div>

          <p className="text-base text-text-muted truncate mb-1">
            {job.customer.name}
          </p>

          <div className="flex items-center gap-3 text-sm text-text-muted">
            {job.scheduled_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {job.scheduled_time}
              </span>
            )}
            {job.customer.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.customer.city}
              </span>
            )}
          </div>
        </div>

        {/* Make current button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-14 w-14 text-muted-foreground hover:text-primary rounded-xl"
          onClick={onMakeCurrent}
          title="Make current job"
        >
          <ArrowUpCircle className="h-8 w-8" />
        </Button>
      </div>
    </SwipeActions>
  );
}
