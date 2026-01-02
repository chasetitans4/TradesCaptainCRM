'use client';

import Link from 'next/link';
import {
  Bell,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle,
  MoreHorizontal,
  User,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FollowUp } from './types';

interface FollowUpListProps {
  followUps: FollowUp[];
  onEdit: (fu: FollowUp) => void;
  onComplete: (id: string, outcome?: string) => void;
  onCancel: (id: string) => void;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  showStatus?: boolean;
}

export function getTypeIcon(type: string) {
  switch (type) {
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4" />;
    case 'visit':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

export function getPriorityBadge(priority: string) {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  };
  return (
    <Badge className={colors[priority]}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>;
    case 'rescheduled':
      return <Badge className="bg-blue-100 text-blue-800">Rescheduled</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

export function getEntityLink(followUp: FollowUp) {
  const routes: Record<string, string> = {
    lead: '/leads',
    customer: '/customers',
    job: '/jobs',
    quote: '/quotes',
    invoice: '/invoices',
  };
  return `${routes[followUp.entity_type]}/${followUp.entity_id}`;
}

export function FollowUpList({
  followUps,
  onEdit,
  onComplete,
  onCancel,
  emptyMessage,
  emptyIcon,
  showStatus = false,
}: FollowUpListProps) {
  if (followUps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {emptyIcon}
          <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {followUps.map((followUp) => (
        <Card key={followUp.id}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {getTypeIcon(followUp.follow_up_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={getEntityLink(followUp)}
                    className="font-medium hover:underline"
                  >
                    {followUp.entity?.name || `${followUp.entity_type} #${followUp.entity_id.slice(0, 8)}`}
                  </Link>
                  {getPriorityBadge(followUp.priority)}
                  {showStatus && getStatusBadge(followUp.status)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="capitalize">{followUp.follow_up_type}</span>
                  <span>
                    {new Date(followUp.scheduled_date).toLocaleDateString()}
                    {followUp.scheduled_time && ` at ${followUp.scheduled_time}`}
                  </span>
                  {followUp.assignee && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {followUp.assignee.full_name}
                    </span>
                  )}
                </div>
                {followUp.notes && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                    {followUp.notes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {followUp.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onComplete(followUp.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(followUp)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onCancel(followUp.id)}
                        >
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <Link href={getEntityLink(followUp)}>
                  <Button variant="ghost" size="icon-sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
