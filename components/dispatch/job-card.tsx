'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Clock, GripVertical, MoreVertical, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DispatchJob } from './dispatch-board';
import { AddressLinkCompact } from '@/components/ui/address-link';

interface JobCardProps {
  job: DispatchJob;
  isDragging?: boolean;
  onClick?: () => void;
}

export function JobCard({ job, isDragging, onClick }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'border-l-red-600 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'on_hold':
        return <Badge variant="outline">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer border-l-4 transition-all hover:shadow-md',
        getPriorityColor(job.priority),
        dragging && 'rotate-3 opacity-50 shadow-lg'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {job.jobNumber}
                </p>
                <h4 className="truncate text-sm font-medium">{job.title}</h4>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit Job</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Start Job</DropdownMenuItem>
                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Unassign</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Customer & Address */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate">{job.customer.name}</span>
              </div>
              {job.customer.address && (
                <AddressLinkCompact address={job.customer.address} />
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {job.scheduledTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{job.scheduledTime}</span>
                  </div>
                )}
                {job.estimatedDuration && (
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(job.estimatedDuration / 60)}h)
                  </span>
                )}
              </div>
              {getStatusBadge(job.status)}
            </div>

            {/* Job Type */}
            {job.jobType && (
              <Badge variant="outline" className="mt-2 text-xs">
                {job.jobType}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
