'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Job, Customer, User } from '@/types';
import {
  Phone,
  MessageSquare,
  Navigation,
  Car,
  Play,
  Flag,
  Clock,
  MapPin,
  User as UserIcon,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Dog,
  KeyRound,
  ParkingCircle,
  Wrench,
} from 'lucide-react';
import { SwipeActions } from '@/components/mobile/swipe-actions';
import { WorkflowStepper } from './workflow-stepper';
import { JobChecklist } from './job-checklist';
import { CustomerHistory } from './customer-history';

export interface TechJob extends Job {
  customer: Pick<Customer,
    'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'
    | 'gate_code' | 'has_dog' | 'dog_info' | 'access_notes' | 'parking_notes'
    | 'latitude' | 'longitude'
  >;
  business: { id: string; name: string; phone?: string };
  assigned_user?: Pick<User, 'id' | 'name'> | null;
  invoice_id?: string | null;
}

interface ActiveJobCardProps {
  job: TechJob;
  userId?: string;
  onOnMyWay: () => void;
  onStartJob: () => void;
  onWrapUp: () => void;
  onRunningLate?: () => void;
  onPartsUsed?: () => void;
}

const STATUS_CONFIG = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-info/10 text-info border-info/20',
    bgGradient: 'from-info/5 to-info/10',
  },
  on_way: {
    label: 'On My Way',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    bgGradient: 'from-blue-500/5 to-blue-500/10',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-warning/10 text-warning border-warning/20',
    bgGradient: 'from-warning/5 to-warning/10',
  },
  completed: {
    label: 'Completed',
    color: 'bg-success/10 text-success border-success/20',
    bgGradient: 'from-success/5 to-success/10',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-danger/10 text-danger border-danger/20',
    bgGradient: 'from-danger/5 to-danger/10',
  },
  return_needed: {
    label: 'Return Needed',
    color: 'bg-warning/10 text-warning border-warning/20',
    bgGradient: 'from-warning/5 to-warning/10',
  },
  callback: {
    label: 'Callback',
    color: 'bg-info/10 text-info border-info/20',
    bgGradient: 'from-info/5 to-info/10',
  },
  no_show: {
    label: 'No Show',
    color: 'bg-muted/50 text-muted-foreground border-muted/20',
    bgGradient: 'from-muted/5 to-muted/10',
  },
};

export function ActiveJobCard({
  job,
  userId,
  onOnMyWay,
  onStartJob,
  onWrapUp,
  onRunningLate,
  onPartsUsed,
}: ActiveJobCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const haptic = () => navigator.vibrate?.(10);

  const status = job.status as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  // Determine which action button to show
  const getActionButton = () => {
    if (isLoading) {
      return (
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          disabled
        >
          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          Working...
        </Button>
      );
    }

    switch (status) {
      case 'scheduled':
        return (
          <Button
            size="lg"
            className="w-full h-20 text-xl font-bold bg-blue-500 hover:bg-blue-600 shadow-md"
            onClick={async () => {
              haptic();
              setIsLoading(true);
              await onOnMyWay();
              setIsLoading(false);
            }}
          >
            <Car className="h-8 w-8 mr-3" />
            I'M ON MY WAY
          </Button>
        );

      case 'on_way':
        return (
          <div className="space-y-3">
            {onRunningLate && (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 text-lg font-medium text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={onRunningLate}
              >
                <Clock className="h-6 w-6 mr-2" />
                RUNNING LATE
              </Button>
            )}
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold bg-warning hover:bg-warning/90 shadow-md"
              onClick={async () => {
                haptic();
                setIsLoading(true);
                await onStartJob();
                setIsLoading(false);
              }}
            >
              <Play className="h-8 w-8 mr-3" />
              START JOB
            </Button>
          </div>
        );

      case 'in_progress':
        return (
          <Button
            size="lg"
            className="w-full h-20 text-xl font-bold bg-success hover:bg-success/90 shadow-md"
            onClick={() => {
              haptic();
              onWrapUp();
            }}
          >
            <Flag className="h-8 w-8 mr-3" />
            WRAP UP
          </Button>
        );

      default:
        return null;
    }
  };

  const fullAddress = [
    job.customer.address_line1,
    job.customer.city,
    job.customer.state,
    job.customer.zip,
  ]
    .filter(Boolean)
    .join(', ');

  const swipeRightActions = job.customer.phone
    ? [{ icon: Phone, label: 'Call', color: 'success' as const, onClick: () => window.open(`tel:${job.customer.phone}`) }]
    : [];

  const swipeLeftActions = fullAddress
    ? [{ icon: Navigation, label: 'Navigate', color: 'info' as const, onClick: () => window.open(`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`, '_blank') }]
    : [];

  return (
    <SwipeActions rightActions={swipeRightActions} leftActions={swipeLeftActions}>
    <div
      className={cn(
        'card border-2 overflow-hidden animate-slide-up transition-all duration-300 ease-out',
        config.color.split(' ')[2] // border color
      )}
    >
      {/* Workflow Progress Stepper */}
      {!['completed', 'cancelled', 'no_show'].includes(status) && (
        <WorkflowStepper status={status} />
      )}

      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 bg-gradient-to-br transition-all duration-300 ease-out',
          config.bgGradient
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('shrink-0 transition-colors duration-300', config.color)}>
                {config.label}
              </Badge>
              {job.price && (
                <Badge variant="outline" className="shrink-0">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {job.price.toLocaleString()}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-text truncate">
              {job.title || 'Service Call'}
            </h2>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-full bg-primary/10">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text truncate">
              {job.customer.name}
            </p>
            <p className="text-sm text-text-muted">{job.customer.phone}</p>
          </div>
        </div>

        {/* Address */}
        {fullAddress && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-muted/50">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-text">{job.customer.address_line1}</p>
              <p className="text-sm text-text-muted">
                {job.customer.city}, {job.customer.state} {job.customer.zip}
              </p>
            </div>
          </div>
        )}

        {/* Access & Site Alerts */}
        {(job.customer.has_dog || job.customer.gate_code || job.customer.access_notes || job.customer.parking_notes) && (
          <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
            {job.customer.has_dog && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Dog className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  Dog on site{job.customer.dog_info ? `: ${job.customer.dog_info}` : ''}
                </span>
              </div>
            )}
            {job.customer.gate_code && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <KeyRound className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  Gate code: <span className="font-mono font-bold">{job.customer.gate_code}</span>
                </span>
              </div>
            )}
            {job.customer.access_notes && (
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-sm">{job.customer.access_notes}</span>
              </div>
            )}
            {job.customer.parking_notes && (
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <ParkingCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-sm">{job.customer.parking_notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Contact Buttons - Large Tiles */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            className="flex flex-col items-center justify-center h-24 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => window.open(`tel:${job.customer.phone}`)}
            disabled={!job.customer.phone}
          >
            <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-1.5">
              <Phone className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-foreground">Call</span>
          </button>
          
          <button
            className="flex flex-col items-center justify-center h-24 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => window.open(`sms:${job.customer.phone}`)}
            disabled={!job.customer.phone}
          >
            <div className="p-2.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-1.5">
              <MessageSquare className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-foreground">Text</span>
          </button>

          <button
            className="flex flex-col items-center justify-center h-24 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => {
              const encodedAddress = encodeURIComponent(fullAddress);
              window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
            }}
            disabled={!fullAddress}
          >
            <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Navigation className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-foreground">Navigate</span>
          </button>
        </div>
      </div>

      {/* Scheduled Time */}
      {job.scheduled_time && (
        <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-text-muted">
            Scheduled for{' '}
            <span className="font-medium text-text">{job.scheduled_time}</span>
          </span>
        </div>
      )}

      {/* Expandable Details */}
      <button
        className="w-full px-4 py-4 flex items-center justify-center gap-2 text-base font-medium text-text-muted hover:bg-muted/30 transition-colors active:bg-muted/50"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? (
          <>
            <ChevronUp className="h-5 w-5" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="h-5 w-5" />
            Show Details
          </>
        )}
      </button>

      <div className={`expandable ${showDetails ? 'open' : ''}`}>
        <div className="border-t border-border bg-muted/20">
          <div className="px-4 py-3 space-y-2">
            {job.description && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-text">{job.description}</p>
              </div>
            )}
            {job.tech_notes && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Tech Notes
                </p>
                <p className="text-sm text-text">{job.tech_notes}</p>
              </div>
            )}
            {!job.description && !job.tech_notes && (
              <p className="text-sm text-text-muted text-center py-2">
                No additional details
              </p>
            )}

            {/* Parts Used button (in_progress only) */}
            {status === 'in_progress' && onPartsUsed && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={onPartsUsed}
              >
                <Wrench className="h-4 w-4 mr-1.5" />
                Log Parts Used
              </Button>
            )}
          </div>

          {/* Pre-Job Checklist */}
          {userId && ['scheduled', 'on_way', 'in_progress'].includes(status) && (
            <JobChecklist
              jobId={job.id}
              businessId={job.business.id}
              userId={userId}
            />
          )}

          {/* Customer History */}
          <CustomerHistory
            customerId={job.customer.id}
            currentJobId={job.id}
          />
        </div>
      </div>

      {/* Action Button */}
      {getActionButton() && (
        <div className="p-4 border-t border-border">
          {getActionButton()}
        </div>
      )}
    </div>
    </SwipeActions>
  );
}
