'use client';

/**
 * Job Briefing Card
 *
 * Per CIL Spec Section 2.1:
 * The Job Briefing Card IS the job landing screen when tapping from schedule.
 * Not a separate feature.
 *
 * Question it answers: "What do I need to know before I arrive?"
 *
 * Rendering Strategy: Primary info (customer, address, phone) renders immediately.
 * History, equipment, and nudges may hydrate progressively.
 * This avoids over-optimizing for a single blocking query.
 */

import { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getSmartNavigationUrl } from '@/lib/utils/navigation';
import {
  Phone,
  MapPin,
  Navigation,
  Play,
  Clock,
  Calendar,
  ChevronRight,
  Key,
  Dog,
  AlertTriangle,
  FileText,
  Star,
  UserPlus,
} from 'lucide-react';

/**
 * Job briefing data structure
 */
export interface JobBriefingData {
  job: {
    id: string;
    title: string;
    type: string;
    status: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    description?: string;
  };
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
    accessNotes?: string;
    internalNotes?: string;
    tags?: string[];
    tier?: string;
  };
  alerts: JobBriefingAlert[];
  history: JobHistoryItem[];
  equipment?: EquipmentItem[];
  agreement?: {
    id: string;
    name: string;
    status: 'active' | 'expiring' | 'expired';
    nextServiceDate?: string;
    expiresAt?: string;
  };
  outstandingBalance?: number;
}

export interface JobBriefingAlert {
  type: 'access_code' | 'pet' | 'payment' | 'office_note' | 'vip' | 'first_visit';
  icon: string;
  label: string;
  value?: string;
}

export interface JobHistoryItem {
  id: string;
  date: string;
  type: string;
  summary?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  age?: number;
}

interface JobBriefingCardProps {
  data: JobBriefingData;
  onStartJob?: () => void;
  onCallCustomer?: () => void;
  className?: string;
}

/**
 * Format phone number for display
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Format scheduled time range
 */
function formatTimeRange(start?: string, end?: string): string {
  if (!start) return 'Not scheduled';

  const startDate = new Date(start);
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (end) {
    const endDate = new Date(end);
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${startTime} - ${endTime}`;
  }

  return startTime;
}

/**
 * Format date for history items
 */
function formatHistoryDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get full address string
 */
function getFullAddress(customer: JobBriefingData['customer']): string {
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Alert badge component
 */
function AlertBadge({ alert }: { alert: JobBriefingAlert }) {
  const iconMap: Record<string, React.ReactNode> = {
    access_code: <Key className="h-3.5 w-3.5" />,
    pet: <Dog className="h-3.5 w-3.5" />,
    payment: <AlertTriangle className="h-3.5 w-3.5" />,
    office_note: <FileText className="h-3.5 w-3.5" />,
    vip: <Star className="h-3.5 w-3.5" />,
    first_visit: <UserPlus className="h-3.5 w-3.5" />,
  };

  const colorMap: Record<string, string> = {
    access_code: 'bg-info/10 text-info border-info/20',
    pet: 'bg-warning/10 text-warning border-warning/20',
    payment: 'bg-danger/10 text-danger border-danger/20',
    office_note: 'bg-muted text-text-muted border-border',
    vip: 'bg-primary/10 text-primary border-primary/20',
    first_visit: 'bg-success/10 text-success border-success/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        colorMap[alert.type] || 'bg-muted text-text-muted'
      )}
    >
      {iconMap[alert.type]}
      <span>{alert.value || alert.label}</span>
    </div>
  );
}

/**
 * Job Briefing Card Component
 */
export function JobBriefingCard({
  data,
  onStartJob,
  onCallCustomer,
  className,
}: JobBriefingCardProps) {
  const { job, customer, alerts, history, agreement, outstandingBalance } = data;

  const fullAddress = getFullAddress(customer);
  const mapsUrl = getSmartNavigationUrl(
    fullAddress,
    customer.latitude,
    customer.longitude
  );

  const handleCall = useCallback(() => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
    onCallCustomer?.();
  }, [customer.phone, onCallCustomer]);

  const handleDirections = useCallback(() => {
    window.open(mapsUrl, '_blank');
  }, [mapsUrl]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Info - Renders Immediately */}
      <div className="bg-background rounded-xl border border-border p-4 space-y-4">
        {/* Customer Name & Job Type */}
        <div>
          <Link
            href={`/customers/${customer.id}`}
            className="text-lg font-semibold text-text hover:text-primary transition-colors"
          >
            {customer.name}
          </Link>
          <p className="text-sm text-text-muted mt-0.5">{job.type}</p>
        </div>

        {/* Address - Tap to Maps */}
        {fullAddress && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 -mx-1 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            <MapPin className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
            <span className="text-sm text-text">{fullAddress}</span>
          </a>
        )}

        {/* Phone - Tap to Call */}
        {customer.phone && (
          <button
            onClick={handleCall}
            className="flex items-center gap-3 p-3 -mx-1 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] w-full text-left"
          >
            <Phone className="h-5 w-5 text-text-muted shrink-0" />
            <span className="text-sm text-text">{formatPhone(customer.phone)}</span>
          </button>
        )}

        {/* Scheduled Time */}
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
          <Clock className="h-5 w-5 text-text-muted shrink-0" />
          <span className="text-sm text-text">
            {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
          </span>
        </div>
      </div>

      {/* Conditional Alerts - Show only when conditions true */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert, index) => (
            <AlertBadge key={`${alert.type}-${index}`} alert={alert} />
          ))}
        </div>
      )}

      {/* Service History - Hydrates progressively */}
      <Suspense fallback={<HistorySkeleton />}>
        {history.length > 0 ? (
          <div className="bg-background rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-text-muted mb-3">
              Service History
            </h3>
            <div className="space-y-2">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-muted">
                    {formatHistoryDate(item.date)}
                  </span>
                  <span className="text-text">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Suspense>

      {/* Maintenance Agreement Status */}
      {agreement && (
        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-text">{agreement.name}</h3>
              {agreement.status === 'expiring' && agreement.expiresAt && (
                <p className="text-xs text-warning mt-1">
                  Expires: {new Date(agreement.expiresAt).toLocaleDateString()}
                </p>
              )}
              {agreement.status === 'active' && agreement.nextServiceDate && (
                <p className="text-xs text-text-muted mt-1">
                  Next service: {new Date(agreement.nextServiceDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <Link
              href={`/agreements/${agreement.id}`}
              className="text-xs text-text-muted hover:text-primary"
            >
              View details →
            </Link>
          </div>
        </div>
      )}

      {/* Nudge Zone - Max 2, below history, above actions */}
      {/* Nudge zone will be added via JobBriefingNudgeZone component */}

      {/* Primary Actions */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onStartJob}
          className="w-full min-h-[50px] text-base font-medium"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Start Job
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleCall}
            className="min-h-[50px]"
            disabled={!customer.phone}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call
          </Button>
          <Button
            variant="outline"
            onClick={handleDirections}
            className="min-h-[50px]"
          >
            <Navigation className="h-5 w-5 mr-2" />
            Directions
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for history section
 */
function HistorySkeleton() {
  return (
    <div className="bg-background rounded-xl border border-border p-4 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Generate alerts from customer/job data
 */
export function generateBriefingAlerts(
  customer: JobBriefingData['customer'],
  historyCount: number,
  outstandingBalance?: number
): JobBriefingAlert[] {
  const alerts: JobBriefingAlert[] = [];

  // Access code
  if (customer.accessNotes) {
    const codeMatch = customer.accessNotes.match(/\b(\d{4,6})\b/);
    if (codeMatch) {
      alerts.push({
        type: 'access_code',
        icon: '🔑',
        label: 'Access code',
        value: `Code: ${codeMatch[1]}`,
      });
    }
  }

  // Pet warning
  if (customer.tags?.includes('has_dog') || customer.tags?.includes('has_pet')) {
    alerts.push({
      type: 'pet',
      icon: '🐕',
      label: 'Has dog',
    });
  }

  // Outstanding payment
  if (outstandingBalance && outstandingBalance > 0) {
    alerts.push({
      type: 'payment',
      icon: '⚠️',
      label: 'Outstanding balance',
      value: `Outstanding: $${outstandingBalance.toFixed(0)}`,
    });
  }

  // Office note
  if (customer.internalNotes) {
    const preview = customer.internalNotes.substring(0, 50);
    alerts.push({
      type: 'office_note',
      icon: '📝',
      label: 'Office note',
      value: preview + (customer.internalNotes.length > 50 ? '...' : ''),
    });
  }

  // VIP
  if (customer.tier === 'vip') {
    alerts.push({
      type: 'vip',
      icon: '⭐',
      label: 'VIP Customer',
    });
  }

  // First visit
  if (historyCount === 0) {
    alerts.push({
      type: 'first_visit',
      icon: '🆕',
      label: 'First visit',
    });
  }

  return alerts;
}
