'use client';

import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  Wrench,
  FileText,
  CreditCard,
  Star,
  CircleDot,
  Circle,
} from 'lucide-react';

export type JobTimelineStatus =
  | 'scheduled'
  | 'confirmed'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid';

interface TimelineStep {
  status: JobTimelineStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  timestamp?: string;
  isActive: boolean;
  isComplete: boolean;
}

interface JobTimelineProps {
  currentStatus: string;
  timestamps?: {
    scheduled_at?: string;
    confirmed_at?: string;
    on_the_way_at?: string;
    arrived_at?: string;
    started_at?: string;
    completed_at?: string;
    invoiced_at?: string;
    paid_at?: string;
  };
  showAllSteps?: boolean;
  className?: string;
}

const STATUS_ORDER: JobTimelineStatus[] = [
  'scheduled',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
];

const STATUS_DETAILS: Record<JobTimelineStatus, { label: string; description: string; icon: React.ReactNode }> = {
  scheduled: {
    label: 'Scheduled',
    description: 'Appointment is scheduled',
    icon: <Calendar className="h-4 w-4" />,
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Appointment confirmed',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  on_the_way: {
    label: 'On the Way',
    description: 'Technician is en route',
    icon: <Truck className="h-4 w-4" />,
  },
  arrived: {
    label: 'Arrived',
    description: 'Technician has arrived',
    icon: <CircleDot className="h-4 w-4" />,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Work is in progress',
    icon: <Wrench className="h-4 w-4" />,
  },
  completed: {
    label: 'Completed',
    description: 'Work is complete',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  invoiced: {
    label: 'Invoiced',
    description: 'Invoice sent',
    icon: <FileText className="h-4 w-4" />,
  },
  paid: {
    label: 'Paid',
    description: 'Payment received',
    icon: <CreditCard className="h-4 w-4" />,
  },
};

// Map various status strings to timeline statuses
function normalizeStatus(status: string): JobTimelineStatus {
  const statusMap: Record<string, JobTimelineStatus> = {
    'scheduled': 'scheduled',
    'confirmed': 'confirmed',
    'on_the_way': 'on_the_way',
    'en_route': 'on_the_way',
    'arrived': 'arrived',
    'in_progress': 'in_progress',
    'working': 'in_progress',
    'completed': 'completed',
    'done': 'completed',
    'invoiced': 'invoiced',
    'paid': 'paid',
  };
  return statusMap[status.toLowerCase()] || 'scheduled';
}

export function JobTimeline({ currentStatus, timestamps = {}, showAllSteps = false, className }: JobTimelineProps) {
  const normalizedStatus = normalizeStatus(currentStatus);
  const currentIndex = STATUS_ORDER.indexOf(normalizedStatus);

  // Build timeline steps
  const steps: TimelineStep[] = STATUS_ORDER.map((status, index) => {
    const details = STATUS_DETAILS[status];
    const timestampKey = `${status === 'in_progress' ? 'started' : status}_at` as keyof typeof timestamps;

    return {
      status,
      label: details.label,
      description: details.description,
      icon: details.icon,
      timestamp: timestamps[timestampKey],
      isActive: index === currentIndex,
      isComplete: index < currentIndex,
    };
  });

  // Filter steps if not showing all
  const visibleSteps = showAllSteps
    ? steps
    : steps.filter((step, index) => {
        // Always show completed steps, active step, and next step
        return step.isComplete || step.isActive || index === currentIndex + 1;
      });

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={cn('relative', className)}>
      <div className="space-y-0">
        {visibleSteps.map((step, index) => (
          <div key={step.status} className="relative flex gap-4">
            {/* Connector line */}
            {index < visibleSteps.length - 1 && (
              <div
                className={cn(
                  'absolute left-[15px] top-8 w-0.5 h-full -translate-x-1/2',
                  step.isComplete ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                step.isComplete
                  ? 'bg-green-500 text-white'
                  : step.isActive
                    ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                    : 'bg-gray-100 text-gray-400'
              )}
            >
              {step.icon}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4
                  className={cn(
                    'text-sm font-medium',
                    step.isComplete || step.isActive ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </h4>
                {step.timestamp && (
                  <span className="text-xs text-gray-500">
                    {formatTime(step.timestamp)}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'text-xs mt-0.5',
                  step.isComplete || step.isActive ? 'text-gray-500' : 'text-gray-300'
                )}
              >
                {step.description}
              </p>

              {/* Active step indicator */}
              {step.isActive && (
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Current status
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact horizontal timeline for cards
interface CompactTimelineProps {
  currentStatus: string;
  className?: string;
}

export function CompactJobTimeline({ currentStatus, className }: CompactTimelineProps) {
  const normalizedStatus = normalizeStatus(currentStatus);
  const currentIndex = STATUS_ORDER.indexOf(normalizedStatus);

  // Show only main stages for compact view
  const mainStages: JobTimelineStatus[] = ['scheduled', 'on_the_way', 'in_progress', 'completed'];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {mainStages.map((stage, index) => {
        const stageIndex = STATUS_ORDER.indexOf(stage);
        const isComplete = currentIndex > stageIndex;
        const isActive = currentIndex === stageIndex;
        const details = STATUS_DETAILS[stage];

        return (
          <div key={stage} className="flex items-center">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                isComplete
                  ? 'bg-green-500 text-white'
                  : isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-400'
              )}
              title={details.label}
            >
              {details.icon}
            </div>
            {index < mainStages.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-0.5',
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default JobTimeline;
