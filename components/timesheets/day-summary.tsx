'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Briefcase,
  Car,
  Coffee,
  AlertTriangle,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * Time entry for editing
 */
interface TimeEntry {
  id: string;
  type: 'work' | 'travel' | 'break';
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  jobId?: string;
  jobTitle?: string;
  editable: boolean;
}

/**
 * Day summary data
 */
export interface DaySummaryData {
  /** Total time worked today */
  totalMinutes: number;
  /** Work time (on job) */
  workMinutes: number;
  /** Travel time */
  travelMinutes: number;
  /** Break time */
  breakMinutes: number;
  /** Jobs completed */
  jobsCompleted: number;
  /** Jobs still in progress */
  jobsInProgress: number;
  /** Individual time entries */
  entries?: TimeEntry[];
  /** Mileage (if tracked) */
  mileage?: number;
}

interface DaySummaryProps {
  /** Summary data */
  data: DaySummaryData;
  /** Callback to confirm and clock out */
  onConfirm: () => void;
  /** Callback to edit a time entry */
  onEditEntry?: (entryId: string, newDuration: number) => void;
  /** Whether confirm is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * End-of-Day Summary Component
 *
 * Per Design Constitution Section 3.14.5:
 *
 * Before final clock out, show summary:
 * - Total Time: 8h 32m
 * - ├─ Work: 7h 15m
 * - ├─ Travel: 1h 02m
 * - └─ Breaks: 0h 45m
 * - Jobs Completed: 4
 * - Jobs In Progress: 1
 *
 * Features:
 * - Show at end of day (after last job or 5pm)
 * - Display: Total hours, jobs completed, mileage
 * - Allow quick edit of time entries
 * - One-tap submit
 */
export function DaySummary({
  data,
  onConfirm,
  onEditEntry,
  isLoading = false,
  className,
}: DaySummaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={cn(
        'bg-background rounded-xl border border-border overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border">
        <h2 className="font-semibold text-text">End of Day Summary</h2>
      </div>

      {/* Time Breakdown */}
      <div className="p-4 space-y-4">
        {/* Total Time */}
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Total Time:</span>
          <span className="text-xl font-bold text-text">
            {formatTime(data.totalMinutes)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="pl-4 space-y-2 border-l-2 border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-text-muted">Work:</span>
            </div>
            <span className="font-medium text-text">{formatTime(data.workMinutes)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-info" />
              <span className="text-text-muted">Travel:</span>
            </div>
            <span className="font-medium text-text">{formatTime(data.travelMinutes)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-warning" />
              <span className="text-text-muted">Breaks:</span>
            </div>
            <span className="font-medium text-text">{formatTime(data.breakMinutes)}</span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Jobs Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <p className="text-2xl font-bold text-success">{data.jobsCompleted}</p>
            <p className="text-xs text-success/80">Jobs Completed</p>
          </div>
          {data.jobsInProgress > 0 && (
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <p className="text-2xl font-bold text-warning">{data.jobsInProgress}</p>
              <p className="text-xs text-warning/80">Still In Progress</p>
            </div>
          )}
          {data.mileage !== undefined && (
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-text">{data.mileage}</p>
              <p className="text-xs text-text-muted">Miles</p>
            </div>
          )}
        </div>

        {/* Warning for in-progress jobs */}
        {data.jobsInProgress > 0 && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">
                {data.jobsInProgress} job{data.jobsInProgress > 1 ? 's' : ''} still in progress
              </p>
              <p className="text-warning/80 text-xs mt-0.5">
                Mark complete or leave open?
              </p>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        {data.entries && data.entries.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-sm text-primary"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Details
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-2">
                {data.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {entry.type === 'work' && <Briefcase className="h-3 w-3 text-primary" />}
                      {entry.type === 'travel' && <Car className="h-3 w-3 text-info" />}
                      {entry.type === 'break' && <Coffee className="h-3 w-3 text-warning" />}
                      <span className="text-text-muted">
                        {entry.jobTitle || entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">
                        {formatTime(entry.duration)}
                      </span>
                      {entry.editable && onEditEntry && (
                        <button
                          onClick={() => setEditingEntry(entry.id)}
                          className="p-1 text-text-muted hover:text-text"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Button - 50px per Constitution */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full h-[50px] text-base font-semibold"
        >
          {isLoading ? (
            <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Confirm & Clock Out
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to calculate day summary from time entries
 */
export function useDaySummary(entries: TimeEntry[]): DaySummaryData {
  let workMinutes = 0;
  let travelMinutes = 0;
  let breakMinutes = 0;
  const jobIds = new Set<string>();
  const inProgressJobs = new Set<string>();

  entries.forEach((entry) => {
    switch (entry.type) {
      case 'work':
        workMinutes += entry.duration;
        if (entry.jobId) {
          if (entry.endTime) {
            jobIds.add(entry.jobId);
          } else {
            inProgressJobs.add(entry.jobId);
          }
        }
        break;
      case 'travel':
        travelMinutes += entry.duration;
        break;
      case 'break':
        breakMinutes += entry.duration;
        break;
    }
  });

  return {
    totalMinutes: workMinutes + travelMinutes + breakMinutes,
    workMinutes,
    travelMinutes,
    breakMinutes,
    jobsCompleted: jobIds.size,
    jobsInProgress: inProgressJobs.size,
    entries,
  };
}

/**
 * Compact day summary for dashboard cards
 */
export function DaySummaryCompact({
  data,
  className,
}: {
  data: DaySummaryData;
  className?: string;
}) {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-text-muted" />
        <span className="font-medium">{formatTime(data.totalMinutes)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Briefcase className="h-4 w-4 text-success" />
        <span>{data.jobsCompleted} done</span>
      </div>
      {data.mileage !== undefined && (
        <div className="flex items-center gap-1.5">
          <Car className="h-4 w-4 text-info" />
          <span>{data.mileage} mi</span>
        </div>
      )}
    </div>
  );
}
