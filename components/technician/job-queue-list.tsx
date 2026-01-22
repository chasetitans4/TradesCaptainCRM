'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TechJob } from './active-job-card';
import {
  Clock,
  MapPin,
  DollarSign,
  ChevronRight,
  ArrowUpCircle,
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
          <JobQueueItem
            key={job.id}
            job={job}
            position={index + 1}
            onMakeCurrent={() => onMakeCurrent(job)}
          />
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
    <div className="card p-3 flex items-center gap-3">
      {/* Position indicator */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <span className="text-sm font-medium text-muted-foreground">
          {position}
        </span>
      </div>

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-text truncate">
            {job.title || 'Service Call'}
          </p>
          {job.price && (
            <Badge variant="outline" className="shrink-0 text-xs">
              <DollarSign className="h-3 w-3 mr-0.5" />
              {job.price.toLocaleString()}
            </Badge>
          )}
        </div>

        <p className="text-sm text-text-muted truncate">
          {job.customer.name}
        </p>

        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          {job.scheduled_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {job.scheduled_time}
            </span>
          )}
          {job.customer.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.customer.city}
            </span>
          )}
        </div>
      </div>

      {/* Make current button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-10 w-10 text-muted-foreground hover:text-primary"
        onClick={onMakeCurrent}
        title="Make current job"
      >
        <ArrowUpCircle className="h-5 w-5" />
      </Button>
    </div>
  );
}
