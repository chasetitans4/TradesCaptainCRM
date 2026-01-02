'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Clock, Phone, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddressLinkCompact } from '@/components/ui/address-link';

export interface ScheduledJob {
  id: string;
  title: string;
  time: string;
  endTime: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  technician: {
    name: string;
    avatar?: string;
    initials: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed';
  priority: 'normal' | 'high' | 'urgent';
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
};

const priorityColors = {
  normal: '',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

interface TodaysScheduleProps {
  jobs?: ScheduledJob[];
  loading?: boolean;
  estimatedRevenue?: number;
}

export function TodaysSchedule({ jobs = [], loading, estimatedRevenue = 0 }: TodaysScheduleProps) {
  const today = format(new Date(), 'EEEE, MMMM d');
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border shadow-soft">
        <div className="p-5 border-b">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-soft">
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Today's Schedule</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar" className="gap-1">
            View Calendar
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Jobs List */}
      <div className="divide-y">
        {jobs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No jobs scheduled for today</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/jobs/new">Schedule a job</Link>
            </Button>
          </div>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className={cn(
                'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                'border-l-4 border-l-transparent',
                priorityColors[job.priority]
              )}
            >
              {/* Time */}
              <div className="w-20 flex-shrink-0 text-center">
                <p className="text-sm font-semibold">{job.time}</p>
                <p className="text-xs text-muted-foreground">{job.endTime}</p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium truncate">{job.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{job.customer.name}</p>
                  </div>
                  <Badge variant="outline" className={cn('flex-shrink-0', statusColors[job.status])}>
                    {job.status === 'in_progress' ? 'In Progress' : job.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <AddressLinkCompact address={job.customer.address} />
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {job.customer.phone}
                  </span>
                </div>
              </div>

              {/* Technician */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={job.technician.avatar} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {job.technician.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden lg:block">{job.technician.name}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {jobs.length > 0 && (
        <div className="p-4 bg-muted/30 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {jobs.length} jobs today • {completedCount} completed
            </span>
            <span className="font-medium text-primary">
              Est. Revenue: ${estimatedRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
