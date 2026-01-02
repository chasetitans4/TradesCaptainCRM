'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  Loader2,
  XCircle,
} from 'lucide-react';
import type { ScheduledCallWithContact } from '@/types/outreach';

interface Agent {
  id: string;
  name: string;
}

interface AdminApprovalQueueProps {
  calls: ScheduledCallWithContact[];
  agents: Agent[];
  onApprove: (callId: string, agentId: string) => Promise<void>;
  onReject: (callId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const overflowReasonLabels: Record<string, string> = {
  weekend_request: 'Weekend Request',
  no_availability_3day: 'No Availability',
  all_agents_unavailable_or_at_capacity: 'Agents At Capacity',
  beyond_3_day_window: 'Beyond 3-Day Window',
};

export function AdminApprovalQueue({
  calls,
  agents,
  onApprove,
  onReject,
  isLoading,
}: AdminApprovalQueueProps) {
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (callId: string) => {
    const agentId = selectedAgents[callId];
    if (!agentId) return;

    setActionLoading(callId);
    try {
      await onApprove(callId, agentId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (callId: string) => {
    setActionLoading(callId);
    try {
      await onReject(callId, 'Admin rejected');
    } finally {
      setActionLoading(null);
    }
  };

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
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">All Caught Up</p>
            <p className="text-sm">No pending approvals at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Pending Admin Approval ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {calls.map((call) => {
          const contact = call.contact;
          const contactInitials = contact?.name
            ? contact.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            : '?';

          return (
            <div
              key={call.id}
              className="flex flex-col gap-4 p-4 rounded-lg border bg-amber-50/50 border-amber-200"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{contactInitials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">
                      {contact?.name || 'Unknown Contact'}
                    </h4>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      {overflowReasonLabels[call.overflow_reason || ''] || 'Pending Approval'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                    {contact?.company_name && (
                      <span>{contact.company_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact?.phone}
                    </span>
                    {contact?.trade && (
                      <Badge variant="outline" className="text-xs">
                        {contact.trade}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Requested: {format(new Date(call.scheduled_at), 'EEE, MMM d, h:mm a')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Waiting: {formatDistanceToNow(new Date(call.created_at), { addSuffix: false })}
                    </span>
                  </div>

                  {contact?.qualification_summary && (
                    <p className="text-sm text-muted-foreground mt-2 p-2 bg-white rounded border">
                      {contact.qualification_summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="flex items-center gap-2 flex-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={selectedAgents[call.id] || ''}
                    onValueChange={(value) =>
                      setSelectedAgents((prev) => ({ ...prev, [call.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleReject(call.id)}
                  disabled={actionLoading === call.id}
                >
                  {actionLoading === call.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleApprove(call.id)}
                  disabled={!selectedAgents[call.id] || actionLoading === call.id}
                >
                  {actionLoading === call.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve & Assign
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
