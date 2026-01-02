'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone,
  Mail,
  Building2,
  MapPin,
  MessageSquare,
  Calendar,
  User,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';
import type { OutreachContact } from '@/types/outreach';

interface ContactCardProps {
  contact: OutreachContact;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  replied: 'bg-indigo-100 text-indigo-700',
  qualifying: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  call_scheduled: 'bg-amber-100 text-amber-700',
  call_completed: 'bg-teal-100 text-teal-700',
  converted: 'bg-emerald-100 text-emerald-700',
  unqualified: 'bg-red-100 text-red-700',
  opted_out: 'bg-gray-100 text-gray-500',
  pending_admin: 'bg-orange-100 text-orange-700',
};

const sourceLabels: Record<string, string> = {
  WEBSITE: 'Website',
  SMS_WIDGET: 'SMS Widget',
  REFERRAL: 'Referral',
  INBOUND_CALL: 'Inbound Call',
  COLD_EMAIL: 'Cold Email',
  MANUAL: 'Manual',
};

export function ContactCard({
  contact,
  onClick,
  selected,
  compact,
}: ContactCardProps) {
  const initials = contact.name
    ? contact.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const InterestIcon =
    contact.interest_level === 'hot'
      ? Flame
      : contact.interest_level === 'warm'
      ? Thermometer
      : Snowflake;

  const interestColor =
    contact.interest_level === 'hot'
      ? 'text-red-500'
      : contact.interest_level === 'warm'
      ? 'text-amber-500'
      : 'text-blue-400';

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
          selected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {contact.name || 'Unknown'}
            </p>
            {contact.interest_level && (
              <InterestIcon className={cn('w-4 h-4', interestColor)} />
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {contact.company_name || contact.phone}
          </p>
        </div>
        <Badge variant="secondary" className={statusColors[contact.status]}>
          {contact.status.replace(/_/g, ' ')}
        </Badge>
      </div>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    {contact.name || 'Unknown Contact'}
                  </h3>
                  {contact.interest_level && (
                    <InterestIcon className={cn('w-4 h-4', interestColor)} />
                  )}
                  {contact.score !== undefined && contact.score !== null && (
                    <span className="text-xs text-muted-foreground">
                      ({contact.score}%)
                    </span>
                  )}
                </div>
                {contact.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {contact.company_name}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className={statusColors[contact.status]}>
                {contact.status.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {contact.phone}
              </span>
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {contact.email}
                </span>
              )}
              {(contact.city || contact.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[contact.city, contact.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>

            {/* Stats & Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {contact.source && (
                <Badge variant="outline" className="text-xs">
                  {sourceLabels[contact.source] || contact.source}
                </Badge>
              )}
              {contact.trade && (
                <Badge variant="outline" className="text-xs">
                  {contact.trade}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {contact.messages_sent || 0} sent / {contact.messages_received || 0} received
              </span>
              {contact.last_reply_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last reply {formatDistanceToNow(new Date(contact.last_reply_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
