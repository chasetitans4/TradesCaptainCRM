'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  RotateCcw,
  PhoneCall,
  Flag,
  X,
  Loader2,
} from 'lucide-react';
import type { Job, Customer, User, WrapUpCompletionStatus } from '@/types';

interface WrapUpJob extends Job {
  customer: Pick<Customer,
    'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'
  >;
  business: { id: string; name: string };
  assigned_user?: Pick<User, 'id' | 'name'> | null;
  arrived_at?: string | null;
}

interface WrapUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: WrapUpJob;
  onConfirm: (data: {
    completion_status: WrapUpCompletionStatus;
    invoice_ready: boolean;
    return_reason?: string;
    return_scheduled_for?: string;
    callback_reason?: string;
    wrapup_started_at: string;
  }) => Promise<void>;
}

type ReturnPreset = 'tomorrow' | 'this_week' | 'next_week' | 'custom';

function getReturnDate(preset: ReturnPreset): string | undefined {
  const now = new Date();
  switch (preset) {
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'this_week': {
      const d = new Date(now);
      // Next business day that's this week (3 days from now, capped at Friday)
      d.setDate(d.getDate() + 3);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) d.setDate(d.getDate() + 1); // Sun → Mon
      if (dayOfWeek === 6) d.setDate(d.getDate() + 2); // Sat → Mon
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'next_week': {
      const d = new Date(now);
      const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    default:
      return undefined;
  }
}

function formatDuration(arrivedAt: string | null): string {
  if (!arrivedAt) return '--';
  const arrival = new Date(arrivedAt);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

export function WrapUpModal({
  open,
  onOpenChange,
  job,
  onConfirm,
}: WrapUpModalProps) {
  const [status, setStatus] = useState<WrapUpCompletionStatus | null>(null);
  const [invoiceReady, setInvoiceReady] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnPreset, setReturnPreset] = useState<ReturnPreset | null>(null);
  const [callbackReason, setCallbackReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedData, setConfirmedData] = useState<{
    completion_status: WrapUpCompletionStatus;
    invoice_ready: boolean;
    job_duration: string;
  } | null>(null);

  // Track when modal opened for analytics
  const [startedAt] = useState(() => new Date().toISOString());

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStatus(null);
      setInvoiceReady(false);
      setReturnReason('');
      setReturnPreset(null);
      setCallbackReason('');
      setIsSubmitting(false);
      setShowConfirmation(false);
      setConfirmedData(null);
    }
  }, [open]);

  // Auto-dismiss confirmation after 3 seconds
  useEffect(() => {
    if (!showConfirmation) return;
    const timer = setTimeout(() => {
      onOpenChange(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showConfirmation, onOpenChange]);

  const haptic = () => navigator.vibrate?.(10);

  const handleStatusSelect = useCallback((newStatus: WrapUpCompletionStatus) => {
    haptic();
    setStatus(newStatus);
    // Reset sub-flow state when switching
    if (newStatus !== 'return_needed') {
      setReturnReason('');
      setReturnPreset(null);
    }
    if (newStatus !== 'callback') {
      setCallbackReason('');
    }
    if (newStatus !== 'completed') {
      setInvoiceReady(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!status) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        completion_status: status,
        invoice_ready: status === 'completed' ? invoiceReady : false,
        return_reason: status === 'return_needed' ? returnReason || undefined : undefined,
        return_scheduled_for: status === 'return_needed' && returnPreset
          ? getReturnDate(returnPreset)
          : undefined,
        callback_reason: status === 'callback' ? callbackReason || undefined : undefined,
        wrapup_started_at: startedAt,
      });

      // Show confirmation screen
      setConfirmedData({
        completion_status: status,
        invoice_ready: status === 'completed' ? invoiceReady : false,
        job_duration: formatDuration(job.arrived_at || null),
      });
      setShowConfirmation(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  const timeOnSite = formatDuration(job.arrived_at || null);

  // Confirmation screen
  if (showConfirmation && confirmedData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="!max-w-none !w-full !h-full !max-h-none !rounded-none !p-0 flex items-center justify-center"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div
            className="text-center px-6 animate-fade-in"
            onClick={() => onOpenChange(false)}
          >
            <div className="p-4 rounded-full bg-success/10 inline-flex mb-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Job Wrapped Up</h2>
            <div className="space-y-1 text-text-muted">
              <p className="font-medium text-text">
                {job.customer?.name} — {job.title || job.service_type}
              </p>
              <p>Duration: {confirmedData.job_duration}</p>
              <p>Status: {
                confirmedData.completion_status === 'completed' ? 'Completed' :
                confirmedData.completion_status === 'return_needed' ? 'Return Needed' :
                'Callback'
              }</p>
              {confirmedData.invoice_ready && <p>Invoice Ready: Yes</p>}
            </div>
            <Button
              variant="outline"
              className="mt-6 h-12 px-8"
              onClick={() => onOpenChange(false)}
            >
              Back to Jobs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main wrap up form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-none !w-full !h-full !max-h-none !rounded-none !p-0 overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flag className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold text-text">Wrap Up</h2>
                <p className="text-sm text-text-muted">
                  {job.customer?.name} — {job.title || job.service_type}
                </p>
              </div>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => onOpenChange(false)}
              aria-label="Cancel"
            >
              <X className="h-5 w-5 text-text-muted" />
            </button>
          </div>
          {/* Time on site */}
          <div className="mt-2 text-sm text-text-muted">
            {timeOnSite !== '--' ? `${timeOnSite} on site` : 'Time on site: --'}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6 pb-32">
          {/* Status selection */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-3">How'd it go?</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Completed */}
              <button
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 p-4 min-h-[80px] transition-all active:scale-[0.97]',
                  status === 'completed'
                    ? 'border-success bg-success text-white shadow-md'
                    : 'border-border bg-card text-text hover:border-success/50'
                )}
                onClick={() => handleStatusSelect('completed')}
              >
                <CheckCircle2 className="h-8 w-8 mb-1" />
                <span className="text-base font-semibold">Completed</span>
              </button>

              {/* Return Needed */}
              <button
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 p-4 min-h-[80px] transition-all active:scale-[0.97]',
                  status === 'return_needed'
                    ? 'border-warning bg-warning text-white shadow-md'
                    : 'border-border bg-card text-text hover:border-warning/50'
                )}
                onClick={() => handleStatusSelect('return_needed')}
              >
                <RotateCcw className="h-8 w-8 mb-1" />
                <span className="text-base font-semibold">Return Needed</span>
              </button>

              {/* Callback */}
              <button
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 p-4 min-h-[80px] transition-all active:scale-[0.97]',
                  status === 'callback'
                    ? 'border-info bg-info text-white shadow-md'
                    : 'border-border bg-card text-text hover:border-info/50'
                )}
                onClick={() => handleStatusSelect('callback')}
              >
                <PhoneCall className="h-8 w-8 mb-1" />
                <span className="text-base font-semibold">Callback</span>
              </button>
            </div>
          </div>

          {/* Return Needed sub-flow */}
          {status === 'return_needed' && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-base font-medium text-text">When should we come back?</h4>
              <div className="grid grid-cols-2 gap-2">
                {(['tomorrow', 'this_week', 'next_week', 'custom'] as ReturnPreset[]).map((preset) => (
                  <button
                    key={preset}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-sm font-medium transition-all active:scale-[0.97]',
                      returnPreset === preset
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-text hover:border-primary/50'
                    )}
                    onClick={() => {
                      haptic();
                      setReturnPreset(preset);
                    }}
                  >
                    {preset === 'tomorrow' ? 'Tomorrow' :
                     preset === 'this_week' ? 'This Week' :
                     preset === 'next_week' ? 'Next Week' :
                     'Custom'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Reason (optional)</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                  placeholder="Waiting on parts, need to schedule..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Callback sub-flow */}
          {status === 'callback' && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-sm text-text-muted mb-1 block">Reason (optional)</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                  placeholder="Customer needs to call back, office follow-up..."
                  value={callbackReason}
                  onChange={(e) => setCallbackReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Divider */}
          {status && <hr className="border-border" />}

          {/* Invoice ready checkbox (completed only) */}
          {status === 'completed' && (
            <label className="flex items-center gap-3 cursor-pointer active:scale-[0.97] transition-transform">
              <input
                type="checkbox"
                checked={invoiceReady}
                onChange={(e) => {
                  haptic();
                  setInvoiceReady(e.target.checked);
                }}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary/50"
              />
              <span className="text-base font-medium text-text">Ready to invoice</span>
            </label>
          )}
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-bottom z-20">
          <Button
            size="lg"
            className={cn(
              'w-full h-14 text-lg font-bold shadow-md',
              status === 'completed' && 'bg-success hover:bg-success/90',
              status === 'return_needed' && 'bg-warning hover:bg-warning/90',
              status === 'callback' && 'bg-info hover:bg-info/90',
              !status && 'bg-muted text-muted-foreground'
            )}
            disabled={!status || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Confirm Wrap Up
              </>
            )}
          </Button>
          <button
            className="w-full mt-2 py-2 text-sm text-text-muted hover:text-text transition-colors"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
