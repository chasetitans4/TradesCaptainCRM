'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddressLink } from '@/components/ui/address-link';
import { CalendarJob } from './job-block';
import { getJobColors, normalizeJobType } from '@/lib/calendar/colors';
import {
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  FileText,
  Calendar,
  AlertCircle,
  Navigation,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsSheetProps {
  job: CalendarJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkComplete?: (jobId: string) => void;
  onReschedule?: (job: CalendarJob) => void;
  onStartJob?: (jobId: string) => void;
}

export function QuickActionsSheet({
  job,
  open,
  onOpenChange,
  onMarkComplete,
  onReschedule,
  onStartJob,
}: QuickActionsSheetProps) {
  if (!job) return null;

  const colors = getJobColors(job.jobType, job.status);
  const jobType = normalizeJobType(job.jobType);
  const isCompleted = job.status === 'completed';
  const isInProgress = job.status === 'in_progress';
  const isUrgent = job.priority === 'high' || job.priority === 'urgent';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const timeDisplay = `${formatTime(job.startTime)} - ${formatTime(job.endTime)}`;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Job Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-1 h-16 rounded-full shrink-0"
            style={{ backgroundColor: colors.dot }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isUrgent && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
              <h3 className={cn('font-semibold text-lg', isCompleted && 'line-through opacity-60')}>
                {job.title}
              </h3>
            </div>
            {job.customerName && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <User className="h-3.5 w-3.5" />
                {job.customerName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${colors.dot}20`,
                  color: colors.dot,
                }}
              >
                {jobType.replace(/_/g, ' ')}
              </Badge>
              {job.jobNumber && (
                <span className="text-xs text-muted-foreground font-mono">
                  #{job.jobNumber}
                </span>
              )}
              {job.status && (
                <Badge
                  variant={
                    job.status === 'completed'
                      ? 'default'
                      : job.status === 'in_progress'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs capitalize"
                >
                  {job.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(job.startTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{timeDisplay}</span>
          </div>
          {(job.address || job.city) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{job.address || job.city}</span>
            </div>
          )}
          {job.technicianName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Assigned to {job.technicianName}</span>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Call Customer */}
          {job.customerPhone && (
            <a
              href={`tel:${job.customerPhone}`}
              className="flex items-center justify-center gap-2 h-14 rounded-xl bg-green-50 text-green-700 font-medium transition-colors hover:bg-green-100 active:scale-[0.98]"
            >
              <Phone className="h-5 w-5" />
              <span>Call</span>
            </a>
          )}

          {/* Navigate */}
          {job.address && (
            <AddressLink
              address={job.address}
              city={job.city}
              className="flex items-center justify-center gap-2 h-14 rounded-xl bg-blue-50 text-blue-700 font-medium transition-colors hover:bg-blue-100 active:scale-[0.98]"
            >
              <Navigation className="h-5 w-5" />
              <span>Navigate</span>
            </AddressLink>
          )}

          {/* Message */}
          {job.customerPhone && (
            <a
              href={`sms:${job.customerPhone}`}
              className="flex items-center justify-center gap-2 h-14 rounded-xl bg-purple-50 text-purple-700 font-medium transition-colors hover:bg-purple-100 active:scale-[0.98]"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Message</span>
            </a>
          )}

          {/* Reschedule */}
          {!isCompleted && onReschedule && (
            <button
              onClick={() => {
                onReschedule(job);
                onOpenChange(false);
              }}
              className="flex items-center justify-center gap-2 h-14 rounded-xl bg-amber-50 text-amber-700 font-medium transition-colors hover:bg-amber-100 active:scale-[0.98]"
            >
              <Clock className="h-5 w-5" />
              <span>Reschedule</span>
            </button>
          )}
        </div>

        {/* Status Actions */}
        <div className="space-y-2 pt-2 border-t border-border">
          {!isCompleted && !isInProgress && onStartJob && (
            <Button
              variant="outline"
              className="w-full h-12 justify-start gap-3"
              onClick={() => {
                onStartJob(job.id);
                onOpenChange(false);
              }}
            >
              <ArrowRight className="h-5 w-5 text-blue-500" />
              <span>Start Job</span>
            </Button>
          )}

          {!isCompleted && onMarkComplete && (
            <Button
              variant="outline"
              className="w-full h-12 justify-start gap-3"
              onClick={() => {
                onMarkComplete(job.id);
                onOpenChange(false);
              }}
            >
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Mark Complete</span>
            </Button>
          )}

          {/* View Details */}
          <Link
            href={`/jobs/${job.job_id || job.id}`}
            className="flex items-center justify-start gap-3 w-full h-12 px-4 rounded-md border border-border transition-colors hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">View Full Details</span>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </Link>
        </div>

        {/* Cancel Button */}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    </BottomSheet>
  );
}

// Compact quick actions for desktop hover/click
interface QuickActionsPopoverProps {
  job: CalendarJob;
  onClose: () => void;
  onMarkComplete?: (jobId: string) => void;
  className?: string;
}

export function QuickActionsPopover({
  job,
  onClose,
  onMarkComplete,
  className,
}: QuickActionsPopoverProps) {
  const isCompleted = job.status === 'completed';

  return (
    <div
      className={cn(
        'bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px]',
        className
      )}
    >
      <div className="space-y-1">
        {job.customerPhone && (
          <a
            href={`tel:${job.customerPhone}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm"
          >
            <Phone className="h-4 w-4 text-green-500" />
            Call Customer
          </a>
        )}

        {job.address && (
          <AddressLink
            address={job.address}
            city={job.city}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm w-full text-left"
          >
            <Navigation className="h-4 w-4 text-blue-500" />
            Navigate
          </AddressLink>
        )}

        {!isCompleted && onMarkComplete && (
          <button
            onClick={() => {
              onMarkComplete(job.id);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm w-full text-left"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Mark Complete
          </button>
        )}

        <Link
          href={`/jobs/${job.job_id || job.id}`}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm"
          onClick={onClose}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          View Details
        </Link>
      </div>
    </div>
  );
}
