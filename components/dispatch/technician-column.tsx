'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { JobCard } from './job-card';
import type { DispatchJob, DispatchTechnician } from './dispatch-board';

interface TechnicianColumnProps {
  technician: DispatchTechnician;
  jobs: DispatchJob[];
  date: Date;
  onJobClick: (job: DispatchJob) => void;
}

export function TechnicianColumn({
  technician,
  jobs,
  date,
  onJobClick,
}: TechnicianColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: technician.id,
  });

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: 'bg-green-500', textColor: 'text-green-700' };
      case 'en_route':
        return { label: 'En Route', color: 'bg-blue-500', textColor: 'text-blue-700' };
      case 'on_job':
        return { label: 'On Job', color: 'bg-amber-500', textColor: 'text-amber-700' };
      case 'break':
        return { label: 'On Break', color: 'bg-gray-500', textColor: 'text-gray-700' };
      case 'offline':
        return { label: 'Offline', color: 'bg-red-500', textColor: 'text-red-700' };
      default:
        return { label: status, color: 'bg-gray-400', textColor: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusInfo(technician.status);
  const initials = technician.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Calculate total estimated hours
  const totalHours = jobs.reduce((sum, job) => sum + (job.estimatedDuration || 60) / 60, 0);

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'w-72 flex-shrink-0 transition-colors',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
                  statusInfo.color
                )}
              />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{technician.name}</CardTitle>
              <p className={cn('text-xs', statusInfo.textColor)}>{statusInfo.label}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {jobs.length} jobs
          </Badge>
        </div>

        {/* Skills */}
        {technician.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {technician.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {technician.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{technician.skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Workload indicator */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Workload</span>
            <span>{totalHours.toFixed(1)}h scheduled</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                totalHours <= 6 ? 'bg-green-500' : totalHours <= 8 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(100, (totalHours / 8) * 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {jobs.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  Drop jobs here
                </div>
              ) : (
                jobs.map((job) => (
                  <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
