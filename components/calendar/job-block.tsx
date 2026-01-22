'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getJobColors, normalizeJobType } from '@/lib/calendar/colors';
import { Clock, MapPin, User, AlertCircle } from 'lucide-react';

export interface CalendarJob {
  id: string;
  title: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  startTime: Date;
  endTime: Date;
  jobType?: string;
  status?: string;
  priority?: string;
  address?: string;
  city?: string;
  technicianId?: string;
  technicianName?: string;
  jobNumber?: string;
  job_id?: string;
}

interface JobBlockProps {
  job: CalendarJob;
  onClick?: () => void;
  compact?: boolean;
  showTime?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function JobBlock({
  job,
  onClick,
  compact = false,
  showTime = true,
  className,
  style,
}: JobBlockProps) {
  const colors = useMemo(
    () => getJobColors(job.jobType, job.status),
    [job.jobType, job.status]
  );

  const jobType = normalizeJobType(job.jobType);
  const isUrgent = job.priority === 'high' || job.priority === 'urgent';
  const isCompleted = job.status === 'completed';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timeDisplay = useMemo(() => {
    const start = formatTime(job.startTime);
    const end = formatTime(job.endTime);
    return `${start} - ${end}`;
  }, [job.startTime, job.endTime]);

  // Compact version for dense views
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-md px-2 py-1.5 border-l-4 transition-all',
          'hover:shadow-md active:scale-[0.98] min-h-[48px]',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          isCompleted && 'opacity-60 line-through',
          colors.bgClass,
          colors.textClass,
          className
        )}
        style={{
          borderLeftColor: colors.dot,
          ...style,
        }}
      >
        <div className="flex items-center gap-2">
          {isUrgent && <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />}
          <span className="text-xs font-medium truncate">{job.title}</span>
        </div>
        {showTime && (
          <div className="text-[10px] opacity-75 mt-0.5">{formatTime(job.startTime)}</div>
        )}
      </button>
    );
  }

  // Full version for expanded views
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2 border-l-4 transition-all',
        'hover:shadow-md active:scale-[0.99] min-h-[56px]',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        isCompleted && 'opacity-60',
        className
      )}
      style={{
        backgroundColor: colors.bg,
        borderLeftColor: colors.dot,
        color: colors.text,
        ...style,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isUrgent && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
            <span
              className={cn(
                'text-sm font-semibold truncate',
                isCompleted && 'line-through'
              )}
            >
              {job.title}
            </span>
          </div>

          {job.customerName && (
            <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
              <User className="h-3 w-3 shrink-0" />
              {job.customerId ? (
                <Link
                  href={`/customers/${job.customerId}`}
                  className="truncate underline hover:no-underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {job.customerName}
                </Link>
              ) : (
                <span className="truncate">{job.customerName}</span>
              )}
            </div>
          )}
        </div>

        {job.jobNumber && (
          <span className="text-[10px] font-mono opacity-60 shrink-0">
            #{job.jobNumber}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs opacity-75">
        {showTime && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeDisplay}</span>
          </div>
        )}

        {job.address && (
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.city || job.address}</span>
          </div>
        )}
      </div>

      {/* Job type badge */}
      <div className="mt-2">
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: `${colors.dot}20`,
            color: colors.dot,
          }}
        >
          {jobType.replace(/_/g, ' ')}
        </span>
      </div>
    </button>
  );
}

// Grid-positioned job block for time slot calendar
interface PositionedJobBlockProps extends JobBlockProps {
  gridRow: string;
  gridColumn?: number;
}

export function PositionedJobBlock({
  gridRow,
  gridColumn = 1,
  job,
  onClick,
  className,
}: PositionedJobBlockProps) {
  const colors = useMemo(
    () => getJobColors(job.jobType, job.status),
    [job.jobType, job.status]
  );

  const isCompleted = job.status === 'completed';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute inset-x-1 rounded-md px-2 py-1 text-left transition-all overflow-hidden',
        'hover:shadow-lg hover:z-10 active:scale-[0.99]',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:z-10',
        isCompleted && 'opacity-60',
        className
      )}
      style={{
        gridRow,
        gridColumn,
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.dot}`,
        color: colors.text,
      }}
    >
      <div className="text-xs font-semibold truncate">{job.title}</div>
      <div className="text-[10px] opacity-80 truncate">
        {formatTime(job.startTime)} - {job.customerName || formatTime(job.endTime)}
      </div>
    </button>
  );
}
