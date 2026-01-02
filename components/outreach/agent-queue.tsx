'use client';

import { useState } from 'react';
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone,
  Video,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { ScheduledCallWithContact } from '@/types/outreach';

interface AgentQueueProps {
  calls: ScheduledCallWithContact[];
  onStartCall: (callId: string) => Promise<void>;
  onCompleteCall: (callId: string, outcome: string, notes?: string) => Promise<void>;
  onNoShow: (callId: string) => Promise<void>;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  pending_admin_approval: 'bg-orange-100 text-orange-700',
};

export function AgentQueue({
  calls,
  onStartCall,
  onCompleteCall,
  onNoShow,
  isLoading,
}: AgentQueueProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (
    callId: string,
    action: () => Promise<void>
  ) => {
    setActionLoading(callId);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  // Sort calls: in_progress first, then by scheduled time
  const sortedCalls = [...calls].sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  // Split into sections
  const upcomingCalls = sortedCalls.filter(
    (c) => c.status === 'scheduled' && !isPast(new Date(c.scheduled_at))
  );
  const inProgressCalls = sortedCalls.filter((c) => c.status === 'in_progress');
  const pastDueCalls = sortedCalls.filter(
    (c) => c.status === 'scheduled' && isPast(new Date(c.scheduled_at))
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Calls Scheduled</p>
            <p className="text-sm">Your call queue is empty for today.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCall = (call: ScheduledCallWithContact) => {
    const contact = call.contact;
    const contactInitials = contact?.name
      ? contact.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    const scheduledTime = new Date(call.scheduled_at);
    const isNow = Math.abs(scheduledTime.getTime() - Date.now()) < 5 * 60 * 1000; // Within 5 min
    const isOverdue = isPast(scheduledTime) && call.status === 'scheduled';

    return (
      <div
        key={call.id}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border',
          call.status === 'in_progress' && 'bg-amber-50 border-amber-200',
          isOverdue && 'bg-red-50 border-red-200',
          isNow && call.status === 'scheduled' && 'bg-blue-50 border-blue-200'
        )}
      >
        <Avatar className="h-12 w-12">
          <AvatarFallback>{contactInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">
              {contact?.name || 'Unknown Contact'}
            </h4>
            <Badge variant="secondary" className={statusColors[call.status]}>
              {call.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            {contact?.company_name && (
              <span>{contact.company_name}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(scheduledTime, 'h:mm a')}
              {isOverdue && (
                <span className="text-red-500 font-medium">
                  ({formatDistanceToNow(scheduledTime, { addSuffix: true })})
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              {call.call_type === 'zoom' ? (
                <Video className="w-3 h-3" />
              ) : (
                <Phone className="w-3 h-3" />
              )}
              {call.call_type === 'phone' ? contact?.phone : call.call_type}
            </span>
          </div>

          {contact?.qualification_summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {contact.qualification_summary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {call.status === 'scheduled' && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction(call.id, () => onStartCall(call.id))}
                disabled={actionLoading === call.id}
              >
                {actionLoading === call.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleAction(call.id, () => onNoShow(call.id))}
                disabled={actionLoading === call.id}
              >
                <XCircle className="w-4 h-4 mr-1" />
                No Show
              </Button>
            </>
          )}

          {call.status === 'in_progress' && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() =>
                  handleAction(call.id, () =>
                    onCompleteCall(call.id, 'interested')
                  )
                }
                disabled={actionLoading === call.id}
              >
                {actionLoading === call.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </>
                )}
              </Button>
              {call.meeting_link && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={call.meeting_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Join
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* In Progress */}
      {inProgressCalls.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressCalls.map(renderCall)}
          </CardContent>
        </Card>
      )}

      {/* Past Due */}
      {pastDueCalls.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              Past Due ({pastDueCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastDueCalls.map(renderCall)}
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcomingCalls.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming ({upcomingCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingCalls.map(renderCall)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
