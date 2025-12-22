'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobCard } from './job-card';
import type { DispatchJob } from './dispatch-board';

interface UnassignedQueueProps {
  jobs: DispatchJob[];
  onAutoAssign: (jobId: string) => void;
  assigning: boolean;
}

export function UnassignedQueue({ jobs, onAutoAssign, assigning }: UnassignedQueueProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-queue',
  });

  // Sort jobs by priority
  const sortedJobs = [...jobs].sort((a, b) => {
    const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    return aPriority - bPriority;
  });

  // Count high priority jobs
  const highPriorityCount = jobs.filter(
    (j) => j.priority === 'emergency' || j.priority === 'high'
  ).length;

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex h-full flex-col transition-colors',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Badge variant="secondary">{jobs.length}</Badge>
          </div>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {highPriorityCount} urgent
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden pt-0">
        <ScrollArea className="h-full">
          <SortableContext
            items={sortedJobs.map((j) => j.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedJobs.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-center text-sm text-muted-foreground">
                  <div>
                    <p>No unassigned jobs</p>
                    <p className="text-xs">Drop jobs here to unassign</p>
                  </div>
                </div>
              ) : (
                sortedJobs.map((job) => (
                  <div key={job.id} className="group relative">
                    <JobCard job={job} />
                    <Button
                      size="sm"
                      className="absolute -right-2 -top-2 h-7 w-7 rounded-full p-0 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAutoAssign(job.id);
                      }}
                      disabled={assigning}
                    >
                      {assigning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
