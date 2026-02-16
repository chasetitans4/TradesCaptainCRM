'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import type { JobStatus } from '@/types';
import {
  Play,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  MessageSquare,
  XCircle,
  Loader2,
  ArrowRight,
  Navigation,
  X,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: JobStatus;
  customer?: {
    name?: string;
    phone?: string;
    address_line1?: string | null;
    city?: string | null;
  } | null;
}

interface JobQuickActionsProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (newStatus: JobStatus) => void;
}

const STATUS_TRANSITIONS: Record<JobStatus, { label: string; icon: React.ReactNode; action: string }[]> = {
  scheduled: [
    { label: 'Start Job', icon: <Play className="h-5 w-5" />, action: 'start' },
  ],
  on_way: [
    { label: 'Start Job', icon: <Play className="h-5 w-5" />, action: 'start' },
  ],
  in_progress: [
    { label: 'Complete Job', icon: <CheckCircle2 className="h-5 w-5" />, action: 'complete' },
  ],
  completed: [],
  return_needed: [],
  callback: [],
  cancelled: [],
  no_show: [],
};

const STATUS_COLORS: Record<string, string> = {
  start: 'bg-blue-500 hover:bg-blue-600',
  complete: 'bg-green-500 hover:bg-green-600',
  cancel: 'bg-red-500 hover:bg-red-600',
};

export function JobQuickActions({ job, open, onOpenChange, onStatusChange }: JobQuickActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const transitions = STATUS_TRANSITIONS[job.status] || [];

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const response = await fetch(`/api/dispatch/jobs/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: action === 'start'
            ? 'Job started successfully'
            : action === 'complete'
              ? 'Job completed successfully'
              : 'Job status updated',
        });

        // Determine new status based on action
        const newStatus: JobStatus = action === 'start' ? 'in_progress' :
                                      action === 'complete' ? 'completed' :
                                      job.status;
        onStatusChange?.(newStatus);
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update job status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: 'Error',
        description: 'Failed to update job status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const getNavigationUrl = () => {
    if (!job.customer?.address_line1) return null;
    const address = encodeURIComponent(
      `${job.customer.address_line1}${job.customer.city ? `, ${job.customer.city}` : ''}`
    );
    // Use Google Maps on all platforms for best compatibility
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  const navigationUrl = getNavigationUrl();

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold truncate">{job.title}</h3>
            {job.customer?.name && (
              <p className="text-sm text-text-muted">{job.customer.name}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Contact Actions */}
        <div className="grid grid-cols-3 gap-2">
          {job.customer?.phone && (
            <a
              href={`tel:${job.customer.phone}`}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-muted">Call</span>
            </a>
          )}
          {job.customer?.phone && (
            <a
              href={`sms:${job.customer.phone}`}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-muted">Text</span>
            </a>
          )}
          {navigationUrl && (
            <a
              href={navigationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Navigation className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-muted">Navigate</span>
            </a>
          )}
        </div>

        {/* Status Actions */}
        {transitions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-muted">Quick Actions</h4>
            {transitions.map((transition) => (
              <Button
                key={transition.action}
                onClick={() => handleAction(transition.action)}
                disabled={loading !== null}
                className={cn(
                  'w-full h-14 text-base font-medium text-white',
                  STATUS_COLORS[transition.action] || 'bg-primary hover:bg-primary/90'
                )}
              >
                {loading === transition.action ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <span className="mr-2">{transition.icon}</span>
                )}
                {transition.label}
                <ArrowRight className="h-5 w-5 ml-auto" />
              </Button>
            ))}
          </div>
        )}

        {/* Current Status */}
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-text-muted">
          <Clock className="h-4 w-4" />
          <span>
            Current status: <span className="font-medium text-text capitalize">{job.status.replace('_', ' ')}</span>
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}

// Compact quick action buttons for inline use
interface QuickStatusButtonProps {
  job: Job;
  onStatusChange?: (newStatus: JobStatus) => void;
  className?: string;
}

export function QuickStatusButton({ job, onStatusChange, className }: QuickStatusButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleQuickAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const action = job.status === 'scheduled' ? 'start' :
                   job.status === 'in_progress' ? 'complete' : null;

    if (!action) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/dispatch/jobs/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: action === 'start'
            ? 'Job started'
            : 'Job completed',
        });

        const newStatus: JobStatus = action === 'start' ? 'in_progress' : 'completed';
        onStatusChange?.(newStatus);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for actionable statuses
  if (job.status !== 'scheduled' && job.status !== 'in_progress') {
    return null;
  }

  const isStart = job.status === 'scheduled';

  return (
    <button
      onClick={handleQuickAction}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-colors',
        isStart ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600',
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isStart ? (
        <Play className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {isStart ? 'Start' : 'Complete'}
    </button>
  );
}
