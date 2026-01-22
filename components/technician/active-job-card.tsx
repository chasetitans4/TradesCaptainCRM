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
  CheckCircle2,
  Clock,
  MapPin,
  User as UserIcon,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface TechJob extends Job {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'>;
  business: { id: string; name: string; phone?: string };
  assigned_user?: Pick<User, 'id' | 'name'> | null;
  invoice_id?: string | null;
}

interface ActiveJobCardProps {
  job: TechJob;
  onOnMyWay: () => void;
  onStartJob: () => void;
  onCompleteJob: () => void;
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
  no_show: {
    label: 'No Show',
    color: 'bg-muted/50 text-muted-foreground border-muted/20',
    bgGradient: 'from-muted/5 to-muted/10',
  },
};

export function ActiveJobCard({
  job,
  onOnMyWay,
  onStartJob,
  onCompleteJob,
}: ActiveJobCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
            className="w-full h-14 text-lg font-semibold bg-blue-500 hover:bg-blue-600"
            onClick={async () => {
              setIsLoading(true);
              await onOnMyWay();
              setIsLoading(false);
            }}
          >
            <Car className="h-6 w-6 mr-2" />
            I'M ON MY WAY
          </Button>
        );

      case 'on_way':
        return (
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-warning hover:bg-warning/90"
            onClick={async () => {
              setIsLoading(true);
              await onStartJob();
              setIsLoading(false);
            }}
          >
            <Play className="h-6 w-6 mr-2" />
            START JOB
          </Button>
        );

      case 'in_progress':
        return (
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-success hover:bg-success/90"
            onClick={async () => {
              setIsLoading(true);
              await onCompleteJob();
              setIsLoading(false);
            }}
          >
            <CheckCircle2 className="h-6 w-6 mr-2" />
            COMPLETE JOB
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

  return (
    <div
      className={cn(
        'card border-2 overflow-hidden',
        config.color.split(' ')[2] // border color
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 bg-gradient-to-br',
          config.bgGradient
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('shrink-0', config.color)}>
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

        {/* Quick Contact Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10"
            onClick={() => window.open(`tel:${job.customer.phone}`)}
            disabled={!job.customer.phone}
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10"
            onClick={() => window.open(`sms:${job.customer.phone}`)}
            disabled={!job.customer.phone}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10"
            onClick={() => {
              const encodedAddress = encodeURIComponent(fullAddress);
              window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
            }}
            disabled={!fullAddress}
          >
            <Navigation className="h-4 w-4 mr-1.5" />
            Navigate
          </Button>
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
        className="w-full px-4 py-2 flex items-center justify-center gap-1 text-sm text-text-muted hover:bg-muted/30 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
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
        <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2">
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
        </div>
      )}

      {/* Action Button */}
      {getActionButton() && (
        <div className="p-4 border-t border-border">
          {getActionButton()}
        </div>
      )}
    </div>
  );
}
