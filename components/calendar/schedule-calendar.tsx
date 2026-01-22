'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CrewFilter, CrewMember } from './crew-filter';
import { TimeSlotGrid, WeekTimeSlotGrid } from './time-slot-grid';
import { JobBlock, CalendarJob } from './job-block';
import { QuickActionsSheet } from './quick-actions-sheet';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  LayoutGrid,
  RefreshCw,
  Plus,
} from 'lucide-react';

export type CalendarViewMode = 'day' | '3day' | 'week' | 'list';

interface ScheduleCalendarProps {
  jobs: CalendarJob[];
  technicians: CrewMember[];
  initialDate?: Date;
  initialViewMode?: CalendarViewMode;
  onJobClick?: (job: CalendarJob) => void;
  onDateChange?: (date: Date) => void;
  onRefresh?: () => void;
  onNewJob?: () => void;
  onMarkComplete?: (jobId: string) => void;
  onReschedule?: (job: CalendarJob) => void;
  onStartJob?: (jobId: string) => void;
  loading?: boolean;
  className?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ScheduleCalendar({
  jobs,
  technicians,
  initialDate = new Date(),
  initialViewMode = 'day',
  onJobClick,
  onDateChange,
  onRefresh,
  onNewJob,
  onMarkComplete,
  onReschedule,
  onStartJob,
  loading = false,
  className,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

  // Detect screen size for responsive view
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 480);
      setIsTablet(window.innerWidth >= 480 && window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-adjust view mode based on screen size
  useEffect(() => {
    if (isMobile && viewMode === 'week') {
      setViewMode('day');
    }
  }, [isMobile, viewMode]);

  // Filter jobs by selected technicians
  const filteredJobs = useMemo(() => {
    if (selectedTechIds.length === 0) return jobs;
    return jobs.filter((job) => job.technicianId && selectedTechIds.includes(job.technicianId));
  }, [jobs, selectedTechIds]);

  // Get dates for current view
  const viewDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(currentDate);

    if (viewMode === 'day') {
      dates.push(startDate);
    } else if (viewMode === '3day') {
      for (let i = 0; i < 3; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else if (viewMode === 'week') {
      const dayOfWeek = startDate.getDay();
      const monday = new Date(startDate);
      monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7)); // Start from Monday
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    }

    return dates;
  }, [currentDate, viewMode]);

  // Jobs for current day (day view)
  const dayJobs = useMemo(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return filteredJobs.filter((job) => {
      const jobDate = new Date(job.startTime).toISOString().split('T')[0];
      return jobDate === dateStr;
    });
  }, [currentDate, filteredJobs]);

  // Navigation
  const navigateDate = useCallback(
    (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      const days = viewMode === 'week' ? 7 : viewMode === '3day' ? 3 : 1;
      newDate.setDate(newDate.getDate() + (direction === 'next' ? days : -days));
      setCurrentDate(newDate);
      onDateChange?.(newDate);
    },
    [currentDate, viewMode, onDateChange]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  }, [onDateChange]);

  // Handle job click
  const handleJobClick = useCallback((job: CalendarJob) => {
    setSelectedJob(job);
    setActionsSheetOpen(true);
    onJobClick?.(job);
  }, [onJobClick]);

  // Format header title
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const dayName = DAY_NAMES[currentDate.getDay()];
      const monthDay = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}`;
      return isToday ? 'Today' : `${dayName}, ${monthDay}`;
    } else if (viewMode === '3day') {
      const start = viewDates[0];
      const end = viewDates[2];
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
    } else {
      const start = viewDates[0];
      const end = viewDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
      }
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
    }
  }, [currentDate, viewMode, viewDates]);

  // Count jobs by technician
  const techsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredJobs.forEach((job) => {
      if (job.technicianId) {
        counts[job.technicianId] = (counts[job.technicianId] || 0) + 1;
      }
    });
    return technicians.map((tech) => ({
      ...tech,
      jobCount: counts[tech.id] || 0,
    }));
  }, [technicians, filteredJobs]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 bg-background border-b border-border">
        {/* Top row: Navigation and actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[140px] text-center">
              {headerTitle}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              className="h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1.5 text-sm rounded transition-colors',
                viewMode === 'day' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
              )}
            >
              Day
            </button>
            {!isMobile && (
              <button
                onClick={() => setViewMode('3day')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded transition-colors',
                  viewMode === '3day' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                )}
              >
                3 Day
              </button>
            )}
            {!isMobile && !isTablet && (
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded transition-colors',
                  viewMode === 'week' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                )}
              >
                Week
              </button>
            )}
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-sm rounded transition-colors',
                viewMode === 'list' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
              )}
            >
              List
            </button>
          </div>

          {onNewJob && (
            <Button size="sm" onClick={onNewJob} className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Job</span>
            </Button>
          )}
        </div>

        {/* Crew Filter */}
        {technicians.length > 0 && (
          <div className="px-4 pb-3 border-t border-border pt-3">
            <CrewFilter
              crew={techsWithCounts}
              selectedIds={selectedTechIds}
              onSelectionChange={setSelectedTechIds}
              showJobCounts={true}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <ListView
            jobs={dayJobs}
            onJobClick={handleJobClick}
          />
        ) : viewMode === 'day' ? (
          <TimeSlotGrid
            date={currentDate}
            jobs={dayJobs}
            onJobClick={handleJobClick}
            showCurrentTime={true}
          />
        ) : (
          <WeekTimeSlotGrid
            dates={viewDates}
            jobs={filteredJobs}
            onJobClick={handleJobClick}
            showCurrentTime={true}
          />
        )}
      </div>

      {/* Quick Actions Sheet */}
      <QuickActionsSheet
        job={selectedJob}
        open={actionsSheetOpen}
        onOpenChange={setActionsSheetOpen}
        onMarkComplete={onMarkComplete}
        onReschedule={onReschedule}
        onStartJob={onStartJob}
      />
    </div>
  );
}

// List view component
function ListView({
  jobs,
  onJobClick,
}: {
  jobs: CalendarJob[];
  onJobClick: (job: CalendarJob) => void;
}) {
  // Sort jobs by start time
  const sortedJobs = useMemo(() => {
    return [...jobs].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [jobs]);

  if (sortedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg mb-1">No jobs scheduled</h3>
        <p className="text-sm text-muted-foreground">
          There are no jobs scheduled for this day.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-4 space-y-3">
      {sortedJobs.map((job) => (
        <JobBlock
          key={job.id}
          job={job}
          onClick={() => onJobClick(job)}
          compact={false}
          showTime={true}
        />
      ))}
    </div>
  );
}

// Export types
export type { CalendarJob, CrewMember };
