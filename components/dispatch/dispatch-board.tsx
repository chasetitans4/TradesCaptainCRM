'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreVertical,
  Phone,
  User,
  Wrench,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TechnicianColumn } from './technician-column';
import { JobCard } from './job-card';
import { UnassignedQueue } from './unassigned-queue';

// Types
export interface DispatchJob {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  jobType?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  assignedTo?: string;
  assignedTechName?: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
}

export interface DispatchTechnician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  currentJobId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  jobCount: number;
  skills: string[];
}

interface DispatchBoardProps {
  initialDate?: Date;
  businessId?: string;
}

export function DispatchBoard({ initialDate = new Date(), businessId }: DispatchBoardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [technicians, setTechnicians] = useState<DispatchTechnician[]>([]);
  const [unassignedJobs, setUnassignedJobs] = useState<DispatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<DispatchJob | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [assigning, setAssigning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch dispatch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const endDateStr =
        viewMode === 'week'
          ? format(addDays(startOfWeek(selectedDate), 6), 'yyyy-MM-dd')
          : dateStr;

      const businessQuery = businessId ? `&businessId=${businessId}` : '';
      const queryPrefix = businessId ? `?businessId=${businessId}` : '';
      const unassignedPrefix = businessId ? `&` : `?`;

      const [jobsRes, techsRes, unassignedRes] = await Promise.all([
        fetch(`/api/dispatch/jobs?startDate=${dateStr}&endDate=${endDateStr}${businessQuery}`),
        fetch(`/api/dispatch/technicians${queryPrefix}`),
        fetch(`/api/dispatch/jobs?unassigned=true${businessQuery}`),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }

      if (techsRes.ok) {
        const data = await techsRes.json();
        setTechnicians(data.technicians || []);
      }

      if (unassignedRes.ok) {
        const data = await unassignedRes.json();
        setUnassignedJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get jobs for a specific technician
  const getJobsForTechnician = (technicianId: string) => {
    return jobs.filter((job) => job.assignedTo === technicianId);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = [...jobs, ...unassignedJobs].find((j) => j.id === active.id);
    if (job) {
      setActiveJob(job);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const targetId = over.id as string;

    // Check if dropped on a technician column
    const technician = technicians.find((t) => t.id === targetId);
    if (technician) {
      await assignJobToTechnician(jobId, technician.id);
    }

    // Check if dropped on unassigned queue
    if (targetId === 'unassigned-queue') {
      await unassignJob(jobId);
    }
  };

  // Assign job to technician
  const assignJobToTechnician = async (jobId: string, technicianId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/dispatch/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          technicianId,
          scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error assigning job:', error);
    } finally {
      setAssigning(false);
    }
  };

  // Unassign job
  const unassignJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/dispatch/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign' }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error unassigning job:', error);
    }
  };

  // Auto-assign job
  const autoAssignJob = async (jobId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/dispatch/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-assign',
          date: format(selectedDate, 'yyyy-MM-dd'),
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error auto-assigning job:', error);
    } finally {
      setAssigning(false);
    }
  };

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'week' ? 7 : 1;
    setSelectedDate((current) =>
      direction === 'next' ? addDays(current, days) : addDays(current, -days)
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'en_route':
        return 'bg-blue-500';
      case 'on_job':
        return 'bg-amber-500';
      case 'break':
        return 'bg-gray-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {viewMode === 'day'
                    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                    : `Week of ${format(startOfWeek(selectedDate), 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day View</SelectItem>
              <SelectItem value="week">Week View</SelectItem>
            </SelectContent>
          </Select>

          {/* Today Button */}
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Unassigned Jobs Queue */}
          <div className="w-72 flex-shrink-0">
            <UnassignedQueue
              jobs={unassignedJobs}
              onAutoAssign={autoAssignJob}
              assigning={assigning}
            />
          </div>

          {/* Technician Columns */}
          <ScrollArea className="flex-1">
            <div className="flex gap-4 pb-4">
              {technicians.map((technician) => (
                <TechnicianColumn
                  key={technician.id}
                  technician={technician}
                  jobs={getJobsForTechnician(technician.id)}
                  date={selectedDate}
                  onJobClick={(job) => {
                    setSelectedJob(job);
                    setShowAssignDialog(true);
                  }}
                />
              ))}

              {technicians.length === 0 && (
                <Card className="w-64">
                  <CardContent className="flex h-[400px] items-center justify-center text-muted-foreground">
                    No technicians available
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeJob && <JobCard job={activeJob} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Job Details Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              {selectedJob?.jobNumber} - {selectedJob?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJob.customer.name}</span>
                </div>
                {selectedJob.customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.customer.phone}</span>
                  </div>
                )}
                {selectedJob.customer.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.customer.address}</span>
                  </div>
                )}
                {selectedJob.scheduledTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.scheduledTime}</span>
                  </div>
                )}
              </div>

              {selectedJob.description && (
                <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={selectedJob.priority === 'high' ? 'destructive' : 'secondary'}>
                  {selectedJob.priority}
                </Badge>
                <Badge variant="outline">{selectedJob.status}</Badge>
                {selectedJob.jobType && <Badge variant="outline">{selectedJob.jobType}</Badge>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Close
            </Button>
            {selectedJob && !selectedJob.assignedTo && (
              <Button
                onClick={() => {
                  autoAssignJob(selectedJob.id);
                  setShowAssignDialog(false);
                }}
                disabled={assigning}
              >
                {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Zap className="mr-2 h-4 w-4" />
                Auto-Assign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
